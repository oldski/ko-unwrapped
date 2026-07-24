// Greedy nearest-neighbor reorder of the middle of a set to minimize
// adjacent energy jumps. Opener and outro stay pinned (the candidate
// scorer chose them deliberately).

export function smoothTransitions<T extends { energy: number }>(items: T[]): T[] {
  if (items.length <= 3) return [...items];

  const opener = items[0];
  const outro = items[items.length - 1];
  const pool = items.slice(1, -1);

  const ordered: T[] = [];
  let current = opener.energy;
  while (pool.length > 0) {
    let bestIdx = 0;
    let bestDelta = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const d = Math.abs(pool[i].energy - current);
      if (d < bestDelta) {
        bestDelta = d;
        bestIdx = i;
      }
    }
    const next = pool.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next.energy;
  }

  return [opener, ...ordered, outro];
}
