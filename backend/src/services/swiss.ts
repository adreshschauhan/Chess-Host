export type SwissPlayer = {
  tournamentPlayerId: number;
  playerId: number;
  score: number;
  hadBye: boolean;
  rating: number;
};

export function swissPair(players: SwissPlayer[]) {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.rating - a.rating;
  });

  const pairings: Array<[SwissPlayer, SwissPlayer]> = [];
  let byePlayer: SwissPlayer | null = null;

  if (sorted.length % 2 === 1) {
    const eligible = sorted.filter((p) => !p.hadBye).sort((a, b) => (a.score !== b.score ? a.score - b.score : a.rating - b.rating));

    byePlayer = eligible[0] ?? sorted[sorted.length - 1];
    const idx = sorted.findIndex((p) => p.tournamentPlayerId === byePlayer!.tournamentPlayerId);
    if (idx >= 0) sorted.splice(idx, 1);
  }

  while (sorted.length >= 2) {
    const p1 = sorted.shift()!;
    const p2 = sorted.shift()!;
    pairings.push([p1, p2]);
  }

  return { pairings, byePlayer };
}
