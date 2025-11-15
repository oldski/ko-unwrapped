/**
 * Mock Audio Features Generator
 *
 * Generates plausible audio features based on available track metadata
 * since Spotify's Extended Quota Mode is only available to organizations.
 *
 * Strategy:
 * - Uses track characteristics (popularity, duration, etc.) to infer likely features
 * - Seeded randomization ensures consistency per track
 * - Correlates features realistically (e.g., popular tracks tend to be more energetic)
 */

interface TrackMetadata {
  trackId: string;
  popularity?: number;
  durationMs?: number;
  trackName?: string;
  artistName?: string;
}

interface AudioFeatures {
  tempo: number;
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  loudness: number;
  key: number;
  mode: number;
  time_signature: number;
}

/**
 * Simple seeded pseudo-random number generator
 * Returns consistent values for the same seed
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate a seeded random number in a range
 */
function seededRandomRange(seed: string, min: number, max: number): number {
  return min + seededRandom(seed) * (max - min);
}

/**
 * Normalize popularity to 0-1 range (Spotify popularity is 0-100)
 */
function normalizePopularity(popularity?: number): number {
  if (popularity === undefined || popularity === null) return 0.5;
  return Math.max(0, Math.min(1, popularity / 100));
}

/**
 * Infer genre tendencies from track/artist name (basic heuristics)
 */
function inferGenreTendencies(trackName?: string, artistName?: string): {
  isElectronic: boolean;
  isAcoustic: boolean;
  isHipHop: boolean;
  isClassical: boolean;
} {
  const combined = `${trackName || ''} ${artistName || ''}`.toLowerCase();

  return {
    isElectronic: /edm|electronic|techno|house|dubstep|synth/i.test(combined),
    isAcoustic: /acoustic|unplugged|live|piano|guitar/i.test(combined),
    isHipHop: /rap|hip hop|trap|drill/i.test(combined),
    isClassical: /symphony|concerto|sonata|classical|orchestra/i.test(combined),
  };
}

/**
 * Generate mock audio features based on track metadata
 */
