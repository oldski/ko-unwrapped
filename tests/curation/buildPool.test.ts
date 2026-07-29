import { describe, it, expect } from 'vitest';
import { buildPool } from '@/lib/curation/agent/buildPool';
import type { CandidateTrack } from '@/lib/curation/candidateScorer';

const cand = (id: string, over: Partial<CandidateTrack> = {}): CandidateTrack => ({
  trackId: id,
  spotifyTrackId: `sp-${id}`,
  trackName: `Track ${id}`,
  artistNames: ['Artist'],
  durationMs: 200_000,
  popularity: 40,
  albumImageUrl: null,
  bpm: null,
  camelotKey: null,
  tags: ['electronic', 'high-energy'],
  score: 0.5,
  reasons: ['r'],
  ...over,
});

const disc = (id: string) => ({
  trackId: id,
  spotifyTrackId: `sp-${id}`,
  trackName: `Track ${id}`,
  artistNames: ['New Artist'],
  durationMs: 210_000,
  popularity: 30,
  albumImageUrl: null,
  tags: ['ambient'],
  reason: 'similar to seed',
});

describe('buildPool', () => {
  it('labels sources and computes energy from tags', () => {
    const pool = buildPool([cand('a', { bpm: 122, camelotKey: '8A' })], [cand('s')], [disc('d')]);
    const byId = new Map(pool.map((p) => [p.trackId, p]));
    expect(byId.get('a')!.source).toBe('library');
    expect(byId.get('s')!.source).toBe('seed');
    expect(byId.get('d')!.source).toBe('discovery');
    expect(byId.get('a')!.energy).toBeGreaterThan(0.6);
    expect(byId.get('d')!.energy).toBeLessThan(0.3);
    expect(byId.get('a')!.bpm).toBe(122);
    expect(byId.get('a')!.camelotKey).toBe('8A');
    expect(byId.get('d')!.bpm).toBeNull();
    expect(byId.get('d')!.camelotKey).toBeNull();
  });

  it('dedups with precedence seed > library > discovery', () => {
    const pool = buildPool([cand('x'), cand('y')], [cand('x')], [disc('y'), disc('z')]);
    expect(pool.filter((p) => p.trackId === 'x')).toHaveLength(1);
    expect(pool.find((p) => p.trackId === 'x')!.source).toBe('seed');
    const y = pool.find((p) => p.trackId === 'y')!;
    expect(y.source).toBe('library');
    expect(y.score).toBe(0.5);
    expect(y.discoveryReason).toBe('similar to seed');
    expect(pool.find((p) => p.trackId === 'z')!.source).toBe('discovery');
  });

  it('discovered tracks carry null score and their reason', () => {
    const pool = buildPool([], [], [disc('d')]);
    expect(pool[0].score).toBeNull();
    expect(pool[0].discoveryReason).toBe('similar to seed');
  });
});
