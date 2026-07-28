import { describe, it, expect } from 'vitest';
import { parseGetSongBpm, parseDeezerTrack, buildGsbLookup } from '@/lib/curation/mix/sources';

const gsbFixture = {
  search: [
    {
      song_title: 'Near Light',
      tempo: '122',
      key_of: 'F♯m',
      artist: { name: 'Ólafur Arnalds' },
    },
    { song_title: 'Other', tempo: '90', key_of: 'C', artist: { name: 'Somebody Else' } },
  ],
};

describe('parseGetSongBpm', () => {
  it('takes the first artist-matched result, folding diacritics', () => {
    const r = parseGetSongBpm(gsbFixture, 'Olafur Arnalds');
    expect(r).toEqual({ bpm: 122, camelotKey: '11A' });
  });

  it('rejects results whose artist does not match', () => {
    expect(parseGetSongBpm(gsbFixture, 'Röyksopp')).toBeNull();
  });

  it('handles the no-result error shape and garbage', () => {
    expect(parseGetSongBpm({ search: { error: 'no result' } }, 'X')).toBeNull();
    expect(parseGetSongBpm(null, 'X')).toBeNull();
  });

  it('null key and out-of-range bpm are dropped, not fatal', () => {
    const r = parseGetSongBpm(
      { search: [{ song_title: 'T', tempo: '300', key_of: '?', artist: { name: 'A' } }] },
      'A'
    );
    expect(r).toEqual({ bpm: null, camelotKey: null });
  });
});

describe('parseDeezerTrack', () => {
  it('extracts bpm and treats 0 as no data', () => {
    expect(parseDeezerTrack({ bpm: 124.5 })).toBe(124.5);
    expect(parseDeezerTrack({ bpm: 0 })).toBeNull();
    expect(parseDeezerTrack({})).toBeNull();
  });

  it('applies the sanity range', () => {
    expect(parseDeezerTrack({ bpm: 20 })).toBeNull();
    expect(parseDeezerTrack({ bpm: 500 })).toBeNull();
  });
});

describe('buildGsbLookup', () => {
  it('orders artist first, then song', () => {
    const result = buildGsbLookup('Artist', 'Track');
    expect(result).toBe('artist:Artist song:Track');
  });

  it('folds diacritics in artist and track names', () => {
    expect(buildGsbLookup('Röyksopp', 'Song')).toMatch(/^artist:Royksopp song:Song$/);
    expect(buildGsbLookup('Ólafur Arnalds', 'Near Light')).toMatch(/^artist:Olafur Arnalds song:Near Light$/);
  });

  it('strips punctuation from artist and track names', () => {
    expect(buildGsbLookup('Artist', 'What Else Is There?')).toMatch(/^artist:Artist song:What Else Is There$/);
    expect(buildGsbLookup('The Band & Co', 'Me&Youphoria')).toMatch(/^artist:The Band Co song:MeYouphoria$/);
  });

  it('collapses runs of whitespace to single spaces', () => {
    expect(buildGsbLookup('Artist  With  Spaces', 'Track  Name')).toMatch(/^artist:Artist With Spaces song:Track Name$/);
  });
});
