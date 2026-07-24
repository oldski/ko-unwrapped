import { db } from '@/db';
import { artists, artistGenres } from '@/db/schema';
import { getArtists } from '@/lib/spotify';
import { eq, sql, lt, isNull, or } from 'drizzle-orm';

const SPOTIFY_BATCH_SIZE = 50;
const STALE_AFTER_DAYS = 90;

export interface EnrichArtistGenresResult {
  artistsProcessed: number;
  artistsUpdated: number;
  totalGenresFound: number;
  errors: string[];
}

/**
 * Fetches artist genres from Spotify /v1/artists for any artist in our DB that:
 *  - has no row in artist_genres, OR
 *  - has fetched_at older than STALE_AFTER_DAYS days.
 *
 * Upserts (artistId, genres, fetchedAt) into artist_genres. Idempotent.
 */
export async function enrichArtistGenres(): Promise<EnrichArtistGenresResult> {
  const staleThreshold = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      artistId: artists.id,
      spotifyArtistId: artists.spotifyArtistId,
      fetchedAt: artistGenres.fetchedAt,
    })
    .from(artists)
    .leftJoin(artistGenres, eq(artistGenres.artistId, artists.id))
    .where(or(isNull(artistGenres.fetchedAt), lt(artistGenres.fetchedAt, staleThreshold)));

  if (!rows.length) {
    return { artistsProcessed: 0, artistsUpdated: 0, totalGenresFound: 0, errors: [] };
  }

  console.log(`🎨 Enriching genres for ${rows.length} artists...`);

  const errors: string[] = [];
  let artistsUpdated = 0;
  let totalGenresFound = 0;

  for (let i = 0; i < rows.length; i += SPOTIFY_BATCH_SIZE) {
    const batch = rows.slice(i, i + SPOTIFY_BATCH_SIZE);
    const spotifyIds = batch.map((r) => r.spotifyArtistId);

    try {
      const response = await getArtists(spotifyIds);
      const spotifyToGenres = new Map<string, string[]>();
      for (const a of response.artists) {
        spotifyToGenres.set(a.id, a.genres ?? []);
      }

      for (const row of batch) {
        const genres = spotifyToGenres.get(row.spotifyArtistId) ?? [];
        await db
          .insert(artistGenres)
          .values({ artistId: row.artistId, genres, fetchedAt: new Date() })
          .onConflictDoUpdate({
            target: artistGenres.artistId,
            set: { genres, fetchedAt: new Date() },
          });
        artistsUpdated++;
        totalGenresFound += genres.length;
      }
    } catch (err: any) {
      const msg = `Batch ${i / SPOTIFY_BATCH_SIZE} failed: ${err?.message ?? String(err)}`;
      console.error(`❌ ${msg}`);
      errors.push(msg);
    }
  }

  console.log(`✅ Artist genres: ${artistsUpdated}/${rows.length} updated, ${totalGenresFound} genre links`);

  return {
    artistsProcessed: rows.length,
    artistsUpdated,
    totalGenresFound,
    errors,
  };
}
