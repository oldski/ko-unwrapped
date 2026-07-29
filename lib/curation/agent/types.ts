import type { CandidateTrack } from '@/lib/curation/candidateScorer';

export type Preset = 'familiar' | 'balanced' | 'adventurous';

export const DISCOVERY_RATIO: Record<Preset, number> = {
  familiar: 0,
  balanced: 0.3,
  adventurous: 0.6,
};

export interface PoolTrack {
  trackId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  durationMs: number;
  popularity: number | null;
  albumImageUrl: string | null;
  bpm: number | null;
  camelotKey: string | null;
  tags: string[];
  energy: number;
  score: number | null;           // null for discovered tracks (no play-history signals)
  source: 'library' | 'seed' | 'discovery';
  discoveryReason?: string;       // proposer/Last.fm justification
}

export interface DirectorSet {
  trackIds: string[];             // ordered
  placementNotes: Record<string, string>; // trackId -> note
  transitions: { fromIndex: number; note: string }[];
  narrative: string;
}

export interface AgentTrack extends Omit<PoolTrack, 'source'> {
  source: 'library' | 'discovery';
  placementNote: string;
  reasons: string[];
}

export interface AgentGenerateResult {
  mode: 'agent' | 'fallback';
  tracks: AgentTrack[];
  transitions: { fromIndex: number; note: string }[];
  narrative: string;
  totalDurationMs: number;
  meta: {
    poolSize: number;
    discoveredCount: number;
    fallbackReason?: string;
  };
}
