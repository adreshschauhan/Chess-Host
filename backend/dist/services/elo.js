"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRatingsForTournament = updateRatingsForTournament;
const prisma_1 = require("../prisma");
const K = 32;
function expected(r1, r2) {
    return 1 / (1 + 10 ** ((r2 - r1) / 400));
}
async function updateRatingsForTournament(tournamentId) {
    const rounds = await prisma_1.prisma.round.findMany({
        where: { tournamentId },
        include: {
            matches: true,
        },
        orderBy: { roundNumber: "asc" },
    });
    for (const round of rounds) {
        for (const match of round.matches) {
            if (match.result === null)
                continue;
            const p1 = await prisma_1.prisma.player.findUnique({ where: { id: match.p1Id } });
            const p2 = await prisma_1.prisma.player.findUnique({ where: { id: match.p2Id } });
            if (!p1 || !p2)
                continue;
            const e1 = expected(p1.rating, p2.rating);
            const e2 = expected(p2.rating, p1.rating);
            let s1 = 0.5;
            let s2 = 0.5;
            if (match.result === 1) {
                s1 = 1;
                s2 = 0;
            }
            else if (match.result === -1) {
                s1 = 0;
                s2 = 1;
            }
            const p1New = p1.rating + K * (s1 - e1);
            const p2New = p2.rating + K * (s2 - e2);
            await prisma_1.prisma.player.update({ where: { id: p1.id }, data: { rating: p1New } });
            await prisma_1.prisma.player.update({ where: { id: p2.id }, data: { rating: p2New } });
        }
    }
}
