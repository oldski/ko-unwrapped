export interface TrackHit {
  trackId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  durationMs: number;
  albumImageUrl: string | null;
  popularity: number | null;
  plays: number;
}

export interface SetTrack {
  trackId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  durationMs: number;
  popularity: number | null;
  albumImageUrl: string | null;
  tags: string[];
  score: number | null;
  reasons: string[];
  energy: number;
  source: 'library' | 'discovery';
  placementNote: string;
}

export interface Transition {
  fromIndex: number;
  note: string;
}

export type Preset = 'familiar' | 'balanced' | 'adventurous';

export interface Filters {
  durationMinMinutes: number;
  durationMaxMinutes: number;
  popularityMin: number;
  popularityMax: number;
  genreAllow: string[];
  genreDeny: string[];
}

export const DEFAULT_FILTERS: Filters = {
  durationMinMinutes: 45,
  durationMaxMinutes: 60,
  popularityMin: 0,
  popularityMax: 100,
  genreAllow: [],
  genreDeny: [],
};
