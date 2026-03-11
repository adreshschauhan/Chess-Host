import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api";
import AppShell from "../components/AppShell";

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
  const [requestError, setRequestError] = useState<{ playerId: number; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (invalidId) return;
        const pr = await apiFetch<PlayerProfile>(`/api/players/${playerId}/profile`);
        if (cancelled) return;
        setProfile(pr);
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
      title="Player Profile"
      subtitle={displayedProfile ? displayedProfile.player.name : "Loading…"}
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

      {!displayedProfile ? (
        <div className="card">Loading…</div>
      ) : (
        <div className="grid">
          <section className="card">
            <h2>{displayedProfile.player.name}</h2>
            <div className="muted">Rating: {Math.round(displayedProfile.player.rating)}</div>

            <div className="card subcard" style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span className="badge">Games: {displayedProfile.summary.games}</span>
                <span className="badge">W: {displayedProfile.summary.wins}</span>
                <span className="badge">D: {displayedProfile.summary.draws}</span>
                <span className="badge">L: {displayedProfile.summary.losses}</span>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Tournament history</h2>
            {displayedProfile.tournaments.length ? (
              <ul>
                {displayedProfile.tournaments.map((t) => (
                  <li key={t.tournamentId}>
                    <Link to={`/tournaments/${t.tournamentId}`}>{t.tournamentName}</Link> – score {t.score}
                    {t.active ? " (active)" : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted">No tournaments yet</div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