export function generateMockAudioFeatures(metadata: TrackMetadata): AudioFeatures {
  const { trackId, popularity, durationMs, trackName, artistName } = metadata;

  // Normalize inputs
  const normalizedPopularity = normalizePopularity(popularity);
  const durationMinutes = (durationMs || 180000) / 60000; // Default ~3 min
  const genre = inferGenreTendencies(trackName, artistName);

  // Create seeds for different features (ensures variety but consistency)
  const tempoSeed = `${trackId}-tempo`;
  const energySeed = `${trackId}-energy`;
  const danceabilitySeed = `${trackId}-danceability`;
  const valenceSeed = `${trackId}-valence`;
  const acousticnessSeed = `${trackId}-acousticness`;
  const instrumentalnessSeed = `${trackId}-instrumentalness`;
  const speechinessSeed = `${trackId}-speechiness`;

  // TEMPO (BPM): 60-180, weighted by genre and popularity
  let tempoMin = 90;
  let tempoMax = 140;

  if (genre.isElectronic) {
    tempoMin = 120;
    tempoMax = 180;
  } else if (genre.isClassical) {
    tempoMin = 60;
    tempoMax = 120;
  } else if (genre.isHipHop) {
    tempoMin = 80;
    tempoMax = 100;
  }

  // Popular tracks tend to be mid-tempo (danceable)
  const popularityTempoAdjustment = normalizedPopularity * 20 - 10;
  const tempo = Math.round(
    seededRandomRange(tempoSeed, tempoMin, tempoMax) + popularityTempoAdjustment
  );

  // ENERGY: 0.1-0.95, correlated with popularity and genre
  let energyBase = normalizedPopularity * 0.4 + 0.3; // Popular = more energetic
  if (genre.isElectronic) energyBase += 0.2;
  if (genre.isAcoustic) energyBase -= 0.2;
  if (genre.isClassical) energyBase -= 0.15;

  const energy = Math.max(0.1, Math.min(0.95,
    energyBase + seededRandomRange(energySeed, -0.15, 0.15)
  ));

  // DANCEABILITY: 0.2-0.95, strongly correlated with popularity
  let danceabilityBase = normalizedPopularity * 0.5 + 0.25;
  if (genre.isElectronic || genre.isHipHop) danceabilityBase += 0.15;
  if (genre.isClassical) danceabilityBase -= 0.3;

  const danceability = Math.max(0.2, Math.min(0.95,
    danceabilityBase + seededRandomRange(danceabilitySeed, -0.15, 0.15)
  ));

  // VALENCE (mood): 0.05-0.95, more random but influenced by energy
  const valence = Math.max(0.05, Math.min(0.95,
    energy * 0.4 + seededRandomRange(valenceSeed, 0, 0.6)
  ));

  // ACOUSTICNESS: 0.0-0.9, inverse correlation with popularity and electronic
  let acousticnessBase = (1 - normalizedPopularity) * 0.4 + 0.1;
  if (genre.isAcoustic) acousticnessBase += 0.4;
  if (genre.isElectronic) acousticnessBase -= 0.3;

  const acousticness = Math.max(0.0, Math.min(0.9,
    acousticnessBase + seededRandomRange(acousticnessSeed, -0.2, 0.2)
  ));

  // INSTRUMENTALNESS: 0.0-0.6, mostly low, higher for longer tracks and classical
  let instrumentalnessBase = 0.05;
  if (durationMinutes > 5) instrumentalnessBase += 0.15;
  if (genre.isClassical) instrumentalnessBase += 0.4;
  if (genre.isElectronic) instrumentalnessBase += 0.1;

  const instrumentalness = Math.max(0.0, Math.min(0.6,
    instrumentalnessBase + seededRandomRange(instrumentalnessSeed, -0.05, 0.15)
  ));

  // SPEECHINESS: 0.03-0.4, higher for hip-hop
  let speechinessBase = 0.06;
  if (genre.isHipHop) speechinessBase += 0.25;

  const speechiness = Math.max(0.03, Math.min(0.4,
    speechinessBase + seededRandomRange(speechinessSeed, -0.03, 0.1)
  ));

  // LOUDNESS: -20 to -3 dB, correlated with energy
  const loudness = -20 + (energy * 17);

  // KEY: 0-11 (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
  const key = Math.floor(seededRandomRange(`${trackId}-key`, 0, 12));

  // MODE: 0 (minor) or 1 (major), slightly correlated with valence
  const mode = valence > 0.5 ? 1 : 0;

  // TIME_SIGNATURE: 3, 4, 5, 6, or 7 (4/4 is most common)
  const timeSignatureSeed = seededRandom(`${trackId}-time`);
  let time_signature = 4;
  if (timeSignatureSeed > 0.95) time_signature = 3;
  else if (timeSignatureSeed > 0.90) time_signature = 5;
  else if (timeSignatureSeed > 0.85) time_signature = 6;

  return {
    tempo: Math.round(tempo),
    energy: Math.round(energy * 100) / 100,
    danceability: Math.round(danceability * 100) / 100,
    valence: Math.round(valence * 100) / 100,
    acousticness: Math.round(acousticness * 100) / 100,
    instrumentalness: Math.round(instrumentalness * 100) / 100,
    speechiness: Math.round(speechiness * 100) / 100,
    loudness: Math.round(loudness * 10) / 10,
    key,
    mode,
    time_signature,
  };
}

/**
 * Helper function to use either real or mock audio features
 */
export function getAudioFeaturesOrMock(
  realFeatures: any | null,
  trackMetadata: TrackMetadata
): AudioFeatures {
  // If real features are available and valid, use them
  if (realFeatures && realFeatures.tempo) {
    return realFeatures;
  }

  // Otherwise, generate mock features
  return generateMockAudioFeatures(trackMetadata);
}
