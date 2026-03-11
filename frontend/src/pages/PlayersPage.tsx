import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import AppShell from "../components/AppShell";

type Player = { id: number; name: string; rating: number };

type PlayerProfile = {
  player: { id: number; name: string; rating: number; createdAt: string };
  summary: { games: number; wins: number; draws: number; losses: number };
  tournaments: Array<{
    tournamentId: number;
    tournamentName: string;
    active: boolean;
    score: number;
    hadBye: boolean;
    createdAt: string;
  }>;
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const p = await apiFetch<Player[]>("/api/players");
        if (cancelled) return;
        setPlayers(p);
        setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;
    void (async () => {
      try {
        const pr = await apiFetch<PlayerProfile>(`/api/players/${selectedId}/profile`);
        if (cancelled) return;
        setProfile(pr);
        setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load profile");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <AppShell
      title="Players"
      subtitle="Browse all players and open profiles"
      actions={
        <>
          <Link className="btn" to="/dashboard">
            Dashboard
          </Link>
        </>
      }
    >
      {error ? <div className="alert">{error}</div> : null}

      <div className="grid">
        <section className="card">
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
                {players.map((p, idx) => (
                  <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setSelectedId(p.id)}>
                    <td>{idx + 1}</td>
                    <td>
                      <Link to={`/players/${p.id}`}>{p.name}</Link>
                    </td>
                    <td>{Math.round(p.rating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h2>Profile</h2>
          {!selectedId ? (
            <div className="muted">Select a player to view stats</div>
          ) : !profile || profile.player.id !== selectedId ? (
            <div className="muted">Loading profile…</div>
          ) : (
            <div className="stack">
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{profile.player.name}</div>
                <div className="muted">Rating: {Math.round(profile.player.rating)}</div>
              </div>

              <div className="card subcard">
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span className="badge">Games: {profile.summary.games}</span>
                  <span className="badge">W: {profile.summary.wins}</span>
                  <span className="badge">D: {profile.summary.draws}</span>
                  <span className="badge">L: {profile.summary.losses}</span>
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Tournament history</div>
                {profile.tournaments.length ? (
                  <ul>
                    {profile.tournaments.map((t) => (
                      <li key={t.tournamentId}>
                        <Link to={`/tournaments/${t.tournamentId}`}>{t.tournamentName}</Link> – score {t.score}
                        {t.active ? " (active)" : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="muted">No tournaments yet</div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
