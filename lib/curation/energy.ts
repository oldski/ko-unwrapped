// Maps vibe tags (see vibeVocabulary.ts) to a 0-1 energy estimate.
// v1 of mix-awareness: replaced/augmented by real BPM/key enrichment later
// behind this same function signature.

export const DEFAULT_ENERGY = 0.5;

const ENERGY_BY_TAG: Record<string, number> = {
  // energy / intensity
  'high-energy': 0.95,
  frenetic: 0.95,
  pulsing: 0.85,
  'mid-tempo': 0.5,
  'slow-burn': 0.3,
  'low-energy': 0.15,
  meditative: 0.1,
  // scene / setting
  dancefloor: 0.85,
  club: 0.8,
  'house-party': 0.8,
  'pre-game': 0.75,
  workout: 0.85,
  running: 0.8,
  driving: 0.55,
  'road-trip': 0.55,
  study: 0.25,
  'work-focus': 0.3,
  'background-listening': 0.25,
  'cocktail-hour': 0.45,
  'dinner-party': 0.4,
  // emotional register
  euphoric: 0.8,
  cathartic: 0.65,
  playful: 0.6,
  hopeful: 0.55,
  sensual: 0.4,
  romantic: 0.35,
  tender: 0.25,
  contemplative: 0.2,
  melancholic: 0.3,
  wistful: 0.3,
  lonely: 0.25,
  // sonic palette / genre-ish
  punk: 0.8,
  metal: 0.85,
  'hip-hop': 0.65,
  electronic: 0.6,
  'indie-rock': 0.6,
  'r-n-b': 0.5,
  soul: 0.45,
  jazz: 0.4,
  'dream-pop': 0.4,
  shoegaze: 0.5,
  cinematic: 0.45,
  orchestral: 0.4,
  classical: 0.3,
  folk: 0.35,
  'singer-songwriter': 0.35,
  acoustic: 0.3,
  ambient: 0.1,
  sparse: 0.25,
  // time of day
  'late-night': 0.4,
  'after-hours': 0.35,
};

export function energyFromTags(tags: string[]): number {
  const mapped = tags
    .map((t) => ENERGY_BY_TAG[t])
    .filter((v): v is number => v !== undefined);
  if (mapped.length === 0) return DEFAULT_ENERGY;
  const avg = mapped.reduce((s, v) => s + v, 0) / mapped.length;
  return Math.max(0, Math.min(1, avg));
}
