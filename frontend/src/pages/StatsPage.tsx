import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import AppShell from "../components/AppShell";

type PlayerStats = {
  id: number;
  name: string;
  rating: number;
  rank: number;
  tier: string;
  tierLabel: string;
  piece: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
};

type StatsResponse = {
  players: PlayerStats[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const TIER_OPTIONS = [
  { value: "grandmaster", label: "♔ Grand Master" },
  { value: "elite", label: "♕ Elite" },
  { value: "master", label: "♖ Master" },
  { value: "expert", label: "♗ Expert" },
  { value: "advanced", label: "♘ Advanced" },
  { value: "player", label: "♙ Player" },
];

const MIN_GAMES_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 1, label: "1+" },
  { value: 5, label: "5+" },
  { value: 10, label: "10+" },
  { value: 20, label: "20+" },
];

const SORT_OPTIONS = [
  { value: "rating", label: "Rating" },
  { value: "winrate", label: "Win Rate" },
  { value: "games", label: "Games" },
  { value: "wins", label: "Wins" },
];

const PAGE_SIZE = 10;

function rankClass(rank: number): string {
  if (rank === 1) return "legendCard rank1";
  if (rank === 2) return "legendCard rank2";
  if (rank === 3) return "legendCard rank3";
  return "legendCard";
}

