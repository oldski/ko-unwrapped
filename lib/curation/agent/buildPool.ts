import type { CandidateTrack } from '@/lib/curation/candidateScorer';
import { energyFromTags } from '@/lib/curation/energy';
import type { PoolTrack } from './types';

export interface DiscoveredCandidate {
  trackId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  durationMs: number;
  popularity: number | null;
  albumImageUrl: string | null;
  tags: string[];
  reason: string;
}

function fromCandidate(c: CandidateTrack, source: 'library' | 'seed'): PoolTrack {
  return {
    trackId: c.trackId,
    spotifyTrackId: c.spotifyTrackId,
    trackName: c.trackName,
    artistNames: c.artistNames,
    durationMs: c.durationMs,
    popularity: c.popularity,
    albumImageUrl: c.albumImageUrl,
    tags: c.tags,
    energy: energyFromTags(c.tags),
    score: c.score,
    source,
  };
}

/** Merge candidate lanes into one labeled pool. Precedence: seed > library > discovery. */
export function buildPool(
  library: CandidateTrack[],
  seeds: CandidateTrack[],
  discovered: DiscoveredCandidate[]
): PoolTrack[] {
  const byId = new Map<string, PoolTrack>();

  for (const d of discovered) {
    byId.set(d.trackId, {
      trackId: d.trackId,
      spotifyTrackId: d.spotifyTrackId,
      trackName: d.trackName,
      artistNames: d.artistNames,
      durationMs: d.durationMs,
      popularity: d.popularity,
      albumImageUrl: d.albumImageUrl,
      tags: d.tags,
      energy: energyFromTags(d.tags),
      score: null,
      source: 'discovery',
      discoveryReason: d.reason,
    });
  }
  for (const c of library) {
    const existing = byId.get(c.trackId);
    byId.set(c.trackId, {
      ...fromCandidate(c, 'library'),
      ...(existing?.discoveryReason ? { discoveryReason: existing.discoveryReason } : {}),
    });
  }
  for (const s of seeds) {
    const existing = byId.get(s.trackId);
    byId.set(s.trackId, {
      ...fromCandidate(s, 'seed'),
      ...(existing?.discoveryReason ? { discoveryReason: existing.discoveryReason } : {}),
    });
  }

  return [...byId.values()];
}
