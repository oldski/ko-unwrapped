import { describe, it, expect } from 'vitest';
import { toCamelot } from '@/lib/curation/mix/camelot';

describe('toCamelot', () => {
  it('maps majors onto the B wheel', () => {
    expect(toCamelot('C')).toBe('8B');
    expect(toCamelot('G')).toBe('9B');
    expect(toCamelot('B')).toBe('1B');
    expect(toCamelot('F')).toBe('7B');
  });

  it('maps minors onto the A wheel', () => {
    expect(toCamelot('Am')).toBe('8A');
    expect(toCamelot('Em')).toBe('9A');
    expect(toCamelot('F#m')).toBe('11A');
    expect(toCamelot('Abm')).toBe('1A');
  });

  it('handles enharmonic equivalents', () => {
    expect(toCamelot('Gb')).toBe('2B');
    expect(toCamelot('F#')).toBe('2B');
    expect(toCamelot('C#m')).toBe('12A');
    expect(toCamelot('Dbm')).toBe('12A');
  });

  it('handles unicode accidentals and verbose minor suffixes', () => {
    expect(toCamelot('F♯m')).toBe('11A');
    expect(toCamelot('B♭')).toBe('6B');
    expect(toCamelot('A minor')).toBe('8A');
    expect(toCamelot('a min')).toBe('8A');
  });

  it('returns null for garbage', () => {
    expect(toCamelot('')).toBeNull();
    expect(toCamelot('H#')).toBeNull();
    expect(toCamelot('123')).toBeNull();
  });
});
