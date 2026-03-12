import { Router } from "express";
import { prisma } from "../prisma";

export const playersRouter = Router();

playersRouter.get("/players", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(200, Math.max(0, parseInt(String(req.query.limit ?? "0"), 10) || 0));

    const [total, players] = await Promise.all([
      prisma.player.count(),
      prisma.player.findMany({
        orderBy: { rating: "desc" },
        select: { id: true, name: true, rating: true },
        ...(limit > 0 ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
    ]);

    // If no pagination requested, return plain array (backwards-compatible)
    if (limit === 0) return res.json(players);

    res.json({ players, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e) {
    next(e);
  }
});

playersRouter.get("/players/stats", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "10"), 10) || 10));
    const search = String(req.query.search ?? "")
      .trim()
      .toLowerCase();
    const tiersRaw = String(req.query.tiers ?? "").trim();
    const tiers = tiersRaw ? tiersRaw.split(",").filter(Boolean) : [];
    const sortBy = String(req.query.sortBy ?? "rating");
    const minGames = Math.max(0, parseInt(String(req.query.minGames ?? "0"), 10) || 0);

    // All players sorted by rating — defines global rank
    const allPlayers = await prisma.player.findMany({
      orderBy: { rating: "desc" },
      select: { id: true, name: true, rating: true },
    });

    const matches = await prisma.match.findMany({
      where: { NOT: { result: null } },
      select: { p1Id: true, p2Id: true, result: true },
    });

    const statsMap = new Map<number, { games: number; wins: number; draws: number; losses: number }>();
    for (const p of allPlayers) statsMap.set(p.id, { games: 0, wins: 0, draws: 0, losses: 0 });

    for (const m of matches) {
      if (m.result === null) continue;
      const s1 = statsMap.get(m.p1Id);
      const s2 = statsMap.get(m.p2Id);
      if (!s1 || !s2) continue;
      s1.games++;
      s2.games++;
      if (m.result === 0) {
        s1.draws++;
        s2.draws++;
      } else if (m.result === 1) {
        s1.wins++;
        s2.losses++;
      } else {
        s1.losses++;
        s2.wins++;
      }
    }

    function getTier(rank: number): string {
      if (rank === 1) return "grandmaster";
      if (rank === 2) return "elite";
      if (rank <= 4) return "master";
      if (rank <= 7) return "expert";
      if (rank <= 11) return "advanced";
      return "player";
    }

    const TIER_LABELS: Record<string, string> = {
      grandmaster: "♔  Grand Master",
      elite: "♕  Elite",
      master: "♖  Master",
      expert: "♗  Expert",
      advanced: "♘  Advanced",
      player: "♙  Player",
    };

    const TIER_PIECES: Record<string, string> = {
      grandmaster: "♔",
      elite: "♕",
      master: "♖",
      expert: "♗",
      advanced: "♘",
      player: "♙",
    };

    // Enrich with global rank, tier, computed stats
    let enriched = allPlayers.map((p, idx) => {
      const rank = idx + 1;
      const tier = getTier(rank);
      const s = statsMap.get(p.id)!;
      const winRate = s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        rating: p.rating,
        rank,
        tier,
        tierLabel: TIER_LABELS[tier],
        piece: TIER_PIECES[tier],
        games: s.games,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        winRate,
      };
    });

    // Apply filters
    if (search) enriched = enriched.filter((p) => p.name.toLowerCase().includes(search));
    if (tiers.length) enriched = enriched.filter((p) => tiers.includes(p.tier));
    if (minGames > 0) enriched = enriched.filter((p) => p.games >= minGames);

    // Sort
    if (sortBy === "winrate") enriched.sort((a, b) => b.winRate - a.winRate || b.rating - a.rating);
    else if (sortBy === "games") enriched.sort((a, b) => b.games - a.games || b.rating - a.rating);
    else if (sortBy === "wins") enriched.sort((a, b) => b.wins - a.wins || b.rating - a.rating);
    // default "rating" already sorted

    const total = enriched.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const players = enriched.slice((page - 1) * limit, page * limit);

    res.json({ players, total, page, limit, totalPages });
  } catch (e) {
    next(e);
  }
});

playersRouter.get("/players/:id/profile", async (req, res, next) => {
  try {
    const playerId = Number(req.params.id);
    if (!Number.isFinite(playerId)) return res.status(400).json({ error: "Invalid id" });

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, name: true, rating: true, createdAt: true },
    });
    if (!player) return res.status(404).json({ error: "Not found" });

    const matches = await prisma.match.findMany({
      where: {
        OR: [{ p1Id: playerId }, { p2Id: playerId }],
        NOT: { result: null },
      },
      include: {
        round: { include: { tournament: { select: { id: true, name: true, active: true } } } },
        p1: { select: { id: true, name: true } },
        p2: { select: { id: true, name: true } },
      },
      orderBy: { id: "desc" },
      take: 50,
    });

    let wins = 0;
    let draws = 0;
    let losses = 0;
    for (const m of matches) {
      const result = m.result;
      if (result === null) continue;

      const asWhite = m.p1Id === playerId;
      const whiteWin = result === 1;
      const draw = result === 0;
      const whiteLoss = result === -1;

      if (draw) draws++;
      else if ((asWhite && whiteWin) || (!asWhite && whiteLoss)) wins++;
      else losses++;
    }

    const tournaments = await prisma.tournamentPlayer.findMany({
      where: { playerId },
      include: { tournament: { select: { id: true, name: true, active: true, createdAt: true } } },
      orderBy: { tournamentId: "desc" },
    });

    res.json({
      player,
      summary: {
        games: wins + draws + losses,
        wins,
        draws,
        losses,
      },
      tournaments: tournaments.map((tp) => ({
        tournamentId: tp.tournamentId,
        tournamentName: tp.tournament.name,
        active: tp.tournament.active,
        score: tp.score,
        hadBye: tp.hadBye,
        createdAt: tp.tournament.createdAt,
      })),
      recentMatches: matches.map((m) => ({
        id: m.id,
        tournament: m.round.tournament,
        roundId: m.roundId,
        p1: m.p1,
        p2: m.p2,
        result: m.result,
      })),
    });
  } catch (e) {
    next(e);
  }
});
