import { describe, it, expect } from 'vitest';
import { validateDirectorOutput } from '@/lib/curation/agent/validateDirectorOutput';
import type { PoolTrack } from '@/lib/curation/agent/types';

const pt = (id: string, durationMs = 180_000): PoolTrack => ({
  trackId: id,
  spotifyTrackId: `sp-${id}`,
  trackName: id,
  artistNames: ['A'],
  durationMs,
  popularity: 30,
  albumImageUrl: null,
  tags: [],
  energy: 0.5,
  score: 0.4,
  source: 'library',
});

const raw = (ids: string[], over: Partial<any> = {}) => ({
  track_ids: ids,
  placement_notes: ids.map((id) => ({ track_id: id, note: `note-${id}` })),
  transitions: ids.slice(0, -1).map((_, i) => ({ from_index: i, note: `t-${i}` })),
  narrative: 'a set',
  ...over,
});

describe('validateDirectorOutput', () => {
  const pool = [pt('a'), pt('b'), pt('c'), pt('d')];

  it('passes a clean set through', () => {
    const v = validateDirectorOutput({ raw: raw(['a', 'b', 'c']), pool, durationTargetMs: [300_000, 700_000] });
    expect(v.trackIds).toEqual(['a', 'b', 'c']);
    expect(v.placementNotes['b']).toBe('note-b');
    expect(v.transitions).toHaveLength(2);
    expect(v.warnings).toEqual([]);
  });

  it('drops ids not in the pool, with a warning', () => {
    const v = validateDirectorOutput({ raw: raw(['a', 'ghost', 'b']), pool, durationTargetMs: [100_000, 700_000] });
    expect(v.trackIds).toEqual(['a', 'b']);
    expect(v.warnings.some((w) => w.includes('ghost'))).toBe(true);
  });

  it('drops duplicate ids', () => {
    const v = validateDirectorOutput({ raw: raw(['a', 'a', 'b']), pool, durationTargetMs: [100_000, 700_000] });
    expect(v.trackIds).toEqual(['a', 'b']);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  it('repairs duration overshoot by trimming from the end', () => {
    const v = validateDirectorOutput({ raw: raw(['a', 'b', 'c', 'd']), pool, durationTargetMs: [100_000, 400_000] });
    expect(v.trackIds).toEqual(['a', 'b']);
    expect(v.warnings.some((w) => w.includes('duration'))).toBe(true);
  });

  it('keeps under-min sets but warns', () => {
    const v = validateDirectorOutput({ raw: raw(['a']), pool, durationTargetMs: [600_000, 900_000] });
    expect(v.trackIds).toEqual(['a']);
    expect(v.warnings.some((w) => w.includes('below'))).toBe(true);
  });

  it('drops transitions whose from_index lost its successor', () => {
    const v = validateDirectorOutput({ raw: raw(['a', 'b', 'c', 'd']), pool, durationTargetMs: [100_000, 400_000] });
    for (const t of v.transitions) expect(t.fromIndex).toBeLessThan(v.trackIds.length - 1);
  });
});
