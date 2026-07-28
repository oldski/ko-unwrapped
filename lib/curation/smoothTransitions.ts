// Greedy nearest-neighbor reorder of the middle of a set to minimize
// adjacent jumps. Cost blends energy distance with harmonic mixability
// (bpm/Camelot) when both tracks carry mix data; without it the cost is
// energy distance alone — identical to the pre-Phase-2 behavior.
// Opener and outro stay pinned (chosen deliberately upstream).

import { harmonicCompat } from './mix/compat';

type Mixable = { energy: number; bpm?: number | null; camelotKey?: string | null };

function hasMixData(t: Mixable): boolean {
  return t.bpm != null || t.camelotKey != null;
}

function cost(from: Mixable, to: Mixable): number {
  const energyDist = Math.abs(to.energy - from.energy);
  if (!hasMixData(from) || !hasMixData(to)) return energyDist;
  const compat = harmonicCompat(
    { bpm: from.bpm ?? null, camelotKey: from.camelotKey ?? null },
    { bpm: to.bpm ?? null, camelotKey: to.camelotKey ?? null }
  );
  return (energyDist + (1 - compat.score)) / 2;
}

export function smoothTransitions<T extends Mixable>(items: T[]): T[] {
  if (items.length <= 3) return [...items];

  const opener = items[0];
  const outro = items[items.length - 1];
  const pool = items.slice(1, -1);

  const ordered: T[] = [];
  let current: T = opener;
  while (pool.length > 0) {
    let bestIdx = 0;
    let bestCost = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = cost(current, pool[i]);
      if (c < bestCost) {
        bestCost = c;
        bestIdx = i;
      }
    }
    const next = pool.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next;
  }

  return [opener, ...ordered, outro];
}
