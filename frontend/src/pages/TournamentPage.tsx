import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiFetch, apiFetchForm, isAdmin } from "../api";
import AppShell from "../components/AppShell";

type Tournament = { id: number; name: string; rounds: number; active: boolean; setupDone: boolean };
type Player = { id: number; name: string; rating: number };
type Participant = {
  id: number;
  playerId: number;
  name: string;
  rating: number;
  score: number;
  hadBye: boolean;
};

type Round = {
  id: number;
  roundNumber: number;
  locked: boolean;
  matches: Array<{
    id: number;
    p1: { id: number; name: string };
    p2: { id: number; name: string };
    result: number | null;
  }>;
};

type TournamentDetail = {
  tournament: Tournament;
  canGenerateRound: boolean;
  participants: Participant[];
  rounds: Round[];
};

export default function TournamentPage() {
  const params = useParams();
  const navigate = useNavigate();
  const tournamentId = Number(params.id);

  const [data, setData] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [playersText, setPlayersText] = useState("");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [copyFromTournamentId, setCopyFromTournamentId] = useState<number | "">("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [importing, setImporting] = useState(false);

  const [adjustedRounds, setAdjustedRounds] = useState(0);
  const [savingRounds, setSavingRounds] = useState(false);

  const admin = isAdmin();

  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationShown = useRef(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const d = await apiFetch<TournamentDetail>(`/api/tournaments/${tournamentId}`);
      setData(d);

      // Only fetch players + all tournaments when the participant form is needed
      // (admin, active tournament, no rounds generated yet)
      if (admin && d.tournament.active && d.rounds.length === 0) {
        const [p, ts] = await Promise.all([apiFetch<Player[]>("/api/players"), apiFetch<Tournament[]>("/api/tournaments")]);
        setAllPlayers(p);
        setAllTournaments(ts);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [tournamentId, admin]);

  useEffect(() => {
    if (!Number.isFinite(tournamentId)) return;
    void load();
  }, [tournamentId, load]);

  useEffect(() => {
    if (data && !data.tournament.active && data.participants.length > 0 && data.rounds.length > 0 && !celebrationShown.current) {
      celebrationShown.current = true;
      setTimeout(() => setShowCelebration(true), 500);
    }
  }, [data]);

  // Sync adjustedRounds whenever the tournament rounds value changes
  useEffect(() => {
    if (data?.tournament.rounds) setAdjustedRounds(data.tournament.rounds);
  }, [data?.tournament.rounds]);

  async function saveParticipants(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const players = playersText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (players.length < 2) {
      setError("At least 2 players are required");
      return;
    }

    try {
      await apiFetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "POST",
        body: JSON.stringify({ players }),
      });
      setPlayersText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function copyParticipantsFromTournament() {
    if (!copyFromTournamentId) return;
    setError("");
    try {
      const other = await apiFetch<TournamentDetail>(`/api/tournaments/${copyFromTournamentId}`);
      const names = other.participants.map((p) => p.name);
      setPlayersText(names.join("\n"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copy failed");
    }
  }

  async function importParticipants() {
    if (!importFile) return;
    if (importing) return;
    setImporting(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", importFile);
      await apiFetchForm<{ ok: true; count: number; mode: string }>(
        `/api/tournaments/${tournamentId}/participants/import?mode=${encodeURIComponent(importMode)}`,
        form,
        { method: "POST" },
      );
      setImportFile(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function generateRound() {
    setError("");
    try {
      await apiFetch(`/api/tournaments/${tournamentId}/rounds`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    }
  }

  async function submitResults(round: Round, results: Array<{ matchId: number; result: number }>) {
    setError("");
    try {
      await apiFetch(`/api/rounds/${round.id}/results`, {
        method: "POST",
        body: JSON.stringify({ results }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    }
  }

  async function completeTournament() {
    if (!confirm("Mark this tournament as completed? ELO ratings will be applied.")) return;
    setError("");
    try {
      await apiFetch(`/api/tournaments/${tournamentId}`, { method: "PATCH" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Complete failed");
    }
  }

  async function finalizeSetup() {
    if (!confirm("Start this tournament? Participants will be locked in.")) return;
    setFinalizing(true);
    setError("");
    try {
      await apiFetch(`/api/tournaments/${tournamentId}/start`, { method: "POST", body: JSON.stringify({}) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start tournament");
    } finally {
      setFinalizing(false);
    }
  }

  async function cancelTournament() {
    if (!confirm("Cancel and permanently delete this tournament and all its data?")) return;
    setCancelling(true);
    setError("");
    try {
      await apiFetch(`/api/tournaments/${tournamentId}`, { method: "DELETE" });
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
      setCancelling(false);
    }
  }

  async function saveRounds() {
    setSavingRounds(true);
    setError("");
    try {
      await apiFetch(`/api/tournaments/${tournamentId}`, {
        method: "PUT",
        body: JSON.stringify({ rounds: adjustedRounds }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rounds");
    } finally {
      setSavingRounds(false);
    }
  }

  if (!data) {
    return (
      <AppShell
        title="Tournament"
        subtitle="Loading…"
        actions={
          <>
            <Link className="btn" to="/dashboard">
              Dashboard
            </Link>
          </>
        }
      >
        <div className="card">Loading…</div>
        {error ? <div className="alert">{error}</div> : null}
      </AppShell>
    );
  }

  const { tournament, participants, rounds } = data;
  const hasRounds = rounds.length > 0;
  const isDraft = !tournament.setupDone;

  return (
    <AppShell
      title={tournament.name}
      subtitle={
        !tournament.active
          ? "Completed tournament"
          : isDraft
            ? participants.length === 0
              ? "Setup — Step 1: Add participants"
              : tournament.rounds === 0
                ? "Setup — Step 2: Generating rounds…"
                : "Setup — Step 3: Confirm & Start"
            : "Active tournament"
      }
      actions={
        <>
          <Link className="btn" to="/dashboard">
            Dashboard
          </Link>
          {/* Cancel button — only during draft/setup phase */}
          {admin && isDraft && tournament.active ? (
            <button type="button" className="btn btnCancel" onClick={() => void cancelTournament()} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "✕ Cancel Tournament"}
            </button>
          ) : null}
        </>
      }
    >
      {error ? <div className="alert">{error}</div> : null}

      <div className="grid">
        <section className="card">
          <h2>{hasRounds ? "Standings" : "Participants"}</h2>
          {!hasRounds && tournament.active && admin ? (
            <form onSubmit={saveParticipants} className="stack">
              <div className="card subcard stack">
                <div className="muted">Pick from existing players (multi-select)</div>
                <select
                  multiple
                  size={8}
                  value={selectedPlayerIds.map(String)}
                  onChange={(e) => {
                    const ids = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                    setSelectedPlayerIds(ids);
                  }}
                >
                  {allPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({Math.round(p.rating)})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    const selectedNames = allPlayers.filter((p) => selectedPlayerIds.includes(p.id)).map((p) => p.name);
                    setPlayersText(selectedNames.join("\n"));
                  }}
                >
                  Use Selected
                </button>
              </div>

              <div className="card subcard stack">
                <div className="muted">Copy participants from another tournament</div>
                <select
                  value={copyFromTournamentId === "" ? "" : String(copyFromTournamentId)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCopyFromTournamentId(v ? Number(v) : "");
                  }}
                >
                  <option value="">Select tournament…</option>
                  {allTournaments
                    .filter((t) => t.id !== tournament.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.active ? "[Active]" : "[Done]"} {t.name}
                      </option>
                    ))}
                </select>
                <button type="button" className="btn" onClick={() => void copyParticipantsFromTournament()}>
                  Copy
                </button>
              </div>

              <div className="card subcard stack">
                <div className="muted">Import participants from file (.json/.csv/.xlsx)</div>
                <select value={importMode} onChange={(e) => setImportMode(e.target.value === "replace" ? "replace" : "append")}>
                  <option value="append">Append</option>
                  <option value="replace">Replace</option>
                </select>
                <input type="file" accept=".json,.csv,.xlsx,.xls" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
                <button type="button" className="btn" disabled={!importFile || importing} onClick={() => void importParticipants()}>
                  {importing ? "Importing…" : "Import"}
                </button>
              </div>

              <textarea rows={8} value={playersText} onChange={(e) => setPlayersText(e.target.value)} placeholder="One player per line" required />
              <button className="btn primary" type="submit">
                Save Participants
              </button>
            </form>
          ) : null}
          {participants.length === 0 && (
            <div className="emptyState compact" style={{ marginTop: 12 }}>
              <div className="emptyStateBoard">
                <span className="emptyStatePiece" style={{ animationDelay: "0s" }}>
                  ♟
                </span>
                <span className="emptyStatePiece" style={{ animationDelay: "0.6s" }}>
                  ♟
                </span>
                <span className="emptyStatePiece" style={{ animationDelay: "1.2s" }}>
                  ♟
                </span>
              </div>
              <div className="emptyStateTitle">No players enrolled</div>
              <div className="emptyStateMsg">
                {tournament.active && admin ? "Add participants above to seat them at the board." : "This tournament had no participants registered."}
              </div>
            </div>
          )}
          {participants.length > 0 && (
            <div className="tableWrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => (
                    <tr key={p.id}>
                      <td>
                        {idx === 0 ? (
                          <span className="rankIcon rankGold">♔</span>
                        ) : idx === 1 ? (
                          <span className="rankIcon rankSilver">♕</span>
                        ) : idx === 2 ? (
                          <span className="rankIcon rankBronze">♖</span>
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td>{p.name}</td>
                      <td>{p.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}{" "}
        </section>

        <section className="card">
          <h2>Rounds</h2>

          {/* Rounds configuration — visible after participants are saved, before first round */}
          {participants.length >= 2 &&
            !hasRounds &&
            admin &&
            tournament.active &&
            (() => {
              const swissMin = Math.ceil(Math.log2(Math.max(participants.length, 2)));
              return (
                <div className="roundsConfigPanel">
                  <div className="roundsConfigHeader">
                    <span className="roundsConfigTitle">♟ Rounds Configuration</span>
                    <span className="roundsConfigHint">
                      Swiss minimum: <strong>{swissMin}</strong> rounds for <strong>{participants.length}</strong> players
                    </span>
                  </div>
                  <div className="roundsConfigRow">
                    <label className="roundsConfigLabel">Rounds</label>
                    <input
                      type="number"
                      className="roundsConfigInput"
                      min={swissMin}
                      value={adjustedRounds || tournament.rounds}
                      onChange={(e) => {
                        const v = Math.max(swissMin, Number(e.target.value));
                        setAdjustedRounds(v);
                      }}
                    />
                    <span className="roundsConfigMax">min {swissMin}</span>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => void saveRounds()}
                      disabled={savingRounds || (adjustedRounds || tournament.rounds) === tournament.rounds}
                    >
                      {savingRounds ? "Saving…" : "Set Rounds"}
                    </button>
                  </div>
                  <div className="roundsConfigNote">
                    Swiss minimum ensures fair gameplay. You may add as many rounds above {swissMin} as you like.
                  </div>
                </div>
              );
            })()}

          {/* Final Submit — shown when setup is ready but not yet started */}
          {admin && isDraft && tournament.active && participants.length >= 2 && tournament.rounds > 0 ? (
            <button type="button" className="btn finalSubmitBtn" onClick={() => void finalizeSetup()} disabled={finalizing}>
              {finalizing ? "Starting…" : "✓ Final Submit — Start Tournament"}
            </button>
          ) : null}

          {tournament.active && data.canGenerateRound && admin ? (
            <button className="btn primary" onClick={generateRound}>
              Generate Next Round
            </button>
          ) : !isDraft ? (
            <div className="muted">{tournament.active ? "Waiting for results / participants" : "Tournament finished"}</div>
          ) : null}

          {/* Complete Tournament — only after setup is finalised */}
          {tournament.active && tournament.setupDone && admin ? (
            <button className="btn danger" style={{ marginTop: 8 }} onClick={() => void completeTournament()}>
              Complete Tournament
            </button>
          ) : null}

          {rounds.length === 0 && (
            <div className="emptyState compact" style={{ marginTop: 12 }}>
              <div className="emptyStateBoard">
                <span className="emptyStatePiece" style={{ animationDelay: "0s" }}>
                  ♞
                </span>
                <span className="emptyStatePiece" style={{ animationDelay: "0.7s" }}>
                  ♜
                </span>
                <span className="emptyStatePiece" style={{ animationDelay: "1.4s" }}>
                  ♝
                </span>
              </div>
              <div className="emptyStateTitle">The board is bare</div>
              <div className="emptyStateMsg">
                {tournament.active ? "Enroll at least 2 players and generate the first round to begin." : "No rounds were played in this tournament."}
              </div>
            </div>
          )}

          <div className="stack" style={{ marginTop: 12 }}>
            {rounds.map((r) => (
              <RoundCard key={r.id} round={r} canEdit={tournament.active && !r.locked && admin} onSubmit={submitResults} />
            ))}
          </div>
        </section>
      </div>

      {showCelebration && <CelebrationModal tournament={tournament} participants={participants} onClose={() => setShowCelebration(false)} />}
    </AppShell>
  );
}

function RoundCard(props: {
  round: Round;
  canEdit: boolean;
  onSubmit: (round: Round, results: Array<{ matchId: number; result: number }>) => Promise<void>;
}) {
  const { round, canEdit, onSubmit } = props;
  const [local, setLocal] = useState(() => new Map<number, number>());

  useEffect(() => {
    const m = new Map<number, number>();
    for (const match of round.matches) {
      if (match.result !== null) m.set(match.id, match.result);
      else m.set(match.id, 1);
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLocal(m);
    });
    return () => {
      cancelled = true;
    };
  }, [round.id, round.matches]);

  return (
    <div className="card subcard">
      <div className="row">
        <h3>Round {round.roundNumber}</h3>
        <span className={round.locked ? "badge done" : "badge active"}>{round.locked ? "Locked" : "Open"}</span>
      </div>

      <div className="tableWrap">
        <table className="table">
          <thead>
            <tr>
              <th>Board</th>
              <th>White</th>
              <th>Result</th>
              <th>Black</th>
            </tr>
          </thead>
          <tbody>
            {round.matches.map((m, idx) => (
              <tr key={m.id}>
                <td>{idx + 1}</td>
                <td>{m.p1.name}</td>
                <td>
                  <select
                    disabled={!canEdit}
                    value={local.get(m.id) ?? 1}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setLocal((prev) => {
                        const next = new Map(prev);
                        next.set(m.id, v);
                        return next;
                      });
                    }}
                  >
                    <option value={1}>Win</option>
                    <option value={0}>Draw</option>
                    <option value={-1}>Loss</option>
                  </select>
                </td>
                <td>{m.p2.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <button
          className="btn primary"
          onClick={() =>
            onSubmit(
              round,
              round.matches.map((m) => ({ matchId: m.id, result: local.get(m.id) ?? 1 })),
            )
          }
        >
          Submit Results
        </button>
      ) : null}
    </div>
  );
}

/* ── Confetti data (deterministic spread, computed once) ── */
const CONFETTI_COLORS = ["#FFD700", "#ff4444", "#51cf66", "#339af0", "#f06595", "#cc5de8", "#ff922b", "#ffffff", "#d4af37", "#00e5ff"];
const CONFETTI_DATA = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  left: (i * 13.7 + 7) % 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  duration: 2.8 + (i % 6) * 0.4,
  delay: (i % 14) * 0.15,
  width: 6 + (i % 4) * 3,
  height: 8 + (i % 3) * 4,
  round: i % 5 === 0,
}));

const PODIUM_ICONS = ["♔", "♕", "♖"];
const PODIUM_CLASS = ["rankGold", "rankSilver", "rankBronze"];
const PODIUM_LABELS = ["Champion", "2nd Place", "3rd Place"];

function CelebrationModal({ tournament, participants, onClose }: { tournament: Tournament; participants: Participant[]; onClose: () => void }) {
  const top3 = participants.slice(0, 3);

  return (
    <div className="celebrationOverlay" onClick={onClose}>
      {/* confetti */}
      {CONFETTI_DATA.map((c) => (
        <div
          key={c.id}
          className="confettiPiece"
          style={{
            left: `${c.left}%`,
            backgroundColor: c.color,
            width: c.width,
            height: c.height,
            borderRadius: c.round ? "50%" : "2px",
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        />
      ))}

      <div className="celebrationModal" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="celebrationHeader">
          <div className="celebrationPieces">
            <span>♜</span>
            <span>♛</span>
            <span>♔</span>
            <span>♛</span>
            <span>♜</span>
          </div>
          <div className="celebrationTitle">The King Has Fallen!</div>
          <div className="celebrationName">{tournament.name} · Battle Concluded</div>
          <div className="celebrationPieces faded">
            <span>♟</span>
            <span>♞</span>
            <span>♝</span>
            <span>♞</span>
            <span>♟</span>
          </div>
        </div>

        {/* podium */}
        {top3.length > 0 && (
          <div className="podiumWrap">
            {top3.map((p, idx) => (
              <div key={p.id} className={`podiumPlace podiumRank${idx + 1}`}>
                <span className={`rankIcon ${PODIUM_CLASS[idx]} podiumIcon`}>{PODIUM_ICONS[idx]}</span>
                <span className="podiumLabel">{PODIUM_LABELS[idx]}</span>
                <span className="podiumName">{p.name}</span>
                <span className="podiumScore">{p.score} pts</span>
              </div>
            ))}
          </div>
        )}

        <button className="btn celebrationClose" onClick={onClose}>
          ✕ &nbsp;Close
        </button>
      </div>
    </div>
  );
}
