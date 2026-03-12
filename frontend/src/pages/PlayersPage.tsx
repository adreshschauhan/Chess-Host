import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import AppShell from "../components/AppShell";
import "./PlayersPage.css";

const PAGE_SIZE = 10;
const T_PAGE_SIZE = 5;

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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [tPage, setTPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    void (async () => {
      try {
        const data = await apiFetch<{ players: Player[]; totalPages: number }>(`/api/players?page=${page}&limit=${PAGE_SIZE}`);
        if (cancelled) return;
        setPlayers(data.players ?? []);
        setTotalPages(Math.max(1, data.totalPages ?? 1));
        setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page]);

  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;
    void (async () => {
      try {
        const pr = await apiFetch<PlayerProfile>(`/api/players/${selectedId}/profile`);
        if (cancelled) return;
        setProfile(pr);
        setTPage(1);
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
      title="♟ Chess Cabinet"
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

      <div className="cabinet-layout">
        {/* ── LEFT: players table ── */}
        <section className="cabinet-card">
          <div className="cabinet-card-header">
            <span className="cabinet-crown">♔</span>
            <h2 className="cabinet-title">Players</h2>
          </div>

          <div className="cabinet-table-wrap">
            <table className="cabinet-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Rating</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="cabinet-loading">
                      <span className="cabinet-spinner">♞</span> Loading…
                    </td>
                  </tr>
                ) : players.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="cabinet-loading">
                      No players found
                    </td>
                  </tr>
                ) : (
                  players.map((p, idx) => (
                    <tr key={p.id} className={`cabinet-row${selectedId === p.id ? " cabinet-row--active" : ""}`} onClick={() => setSelectedId(p.id)}>
                      <td className="cabinet-rank">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td>
                        <Link className="cabinet-player-link" to={`/players/${p.id}`} onClick={(e) => e.stopPropagation()}>
                          {p.name}
                        </Link>
                      </td>
                      <td className="cabinet-rating">{Math.round(p.rating)}</td>
                      <td>
                        <button
                          className="cabinet-badge"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(p.id);
                          }}
                        >
                          ♟ Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="cabinet-pagination">
            <button className="cabinet-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              ‹ Prev
            </button>
            <span className="cabinet-page-info">
              {page} <span className="cabinet-page-sep">of</span> {totalPages}
            </span>
            <button className="cabinet-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next ›
            </button>
          </div>
        </section>

        {/* ── RIGHT: profile panel ── */}
        <section className="cabinet-card cabinet-profile">
          <div className="cabinet-card-header">
            <span className="cabinet-crown">♛</span>
            <h2 className="cabinet-title">Profile</h2>
          </div>

          {!selectedId ? (
            <div className="cabinet-empty">
              <span className="cabinet-empty-piece">♟</span>
              <p>Select a player to view their stats</p>
            </div>
          ) : !profile || profile.player.id !== selectedId ? (
            <div className="cabinet-loading">
              <span className="cabinet-spinner">♞</span> Loading profile…
            </div>
          ) : (
            <div className="cabinet-profile-body">
              <div className="cabinet-profile-name">
                <span className="cabinet-profile-piece">♔</span>
                {profile.player.name}
              </div>
              <div className="cabinet-profile-rating">Rating: {Math.round(profile.player.rating)}</div>

              <div className="cabinet-stats-grid">
                <div className="cabinet-stat">
                  <span className="cabinet-stat-icon">♚</span>
                  <span className="cabinet-stat-value">{profile.summary.games}</span>
                  <span className="cabinet-stat-label">Games</span>
                </div>
                <div className="cabinet-stat cabinet-stat--win">
                  <span className="cabinet-stat-icon">♔</span>
                  <span className="cabinet-stat-value">{profile.summary.wins}</span>
                  <span className="cabinet-stat-label">Wins</span>
                </div>
                <div className="cabinet-stat cabinet-stat--draw">
                  <span className="cabinet-stat-icon">♞</span>
                  <span className="cabinet-stat-value">{profile.summary.draws}</span>
                  <span className="cabinet-stat-label">Draws</span>
                </div>
                <div className="cabinet-stat cabinet-stat--loss">
                  <span className="cabinet-stat-icon">♟</span>
                  <span className="cabinet-stat-value">{profile.summary.losses}</span>
                  <span className="cabinet-stat-label">Losses</span>
                </div>
              </div>

              <div className="cabinet-section-title">Tournament History</div>
              {profile.tournaments.length ? (
                <>
                  <ul className="cabinet-tournament-list">
                    {profile.tournaments.slice((tPage - 1) * T_PAGE_SIZE, tPage * T_PAGE_SIZE).map((t) => (
                      <li key={t.tournamentId} className="cabinet-tournament-item">
                        <Link to={`/tournaments/${t.tournamentId}`} className="cabinet-player-link">
                          {t.tournamentName}
                        </Link>
                        <span className="cabinet-tournament-meta">
                          Score: {t.score}
                          {t.active ? " · active" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {profile.tournaments.length > T_PAGE_SIZE && (
                    <div className="cabinet-pagination cabinet-pagination--sm">
                      <button className="cabinet-page-btn" onClick={() => setTPage((p) => Math.max(1, p - 1))} disabled={tPage === 1}>
                        ‹ Prev
                      </button>
                      <span className="cabinet-page-info">
                        {tPage} <span className="cabinet-page-sep">of</span> {Math.ceil(profile.tournaments.length / T_PAGE_SIZE)}
                      </span>
                      <button
                        className="cabinet-page-btn"
                        onClick={() => setTPage((p) => Math.min(Math.ceil(profile.tournaments.length / T_PAGE_SIZE), p + 1))}
                        disabled={tPage === Math.ceil(profile.tournaments.length / T_PAGE_SIZE)}
                      >
                        Next ›
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="cabinet-muted">No tournaments yet</div>
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
