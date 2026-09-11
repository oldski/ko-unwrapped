import { describe, it, expect, beforeAll } from 'vitest';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * Guards the batched artist lookup that replaced a per-play query.
 *
 * Skipped when DATABASE_URL is absent, so CI without database access still
 * passes rather than failing for the wrong reason.
 */
const hasDb = !!process.env.DATABASE_URL;
const maybe = hasDb ? describe : describe.skip;

maybe('fetchArtistsByTrack', () => {
  let db: typeof import('@/db')['db'];
  let schema: typeof import('@/db/schema');
  let drizzle: typeof import('drizzle-orm');
  let fetchArtistsByTrack: typeof import('@/lib/stats/attachArtists')['fetchArtistsByTrack'];

  beforeAll(async () => {
    ({ db } = await import('@/db'));
    schema = await import('@/db/schema');
    drizzle = await import('drizzle-orm');
    ({ fetchArtistsByTrack } = await import('@/lib/stats/attachArtists'));
  });

  it('returns an empty map for no tracks, without querying', async () => {
    const result = await fetchArtistsByTrack([]);
    expect(result.size).toBe(0);
  });

  it('matches what per-track lookups return', async () => {
    const { tracks, artists, trackArtists } = schema;
    const { eq } = drizzle;

    const sample = await db.select({ id: tracks.id }).from(tracks).limit(25);
    expect(sample.length).toBeGreaterThan(0);

    const batched = await fetchArtistsByTrack(sample.map((t) => t.id));

    for (const { id } of sample) {
      const perTrack = await db
        .select({ artistId: artists.id, artistName: artists.artistName })
        .from(trackArtists)
        .innerJoin(artists, eq(trackArtists.artistId, artists.id))
        .where(eq(trackArtists.trackId, id));

      const expected = perTrack.map((a) => a.artistId).sort();
      const actual = (batched.get(id) ?? []).map((a) => a.id).sort();
      expect(actual, `track ${id}`).toEqual(expected);
    }
  }, 120_000);

  it('deduplicates repeated track ids', async () => {
    const { tracks } = schema;
    const [track] = await db.select({ id: tracks.id }).from(tracks).limit(1);
    const result = await fetchArtistsByTrack([track.id, track.id, track.id]);
    expect(result.size).toBeLessThanOrEqual(1);
  }, 60_000);
});
