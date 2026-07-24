// Closed vocabulary of vibe tags. Used both as the LLM tagging label set
// and as the tag space for filter/match scoring in the candidate ranker.
// Keep this tight - tag sprawl makes Jaccard overlap meaningless and makes
// the LLM output harder to constrain.

export const VIBE_TAGS = [
  // Time-of-day / part-of-day
  'early-morning',
  'sunday-morning',
  'morning',
  'afternoon',
  'golden-hour',
  'evening',
  'late-night',
  'after-hours',

  // Setting / context
  'driving',
  'commute',
  'workout',
  'running',
  'study',
  'work-focus',
  'dinner-party',
  'cocktail-hour',
  'house-party',
  'pre-game',
  'beach',
  'pool',
  'road-trip',
  'kitchen',
  'background-listening',

  // Season / weather
  'summer',
  'winter',
  'fall',
  'spring',
  'rainy-day',
  'snow-day',
  'heatwave',
  'cold-weather',

  // Emotional register
  'euphoric',
  'melancholic',
  'wistful',
  'tender',
  'angry',
  'anxious',
  'hopeful',
  'romantic',
  'lonely',
  'nostalgic',
  'cathartic',
  'contemplative',
  'playful',
  'sensual',

  // Energy / intensity
  'high-energy',
  'mid-tempo',
  'low-energy',
  'slow-burn',
  'pulsing',
  'frenetic',
  'meditative',

  // Sonic palette
  'lo-fi',
  'hi-fi',
  'cinematic',
  'orchestral',
  'acoustic',
  'electronic',
  'analog-warmth',
  'digital-cold',
  'fuzzy',
  'clean',
  'sparse',
  'dense',
  'experimental',

  // Genre-ish / scene
  'dancefloor',
  'club',
  'indie-rock',
  'singer-songwriter',
  'r-n-b',
  'soul',
  'hip-hop',
  'shoegaze',
  'dream-pop',
  'ambient',
  'jazz',
  'folk',
  'punk',
  'metal',
  'country',
  'classical',
  'world',

  // Era cues
  'retro-80s',
  'retro-90s',
  'retro-2000s',
  'contemporary',
  'vintage',
] as const;

export type VibeTag = (typeof VIBE_TAGS)[number];

const VIBE_TAG_SET = new Set<string>(VIBE_TAGS);

export function isVibeTag(value: string): value is VibeTag {
  return VIBE_TAG_SET.has(value);
}
