/*
 * Playlist names for curated sets.
 *
 * The director writes the name alongside the set, in a playful lowercase
 * style that stacks moods, a vibe and a day/time ("hypnotic driving tuesday
 * night"). When the director is unavailable, the name is built from the
 * set's own vibe tags in the same shape, so it still says something about
 * the set instead of falling back to a date.
 */

export const MAX_TITLE_LENGTH = 60;

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Tags that already say when the set is for; adding "night" after them repeats it.
const TIME_TAGS = new Set([
  'early-morning',
  'sunday-morning',
  'morning',
  'afternoon',
  'golden-hour',
  'evening',
  'late-night',
  'after-hours',
]);

/** Tidy a model-written title: one line, no wrapping quotes, capped at a word boundary. */
export function cleanSetTitle(value: unknown): string {
  if (typeof value !== 'string') return '';
  let title = value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim();
  if (title.length > MAX_TITLE_LENGTH) {
    const cut = title.slice(0, MAX_TITLE_LENGTH + 1);
    const lastSpace = cut.lastIndexOf(' ');
    title = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, MAX_TITLE_LENGTH)).trim();
  }
  return title;
}

function partOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/** Name a set from its two most common vibe tags plus the day and time it was made. */
export function titleFromTags(tracks: { tags: string[] }[], now: Date = new Date()): string {
  const counts = new Map<string, number>();
  for (const track of tracks) {
    for (const tag of track.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  if (counts.size === 0) return '';

  // Map keeps insertion order, and sort is stable, so ties go to the tag seen first.
  const top = [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([tag]) => tag);

  const words = [...top.map((tag) => tag.replace(/-/g, ' ')), WEEKDAYS[now.getDay()]];
  if (!top.some((tag) => TIME_TAGS.has(tag))) words.push(partOfDay(now.getHours()));
  return words.join(' ');
}
