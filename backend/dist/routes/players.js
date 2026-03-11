"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playersRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
exports.playersRouter = (0, express_1.Router)();
exports.playersRouter.get("/players", async (_req, res, next) => {
    try {
        const players = await prisma_1.prisma.player.findMany({
            orderBy: { rating: "desc" },
            select: { id: true, name: true, rating: true },
        });
        res.json(players);
    }
    catch (e) {
        next(e);
    }
});
exports.playersRouter.get("/players/stats", async (_req, res, next) => {
    try {
        const players = await prisma_1.prisma.player.findMany({
            orderBy: { rating: "desc" },
            select: { id: true, name: true, rating: true },
        });
        const matches = await prisma_1.prisma.match.findMany({
            where: { NOT: { result: null } },
            select: { p1Id: true, p2Id: true, result: true },
        });
        const stats = new Map();
        for (const p of players)
            stats.set(p.id, { games: 0, wins: 0, draws: 0, losses: 0 });
        for (const m of matches) {
            if (m.result === null)
                continue;
            const s1 = stats.get(m.p1Id);
            const s2 = stats.get(m.p2Id);
            if (!s1 || !s2)
                continue;
            s1.games += 1;
            s2.games += 1;
            if (m.result === 0) {
                s1.draws += 1;
                s2.draws += 1;
            }
            else if (m.result === 1) {
                s1.wins += 1;
                s2.losses += 1;
            }
            else {
                s1.losses += 1;
                s2.wins += 1;
            }
        }
        res.json(players.map((p) => ({
            ...p,
            ...stats.get(p.id),
        })));
    }
    catch (e) {
        next(e);
    }
});
exports.playersRouter.get("/players/:id/profile", async (req, res, next) => {
    try {
        const playerId = Number(req.params.id);
        if (!Number.isFinite(playerId))
            return res.status(400).json({ error: "Invalid id" });
        const player = await prisma_1.prisma.player.findUnique({
            where: { id: playerId },
            select: { id: true, name: true, rating: true, createdAt: true },
        });
        if (!player)
            return res.status(404).json({ error: "Not found" });
        const matches = await prisma_1.prisma.match.findMany({
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
            if (result === null)
                continue;
            const asWhite = m.p1Id === playerId;
            const whiteWin = result === 1;
            const draw = result === 0;
            const whiteLoss = result === -1;
            if (draw)
                draws++;
            else if ((asWhite && whiteWin) || (!asWhite && whiteLoss))
                wins++;
            else
                losses++;
        }
        const tournaments = await prisma_1.prisma.tournamentPlayer.findMany({
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
    }
    catch (e) {
        next(e);
    }
});