export default function StatsPage() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [minGames, setMinGames] = useState(0);
  const [sortBy, setSortBy] = useState("rating");
  const [showTierGuide, setShowTierGuide] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // Store grand total from first unfiltered load for banner
  const grandTotal = useRef(0);

  // Debounce search input → search state
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 380);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sortBy,
      minGames: String(minGames),
    });
    if (search.trim()) params.set("search", search.trim());
    if (selectedTiers.length) params.set("tiers", selectedTiers.join(","));

    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch<StatsResponse>(`/api/players/stats?${params.toString()}`);
        if (cancelled) return;
        setPlayers(res.players);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        if (!search && !selectedTiers.length && minGames === 0) {
          grandTotal.current = res.total;
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, sortBy, minGames, search, selectedTiers]);

  function toggleTier(t: string) {
    setSelectedTiers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    setPage(1);
  }
  function onMinGames(v: number) {
    setMinGames(v);
    setPage(1);
  }
  function onSortBy(v: string) {
    setSortBy(v);
    setPage(1);
  }
  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setSelectedTiers([]);
    setMinGames(0);
    setSortBy("rating");
    setPage(1);
  }

  const hasFilters = !!search || selectedTiers.length > 0 || minGames > 0 || sortBy !== "rating";
  const activeFilterCount = (search ? 1 : 0) + selectedTiers.length + (minGames > 0 ? 1 : 0) + (sortBy !== "rating" ? 1 : 0);
  const displayTotal = grandTotal.current || total;

  function PaginationBar() {
    return (
      <div className="paginationBar">
        <div className="paginationInfo">
          <span className="paginationPageInfo">
            Page {page} of {totalPages}
          </span>
          <span className="paginationTotal">{hasFilters ? `${total} matching` : `${displayTotal} players`}</span>
        </div>
        <div className="paginationBtns">
          <button type="button" className="pageBtn" onClick={() => setPage(1)} disabled={page === 1}>
            «
          </button>
          <button type="button" className="pageBtn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            ‹
          </button>
          <button type="button" className="pageBtn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
            ›
          </button>
          <button type="button" className="pageBtn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
            »
          </button>
        </div>
      </div>
    );
  }

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
      {!loading && displayTotal > 0 && (
        <div className="cabinetBanner">
          <span className="cabinetBannerPiece">♟</span>
          <div className="cabinetBannerText">
            <div className="cabinetBannerTitle">Chess Cabinet of Legends</div>
            <div className="cabinetBannerSub">
              {hasFilters ? `${total} of ${displayTotal} warriors match your filters.` : `${displayTotal} warriors. The board remembers every move.`}
            </div>
          </div>
          <div className="cabinetBannerScore">
            <span className="cabinetBannerScoreNum">{hasFilters ? total : displayTotal}</span>
            <span className="cabinetBannerScoreLabel">{hasFilters ? "Matched" : "Players"}</span>
          </div>
          <div className="cabinetBannerScore">
            <span className="cabinetBannerScoreNum">{totalPages}</span>
            <span className="cabinetBannerScoreLabel">Pages</span>
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="statsFilterBar">
        {/* Search */}
        <div className="statsFilterRow">
          <span className="statsFilterLabel">Search</span>
          <input
            className="statsSearchInput"
            type="text"
            placeholder="Search players by name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {hasFilters && (
            <>
              <span className="filterActiveCount">{activeFilterCount} active</span>
              <button type="button" className="filterClearBtn" onClick={clearFilters}>
                ✕ Clear
              </button>
            </>
          )}
        </div>

        {/* Tier multiselect */}
        <div className="statsFilterRow">
          <span className="statsFilterLabel">
            Tier
            <button
              type="button"
              className={`tierInfoBtn${showTierGuide ? " open" : ""}`}
              onClick={() => setShowTierGuide((v) => !v)}
              title="Show tier reference guide"
              aria-label="Toggle tier guide"
            >
              ℹ
            </button>
          </span>
          {TIER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filterChip tier-${opt.value}${selectedTiers.includes(opt.value) ? " active" : ""}`}
              onClick={() => toggleTier(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Tier guide — expanded on ℹ click */}
        {showTierGuide && (
          <div className="tierGuidePanel">
            {[
              { tier: "grandmaster", piece: "♔", label: "Grand Master", range: "Rank #1" },
              { tier: "elite", piece: "♕", label: "Elite", range: "Rank #2" },
              { tier: "master", piece: "♖", label: "Master", range: "Rank #3 – #4" },
              { tier: "expert", piece: "♗", label: "Expert", range: "Rank #5 – #7" },
              { tier: "advanced", piece: "♘", label: "Advanced", range: "Rank #8 – #11" },
              { tier: "player", piece: "♙", label: "Player", range: "Rank #12 and below" },
            ].map((row) => (
              <div
                key={row.tier}
                className={`tierGuideRow tier-${row.tier}${selectedTiers.includes(row.tier) ? " active" : ""}`}
                onClick={() => toggleTier(row.tier)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && toggleTier(row.tier)}
                title={`Click to filter by ${row.label}`}
              >
                <span className="tierGuidePiece">{row.piece}</span>
                <span className="tierGuideLabel">{row.label}</span>
                <span className="tierGuideRange">{row.range}</span>
              </div>
            ))}
          </div>
        )}

        {/* Min games */}
        <div className="statsFilterRow">
          <span className="statsFilterLabel">Min Games</span>
          {MIN_GAMES_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filterChip${minGames === opt.value ? " active" : ""}`}
              onClick={() => onMinGames(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="statsFilterRow">
          <span className="statsFilterLabel">Sort By</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filterChip${sortBy === opt.value ? " active" : ""}`}
              onClick={() => onSortBy(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading ── */}
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

      {/* ── Empty ── */}
      {!loading && players.length === 0 && !error && (
        <div className="emptyState">
          <div className="emptyStateBoard">
            <span className="emptyStatePiece">♜</span>
            <span className="emptyStatePiece">♛</span>
            <span className="emptyStatePiece">♝</span>
          </div>
          <div className="emptyStateTitle">{hasFilters ? "No Matches Found" : "The Cabinet Awaits"}</div>
          <div className="emptyStateMsg">
            {hasFilters ? "Try adjusting your filters to find warriors." : "No legends yet. Play a game to claim your throne."}
          </div>
        </div>
      )}

      {/* ── Cabinet grid ── */}
      {!loading && players.length > 0 && (
        <>
          <PaginationBar />
          <div className="cabinetGrid">
            {players.map((p, idx) => (
              <div key={p.id} className={rankClass(p.rank)} style={{ animationDelay: `${(idx % PAGE_SIZE) * 0.045}s` }}>
                {/* Header */}
                <div className="legendCardHeader">
                  <div className="legendPieceWrap">
                    <span className="legendPiece" style={{ animationDelay: `${(idx * 0.3) % 4}s` }}>
                      {p.piece}
                    </span>
                  </div>
                  <span className="legendRankBadge">{p.tierLabel}</span>
                </div>

                {/* Body */}
                <div className="legendCardBody">
                  <div>
                    <div className="legendName">{p.name}</div>
                    <div className="legendRating">
                      <span className="legendRatingNum">{Math.round(p.rating)}</span>
                      <span className="legendRatingLabel">ELO</span>
                      <span className="legendRatingLabel" style={{ marginLeft: 6 }}>
                        #{p.rank}
                      </span>
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
                  {p.games > 0 ? (
                    <div className="legendBarWrap">
                      <div className="legendBarLabel">
                        <span>Win Rate</span>
                        <span>{p.winRate}%</span>
                      </div>
                      <div className="legendBarTrack">
                        <div
                          className="legendBarFill"
                          style={{
                            ["--bar-w" as string]: `${p.winRate}%`,
                            ["--bar-delay" as string]: `${0.3 + idx * 0.04}s`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
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
            ))}
          </div>
          <PaginationBar />
        </>
      )}
    </AppShell>
  );
}
