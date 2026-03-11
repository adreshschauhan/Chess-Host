import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import AppShell from "../components/AppShell";

type Player = { id: number; name: string; rating: number };
type PagedResponse = { players: Player[]; total: number; page: number; limit: number; totalPages: number };

const RANK_ICONS = ["♔", "♕", "♖"] as const;
const RANK_CLASSES = ["rankGold", "rankSilver", "rankBronze"] as const;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const res = await apiFetch<PagedResponse>(`/api/players?page=${page}&limit=${pageSize}`);
        setPlayers(res.players);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [page, pageSize]);

  const start = (page - 1) * pageSize;

  function onPageSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <AppShell
      title="Leaderboard"
      subtitle={total > 0 ? `${total} players ranked by Elo rating` : "Ranked by Elo rating"}
      actions={
        <Link className="btn" to="/dashboard">
          Dashboard
        </Link>
      }
    >
      {error ? <div className="alert">{error}</div> : null}

      <section className="card">
        {loading ? (
          <div className="emptyState compact">
            <div className="emptyStateBoard">
              <span className="emptyStatePiece" style={{ animationDelay: "0s" }}>
                ♔
              </span>
              <span className="emptyStatePiece" style={{ animationDelay: "0.5s" }}>
                ♕
              </span>
              <span className="emptyStatePiece" style={{ animationDelay: "1s" }}>
                ♖
              </span>
            </div>
            <div className="emptyStateTitle">Assembling the rankings…</div>
          </div>
        ) : players.length === 0 ? (
          <div className="emptyState">
            <div className="emptyStateBoard">
              <span className="emptyStatePiece" style={{ animationDelay: "0s" }}>
                ♟
              </span>
              <span className="emptyStatePiece" style={{ animationDelay: "0.7s" }}>
                ♟
              </span>
              <span className="emptyStatePiece" style={{ animationDelay: "1.4s" }}>
                ♟
              </span>
            </div>
            <div className="emptyStateTitle">No players yet</div>
            <div className="emptyStateMsg">Register players to see them rise through the ranks.</div>
          </div>
        ) : (
          <>
            <div className="paginationBar">
              <div className="paginationInfo">
                <span className="paginationPageInfo">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </span>
                <span className="paginationTotal">{total} players</span>
              </div>
              <div className="paginationControls">
                <div className="pageSizeWrap">
                  <span className="pageSizeLabel">Show</span>
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <button key={s} type="button" className={`pageSizeBtn${pageSize === s ? " active" : ""}`} onClick={() => onPageSize(s)}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="paginationBtns">
                  <button type="button" className="pageBtn" disabled={page === 1} onClick={() => setPage(1)} title="First">
                    «
                  </button>
                  <button type="button" className="pageBtn" disabled={page === 1} onClick={() => setPage((p) => p - 1)} title="Previous">
                    ‹
                  </button>
                  <button type="button" className="pageBtn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} title="Next">
                    ›
                  </button>
                  <button type="button" className="pageBtn" disabled={page === totalPages} onClick={() => setPage(totalPages)} title="Last">
                    »
                  </button>
                </div>
              </div>
            </div>

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, idx) => {
                    const globalIdx = start + idx;
                    return (
                      <tr key={p.id}>
                        <td>
                          {globalIdx < 3 ? <span className={`rankIcon ${RANK_CLASSES[globalIdx]}`}>{RANK_ICONS[globalIdx]}</span> : globalIdx + 1}
                        </td>
                        <td>
                          <Link to={`/players/${p.id}`}>{p.name}</Link>
                        </td>
                        <td>{Math.round(p.rating)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="paginationBar" style={{ marginTop: 12 }}>
              <div className="paginationInfo">
                <span className="paginationPageInfo">
                  Showing {start + 1}–{Math.min(start + pageSize, total)} of {total}
                </span>
              </div>
              <div className="paginationBtns">
                <button type="button" className="pageBtn" disabled={page === 1} onClick={() => setPage(1)}>
                  «
                </button>
                <button type="button" className="pageBtn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  ‹
                </button>
                <button type="button" className="pageBtn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  ›
                </button>
                <button type="button" className="pageBtn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
