import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import AppShell from "../components/AppShell";

type PlayerStats = {
  id: number;
  name: string;
  rating: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
};

// Chess piece assigned by rank: King for #1, Queen #2, Rook #3-4, Bishop #5-7, Knight #8-11, Pawn rest
function getPiece(rank: number): string {
  if (rank === 1) return "♔";
  if (rank === 2) return "♕";
  if (rank <= 4) return "♖";
  if (rank <= 7) return "♗";
  if (rank <= 11) return "♘";
  return "♙";
}

function rankClass(rank: number): string {
  if (rank === 1) return "legendCard rank1";
  if (rank === 2) return "legendCard rank2";
  if (rank === 3) return "legendCard rank3";
  return "legendCard";
}

function rankLabel(rank: number): string {
  if (rank === 1) return "♔  Grand Master";
  if (rank === 2) return "♕  Elite";
  if (rank === 3) return "♖  Master";
  if (rank <= 7) return "♗  Expert";
  if (rank <= 11) return "♘  Advanced";
  return "♙  Player";
}

export default function StatsPage() {
  const [rows, setRows] = useState<PlayerStats[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await apiFetch<PlayerStats[]>("/api/players/stats");
        if (cancelled) return;
        setRows(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalGames = rows.reduce((s, p) => s + p.games, 0);
  const totalPlayers = rows.length;

  return (
    <AppShell
      title="Hall of Legends"
      subtitle="Chess cabinet — every warrior's battle record"
      actions={
        <>
          <Link className="btn" to="/players">
            Profiles
          </Link>
          <Link className="btn" to="/dashboard">
            Dashboard
          </Link>
        </>
      }
    >
      {error ? <div className="alert">{error}</div> : null}

      {/* ── Cabinet banner ── */}
      {!loading && rows.length > 0 && (
        <div className="cabinetBanner">
          <span className="cabinetBannerPiece">♟</span>
          <div className="cabinetBannerText">
            <div className="cabinetBannerTitle">Chess Cabinet of Legends</div>
            <div className="cabinetBannerSub">
              {totalPlayers} warriors. {Math.round(totalGames / 2).toLocaleString()} battles fought. The board remembers every move.
            </div>
          </div>
          <div className="cabinetBannerScore">
            <span className="cabinetBannerScoreNum">{totalPlayers}</span>
            <span className="cabinetBannerScoreLabel">Players</span>
          </div>
          <div className="cabinetBannerScore">
            <span className="cabinetBannerScoreNum">{Math.round(totalGames / 2)}</span>
            <span className="cabinetBannerScoreLabel">Matches</span>
          </div>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div className="emptyState">
          <div className="emptyStateBoard">
            <span className="emptyStatePiece">♜</span>
            <span className="emptyStatePiece">♛</span>
            <span className="emptyStatePiece">♝</span>
          </div>
          <div className="emptyStateTitle">Summoning the Legends…</div>
          <div className="emptyStateMsg">Retrieving battle records from the archives.</div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && rows.length === 0 && !error && (
        <div className="emptyState">
          <div className="emptyStateBoard">
            <span className="emptyStatePiece">♜</span>
            <span className="emptyStatePiece">♛</span>
            <span className="emptyStatePiece">♝</span>
          </div>
          <div className="emptyStateTitle">The Cabinet Awaits</div>
          <div className="emptyStateMsg">No legends yet. Play a game to claim your throne.</div>
        </div>
      )}

      {/* ── Cabinet grid ── */}
      {!loading && rows.length > 0 && (
        <div className="cabinetGrid">
          {rows.map((p, idx) => {
            const rank = idx + 1;
            const winRate = p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0;
            const delay = `${(idx % 12) * 0.05}s`;
            return (
              <div key={p.id} className={rankClass(rank)} style={{ animationDelay: delay }}>
                {/* Header */}
                <div className="legendCardHeader">
                  <div className="legendPieceWrap">
                    <span className="legendPiece" style={{ animationDelay: `${(idx * 0.3) % 4}s` }}>
                      {getPiece(rank)}
                    </span>
                  </div>
                  <span className="legendRankBadge">{rankLabel(rank)}</span>
                </div>

                {/* Body */}
                <div className="legendCardBody">
                  <div>
                    <div className="legendName">{p.name}</div>
                    <div className="legendRating">
                      <span className="legendRatingNum">{Math.round(p.rating)}</span>
                      <span className="legendRatingLabel">ELO</span>
                    </div>
                  </div>

                  {/* Stat pips */}
                  <div className="legendStatPips">
                    <div className="legendStatPip win">
                      <span className="legendStatPipNum">{p.wins}</span>
                      <span className="legendStatPipLabel">Wins</span>
                    </div>
                    <div className="legendStatPip draw">
                      <span className="legendStatPipNum">{p.draws}</span>
                      <span className="legendStatPipLabel">Draws</span>
                    </div>
                    <div className="legendStatPip loss">
                      <span className="legendStatPipNum">{p.losses}</span>
                      <span className="legendStatPipLabel">Losses</span>
                    </div>
                  </div>

                  {/* Win-rate bar */}
                  {p.games > 0 && (
                    <div className="legendBarWrap">
                      <div className="legendBarLabel">
                        <span>Win Rate</span>
                        <span>{winRate}%</span>
                      </div>
                      <div className="legendBarTrack">
                        <div
                          className="legendBarFill"
                          style={{
                            ["--bar-w" as string]: `${winRate}%`,
                            ["--bar-delay" as string]: `${0.3 + idx * 0.04}s`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {p.games === 0 && (
                    <div className="legendBarLabel" style={{ justifyContent: "center", marginTop: 4 }}>
                      <span style={{ fontStyle: "italic" }}>No games played</span>
                    </div>
                  )}
                </div>

                <hr className="legendDivider" />

                {/* Footer */}
                <div className="legendCardFooter">
                  <Link className="legendProfileBtn" to={`/players/${p.id}`}>
                    ♟ View Profile
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
