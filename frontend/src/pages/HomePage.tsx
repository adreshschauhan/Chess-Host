import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, RefreshCw, Shield, X } from "lucide-react";
import { apiFetch, isAdmin } from "../api";
import AppShell from "../components/AppShell";

type Player = { id: number; name: string; rating: number };
type Tournament = { id: number; name: string; rounds: number; active: boolean; createdAt?: string };

export default function HomePage() {
  const navigate = useNavigate();

  const admin = isAdmin();

  const [players, setPlayers] = useState<Player[]>([]);
  const [active, setActive] = useState<Tournament[]>([]);
  const [past, setPast] = useState<Tournament[]>([]);
  const [streaks, setStreaks] = useState<Array<{ name: string; count: number }>>([]);
  const [killers, setKillers] = useState<string[]>([]);

  const [newName, setNewName] = useState("");
  const [newRounds, setNewRounds] = useState(5);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setError("");
    try {
      const [p, a, pt, s, g] = await Promise.all([
        apiFetch<{ players: Player[] }>("/api/players?limit=10").then((r) => r.players),
        apiFetch<Tournament[]>("/api/tournaments?status=active"),
        apiFetch<Tournament[]>("/api/tournaments?status=past"),
        apiFetch<Array<{ name: string; count: number }>>("/api/stats/winning-streaks"),
        apiFetch<string[]>("/api/stats/giant-killers"),
      ]);
      setPlayers(p);
      setActive(a);
      setPast(pt);
      setStreaks(s);
      setKillers(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreateTournament(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (creating) return;
    setCreating(true);

    try {
      const t = await apiFetch<Tournament>("/api/tournaments", {
        method: "POST",
        body: JSON.stringify({ name: newName, rounds: newRounds }),
      });
      navigate(`/tournaments/${t.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Leaderboards, tournaments, and highlights"
      actions={
        <>
          <Link className="btn" to="/">
            Landing
          </Link>
          <button className="btn" type="button" onClick={() => void load()}>
            <RefreshCw size={18} />
            Refresh
          </button>
          {admin ? (
            <Link className="btn" to="/admin">
              <Shield size={18} />
              Admin
            </Link>
          ) : (
            <Link className="btn" to="/admin/login">
              <Shield size={18} />
              Admin Login
            </Link>
          )}
        </>
      }
    >
      {error ? <div className="alert">{error}</div> : null}

      <div className="grid">
        <section className="card">
          <div className="leaderboardHeader">
            <h2>Leaderboard</h2>
            <Link className="leaderboardViewAll" to="/leaderboard">
              View All ♟
            </Link>
          </div>
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {players.slice(0, 10).map((p, idx) => (
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
                    <td>{Math.round(p.rating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>♟ Winning Streaks</h2>
          {streaks.length ? (
            <ul className="streakList">
              {streaks.map((s, idx) => (
                <li key={s.name} className="streakItem">
                  <span className="streakRank">{idx === 0 ? "🔥" : idx === 1 ? "⚡" : idx === 2 ? "✦" : "·"}</span>
                  <span className="streakName">{s.name}</span>
                  <span className="streakBadge">{s.count} wins</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="emptyState compact">
              <div className="emptyStateBoard">
                <span className="emptyStatePiece" style={{ animationDelay: "0s" }}>
                  ♞
                </span>
                <span className="emptyStatePiece" style={{ animationDelay: "0.8s" }}>
                  ♞
                </span>
                <span className="emptyStatePiece" style={{ animationDelay: "1.6s" }}>
                  ♞
                </span>
              </div>
              <div className="emptyStateTitle">No Fire Yet</div>
              <div className="emptyStateMsg">Win consecutive games to ignite your streak. The battle for glory awaits.</div>
            </div>
          )}

          <h2 style={{ marginTop: 24 }}>⚔ Giant Killers</h2>
          {killers.length ? (
            <ul className="killerList">
              {killers.map((name) => (
                <li key={name} className="killerItem">
                  <span className="killerIcon">♛</span>
                  <span className="killerName">{name}</span>
                  <span className="killerLabel">Slayer</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="emptyState compact">
              <div className="emptyStateBoard">
                <span className="emptyStatePiece" style={{ animationDelay: "0s" }}>
                  ♚
                </span>
                <span className="emptyStatePiece" style={{ animationDelay: "1s" }}>
                  ⚔
                </span>
                <span className="emptyStatePiece" style={{ animationDelay: "2s" }}>
                  ♚
                </span>
              </div>
              <div className="emptyStateTitle">No Slayers Yet</div>
              <div className="emptyStateMsg">Defeat a stronger opponent to earn this title. Dare to challenge the kings.</div>
            </div>
          )}
        </section>

        <section className="card wide">
          <h2>Tournament</h2>

          <div className="tSectionsRow">
            <div className="panel subcard">
              <div className="tSectionHeader">
                <div className="tSectionTitle">
                  <Plus size={18} /> Create
                </div>
                <span className={admin ? "badge active" : "badge"}>{admin ? "Admin" : "Locked"}</span>
              </div>

              {admin ? (
                createOpen ? (
                  <div className="tCard create open">
                    <div className="tCardTop">
                      <div className="tCardIcon create">
                        <Plus size={18} />
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className="badge active">Create</span>
                        <button className="btn" type="button" onClick={() => setCreateOpen(false)}>
                          <X size={18} />
                          Close
                        </button>
                      </div>
                    </div>

                    <div className="tCardName">Create tournament</div>
                    <div className="tCardMeta">Start a new Swiss event</div>

                    <form onSubmit={onCreateTournament} className="stack" style={{ marginTop: 10 }}>
                      <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tournament name" required />
                      <input type="number" min={1} max={15} value={newRounds} onChange={(e) => setNewRounds(Number(e.target.value))} required />
                      <button className="btn primary" type="submit">
                        {creating ? "Creating…" : "Create"}
                      </button>
                    </form>
                  </div>
                ) : (
                  <button className="tCard tCardButton create" type="button" onClick={() => setCreateOpen(true)} aria-label="Create a new tournament">
                    <div className="tCardTop">
                      <div className="tCardIcon create">
                        <Plus size={18} />
                      </div>
                      <span className="badge active">Create</span>
                    </div>

                    <div className="tCardName">Create tournament</div>
                    <div className="tCardMeta">Click to open</div>
                  </button>
                )
              ) : (
                <button
                  className="tCard tCardButton create"
                  type="button"
                  onClick={() => navigate("/admin/login")}
                  aria-label="Admin login required to create a tournament"
                >
                  <div className="tCardTop">
                    <div className="tCardIcon create">
                      <Shield size={18} />
                    </div>
                    <span className="badge">Admin</span>
                  </div>

                  <div className="tCardName">Create tournament</div>
                  <div className="tCardMeta">Admin token required • Click to login</div>
                </button>
              )}
            </div>

            <div className="panel subcard">
              <div className="tSectionHeader">
                <div className="tSectionTitle">
                  <span className="chessIcon">♞</span> Ongoing
                </div>
                <span className="badge active">{active.length}</span>
              </div>

              {active.length ? (
                <div className="tGrid">
                  {active.map((t) => (
                    <Link key={t.id} to={`/tournaments/${t.id}`} className="tCard">
                      <div className="tCardTop">
                        <div className="tCardIcon">
                          <span className="chessIcon">♞</span>
                        </div>
                        <span className="badge active">Active</span>
                      </div>

                      <div className="tCardName">{t.name}</div>
                      <div className="tCardMeta">Rounds: {t.rounds}</div>
                      {t.createdAt ? (
                        <div className="tCardMeta">
                          Created: {new Date(t.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="emptyState">
                  <div className="emptyStateBoard">
                    <span className="emptyStatePiece">♞</span>
                    <span className="emptyStatePiece">♜</span>
                    <span className="emptyStatePiece">♛</span>
                  </div>
                  <div className="emptyStateTitle">The board awaits…</div>
                  <div className="emptyStateMsg">No battles in progress. Rally your players and make your opening move.</div>
                </div>
              )}
            </div>

            <div className="panel subcard">
              <div className="tSectionHeader">
                <div className="tSectionTitle">
                  <span className="chessIcon">♚</span> Completed
                </div>
                <span className="badge done">{past.length}</span>
              </div>

              {past.length ? (
                <div className="tGrid">
                  {past.map((t) => (
                    <Link key={t.id} to={`/tournaments/${t.id}`} className="tCard done">
                      <div className="tCardTop">
                        <div className="tCardIcon done">
                          <span className="chessIcon">♚</span>
                        </div>
                        <span className="badge done">Done</span>
                      </div>

                      <div className="tCardName">{t.name}</div>
                      <div className="tCardMeta">Rounds: {t.rounds}</div>
                      {t.createdAt ? (
                        <div className="tCardMeta">
                          Created: {new Date(t.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="emptyState">
                  <div className="emptyStateBoard">
                    <span className="emptyStatePiece">♚</span>
                    <span className="emptyStatePiece">♝</span>
                    <span className="emptyStatePiece">♟</span>
                  </div>
                  <div className="emptyStateTitle">No legends yet</div>
                  <div className="emptyStateMsg">Completed tournaments will be enshrined here. Finish a game and claim glory.</div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
