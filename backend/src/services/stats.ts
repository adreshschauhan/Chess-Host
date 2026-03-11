import { prisma } from "../prisma";

export async function winningStreaks() {
  const t = await prisma.tournament.findFirst({
    where: { active: false },
    orderBy: { id: "desc" },
  });
  if (!t) return [] as Array<{ name: string; count: number }>;

  const rounds = await prisma.round.findMany({
    where: { tournamentId: t.id },
    orderBy: { roundNumber: "asc" },
    include: {
      matches: true,
    },
  });

  const tps = await prisma.tournamentPlayer.findMany({
    where: { tournamentId: t.id },
    include: { player: true },
  });

  const streaks = new Map<string, number>();
  let maxStreak = 0;

  for (const tp of tps) {
    let current = 0;
    let best = 0;

    for (const r of rounds) {
      for (const m of r.matches) {
        if (m.result === null) continue;

        const played = m.p1Id === tp.playerId || m.p2Id === tp.playerId;
        if (!played) continue;

        const win = (m.p1Id === tp.playerId && m.result === 1) || (m.p2Id === tp.playerId && m.result === -1);

        if (win) {
          current += 1;
          best = Math.max(best, current);
        } else {
          current = 0;
        }
      }
    }

    streaks.set(tp.player.name, best);
    maxStreak = Math.max(maxStreak, best);
  }

  return [...streaks.entries()].filter(([, s]) => s === maxStreak && s > 0).map(([name, count]) => ({ name, count }));
}

export async function giantKillers() {
  const t = await prisma.tournament.findFirst({
    where: { active: false },
    orderBy: { id: "desc" },
  });
  if (!t) return [] as string[];

  const rounds = await prisma.round.findMany({
    where: { tournamentId: t.id },
    include: { matches: true },
  });

  const killers = new Set<string>();

  for (const r of rounds) {
    for (const m of r.matches) {
      if (m.result === null) continue;

      const p1 = await prisma.player.findUnique({ where: { id: m.p1Id } });
      const p2 = await prisma.player.findUnique({ where: { id: m.p2Id } });
      if (!p1 || !p2) continue;

      if (m.result === 1 && p2.rating - p1.rating >= 200) killers.add(p1.name);
      if (m.result === -1 && p1.rating - p2.rating >= 200) killers.add(p2.name);
    }
  }

  return [...killers];
}
