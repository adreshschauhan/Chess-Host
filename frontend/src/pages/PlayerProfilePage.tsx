import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api";
import AppShell from "../components/AppShell";
import "./PlayersPage.css";

const T_PAGE_SIZE = 5;

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

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = Number(params.id);
  const invalidId = !Number.isFinite(playerId);

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [tPage, setTPage] = useState(1);
  const [requestError, setRequestError] = useState<{ playerId: number; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (invalidId) return;
        const pr = await apiFetch<PlayerProfile>(`/api/players/${playerId}/profile`);
        if (cancelled) return;
        setProfile(pr);
        setTPage(1);
        setRequestError(null);
      } catch (e) {
        if (cancelled) return;
        setRequestError({
          playerId,
          message: e instanceof Error ? e.message : "Failed to load profile",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerId, invalidId]);

  const displayedProfile = !invalidId && profile?.player?.id === playerId ? profile : null;
  const error = invalidId ? "Invalid player id" : requestError && requestError.playerId === playerId ? requestError.message : "";

  return (
    <AppShell
      title="♟ Chess Cabinet"
      subtitle="Player Profile"
      actions={
        <>
          <Link className="btn" to="/players">
            Players
          </Link>
          <Link className="btn" to="/stats">
            Stats
          </Link>
          <Link className="btn" to="/dashboard">
            Dashboard
          </Link>
        </>
      }
    >
      {error ? <div className="alert">{error}</div> : null}

      <div className="cabinet-layout" style={{ gridTemplateColumns: "1fr" }}>
        <section className="cabinet-card cabinet-profile">
          <div className="cabinet-card-header">
            <span className="cabinet-crown">♛</span>
            <h2 className="cabinet-title">Profile</h2>
          </div>

          {!displayedProfile ? (
            <div className="cabinet-loading">
              <span className="cabinet-spinner">♞</span> Loading profile…
            </div>
          ) : (
            <div className="cabinet-profile-body">
              <div className="cabinet-profile-name">
                <span className="cabinet-profile-piece">♔</span>
                {displayedProfile.player.name}
              </div>
              <div className="cabinet-profile-rating">Rating: {Math.round(displayedProfile.player.rating)}</div>

              <div className="cabinet-stats-grid">
                <div className="cabinet-stat">
                  <span className="cabinet-stat-icon">♚</span>
                  <span className="cabinet-stat-value">{displayedProfile.summary.games}</span>
                  <span className="cabinet-stat-label">Games</span>
                </div>
                <div className="cabinet-stat cabinet-stat--win">
                  <span className="cabinet-stat-icon">♔</span>
                  <span className="cabinet-stat-value">{displayedProfile.summary.wins}</span>
                  <span className="cabinet-stat-label">Wins</span>
                </div>
                <div className="cabinet-stat cabinet-stat--draw">
                  <span className="cabinet-stat-icon">♞</span>
                  <span className="cabinet-stat-value">{displayedProfile.summary.draws}</span>
                  <span className="cabinet-stat-label">Draws</span>
                </div>
                <div className="cabinet-stat cabinet-stat--loss">
                  <span className="cabinet-stat-icon">♟</span>
                  <span className="cabinet-stat-value">{displayedProfile.summary.losses}</span>
                  <span className="cabinet-stat-label">Losses</span>
                </div>
              </div>

              <div className="cabinet-section-title">Tournament History</div>
              {displayedProfile.tournaments.length ? (
                <>
                  <ul className="cabinet-tournament-list">
                    {displayedProfile.tournaments.slice((tPage - 1) * T_PAGE_SIZE, tPage * T_PAGE_SIZE).map((t) => (
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
                  {displayedProfile.tournaments.length > T_PAGE_SIZE && (
                    <div className="cabinet-pagination cabinet-pagination--sm">
                      <button className="cabinet-page-btn" onClick={() => setTPage((p) => Math.max(1, p - 1))} disabled={tPage === 1}>
                        ‹ Prev
                      </button>
                      <span className="cabinet-page-info">
                        {tPage} <span className="cabinet-page-sep">of</span> {Math.ceil(displayedProfile.tournaments.length / T_PAGE_SIZE)}
                      </span>
                      <button
                        className="cabinet-page-btn"
                        onClick={() => setTPage((p) => Math.min(Math.ceil(displayedProfile.tournaments.length / T_PAGE_SIZE), p + 1))}
                        disabled={tPage === Math.ceil(displayedProfile.tournaments.length / T_PAGE_SIZE)}
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
