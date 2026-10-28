import { describe, it, expect } from 'vitest';
import { cleanSetTitle, titleFromTags, MAX_TITLE_LENGTH } from '@/lib/curation/setTitle';

describe('cleanSetTitle', () => {
  it('keeps a clean title as-is, lowercase included', () => {
    expect(cleanSetTitle('wistful synthwave rainy tuesday night')).toBe('wistful synthwave rainy tuesday night');
  });

  it('trims whitespace and strips wrapping quotes', () => {
    expect(cleanSetTitle('  "neon rain drive"  ')).toBe('neon rain drive');
    expect(cleanSetTitle('“neon rain drive”')).toBe('neon rain drive');
  });

  it('collapses inner whitespace and newlines', () => {
    expect(cleanSetTitle('neon\n  rain   drive')).toBe('neon rain drive');
  });

  it('caps long titles at a word boundary', () => {
    const long = 'slow burning sunrise over the empty harbor while everyone else is still asleep somewhere far';
    const out = cleanSetTitle(long);
    expect(out.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(long.startsWith(out)).toBe(true);
    expect(out.endsWith(' ')).toBe(false);
  });

  it('returns empty for non-strings and blanks', () => {
    expect(cleanSetTitle(undefined)).toBe('');
    expect(cleanSetTitle(42)).toBe('');
    expect(cleanSetTitle('   ""  ')).toBe('');
  });
});

describe('titleFromTags', () => {
  // A Tuesday, 9:30pm local.
  const tuesdayNight = new Date(2026, 9, 27, 21, 30);

  it('stacks the two most common tags with the day and time', () => {
    const tracks = [
      { tags: ['hypnotic', 'driving'] },
      { tags: ['hypnotic', 'summer'] },
      { tags: ['driving', 'hypnotic'] },
    ];
    expect(titleFromTags(tracks, tuesdayNight)).toBe('hypnotic driving tuesday night');
  });

  it('breaks ties by first appearance in the set', () => {
    const tracks = [{ tags: ['dreamy'] }, { tags: ['rainy-day'] }, { tags: ['summer'] }];
    expect(titleFromTags(tracks, tuesdayNight)).toBe('dreamy rainy day tuesday night');
  });

  it('skips the time of day when a tag already names one', () => {
    const tracks = [{ tags: ['late-night', 'hypnotic'] }, { tags: ['late-night'] }];
    expect(titleFromTags(tracks, tuesdayNight)).toBe('late night hypnotic tuesday');
  });

  it('names the part of day from the hour', () => {
    const tracks = [{ tags: ['dreamy'] }];
    expect(titleFromTags(tracks, new Date(2026, 9, 27, 8, 0))).toBe('dreamy tuesday morning');
    expect(titleFromTags(tracks, new Date(2026, 9, 27, 14, 0))).toBe('dreamy tuesday afternoon');
    expect(titleFromTags(tracks, new Date(2026, 9, 27, 18, 0))).toBe('dreamy tuesday evening');
  });

  it('returns empty when no track has tags', () => {
    expect(titleFromTags([{ tags: [] }, { tags: [] }], tuesdayNight)).toBe('');
    expect(titleFromTags([], tuesdayNight)).toBe('');
  });
});
