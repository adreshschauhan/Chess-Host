"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.winningStreaks = winningStreaks;
exports.giantKillers = giantKillers;
const prisma_1 = require("../prisma");
async function winningStreaks() {
    const t = await prisma_1.prisma.tournament.findFirst({
        where: { active: false },
        orderBy: { id: "desc" },
    });
    if (!t)
        return [];
    const rounds = await prisma_1.prisma.round.findMany({
        where: { tournamentId: t.id },
        orderBy: { roundNumber: "asc" },
        include: {
            matches: true,
        },
    });
    const tps = await prisma_1.prisma.tournamentPlayer.findMany({
        where: { tournamentId: t.id },
        include: { player: true },
    });
    const streaks = new Map();
    let maxStreak = 0;
    for (const tp of tps) {
        let current = 0;
        let best = 0;
        for (const r of rounds) {
            for (const m of r.matches) {
                if (m.result === null)
                    continue;
                const played = m.p1Id === tp.playerId || m.p2Id === tp.playerId;
                if (!played)
                    continue;
                const win = (m.p1Id === tp.playerId && m.result === 1) ||
                    (m.p2Id === tp.playerId && m.result === -1);
                if (win) {
                    current += 1;
                    best = Math.max(best, current);
                }
                else {
                    current = 0;
                }
            }
        }
        streaks.set(tp.player.name, best);
        maxStreak = Math.max(maxStreak, best);
    }
    return [...streaks.entries()]
        .filter(([, s]) => s === maxStreak && s > 0)
        .map(([name, count]) => ({ name, count }));
}
async function giantKillers() {
    const t = await prisma_1.prisma.tournament.findFirst({
        where: { active: false },
        orderBy: { id: "desc" },
    });
    if (!t)
        return [];
    const rounds = await prisma_1.prisma.round.findMany({
        where: { tournamentId: t.id },
        include: { matches: true },
    });
    const killers = new Set();
    for (const r of rounds) {
        for (const m of r.matches) {
            if (m.result === null)
                continue;
            const p1 = await prisma_1.prisma.player.findUnique({ where: { id: m.p1Id } });
            const p2 = await prisma_1.prisma.player.findUnique({ where: { id: m.p2Id } });
            if (!p1 || !p2)
                continue;
            if (m.result === 1 && p2.rating - p1.rating >= 200)
                killers.add(p1.name);
            if (m.result === -1 && p1.rating - p2.rating >= 200)
                killers.add(p2.name);
        }
    }
    return [...killers];
}
