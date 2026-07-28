import type { DirectorSet, PoolTrack } from './types';

export interface ValidationInput {
  raw: {
    track_ids: string[];
    placement_notes: { track_id: string; note: string }[];
    transitions: { from_index: number; note: string }[];
    narrative: string;
  };
  pool: PoolTrack[];
  durationTargetMs: [number, number];
}

export interface ValidatedSet extends DirectorSet {
  warnings: string[];
}

/** Structural guard: the director may only sequence tracks we handed it. */
export function validateDirectorOutput(input: ValidationInput): ValidatedSet {
  const { raw, pool, durationTargetMs } = input;
  const [minMs, maxMs] = durationTargetMs;
  const byId = new Map(pool.map((p) => [p.trackId, p]));
  const warnings: string[] = [];

  const seen = new Set<string>();
  let trackIds: string[] = [];
  for (const id of raw.track_ids ?? []) {
    if (!byId.has(id)) {
      warnings.push(`dropped unknown track id ${id}`);
      continue;
    }
    if (seen.has(id)) {
      warnings.push(`dropped duplicate track id ${id}`);
      continue;
    }
    seen.add(id);
    trackIds.push(id);
  }

  let totalMs = trackIds.reduce((s, id) => s + byId.get(id)!.durationMs, 0);
  while (trackIds.length > 0 && totalMs > maxMs) {
    const removed = trackIds.pop()!;
    totalMs -= byId.get(removed)!.durationMs;
    warnings.push(`trimmed ${removed} to repair duration overshoot`);
  }
  if (totalMs < minMs) {
    warnings.push(`set duration ${Math.round(totalMs / 60000)}min is below the ${Math.round(minMs / 60000)}min target`);
  }

  const placementNotes: Record<string, string> = {};
  for (const n of raw.placement_notes ?? []) {
    if (seen.has(n.track_id) && trackIds.includes(n.track_id)) placementNotes[n.track_id] = n.note;
  }

  const transitions = (raw.transitions ?? [])
    .filter((t) => Number.isInteger(t.from_index) && t.from_index >= 0 && t.from_index < trackIds.length - 1)
    .map((t) => ({ fromIndex: t.from_index, note: t.note }));

  return {
    trackIds,
    placementNotes,
    transitions,
    narrative: typeof raw.narrative === 'string' ? raw.narrative : '',
    warnings,
  };
}
