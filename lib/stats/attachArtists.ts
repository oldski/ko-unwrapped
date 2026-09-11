import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { artists, trackArtists } from '@/db/schema';

/**
 * Attach artists to a set of rows in one query.
 *
 * Replaces a per-row lookup. Fetching artists inside a `.map()` issued one
 * query per play: 1,140 plays for a 30-day window, around 14,000 for the
 * 365-day calendar. Measured at ~2.5s for 200 plays, extrapolating to ~14s,
 * which matched the endpoint's production time. Batched, the same data takes
 * ~240ms regardless of how many plays reference those tracks.
 */

export interface TrackArtist {
  id: string;
  name: string;
  spotifyArtistId: string;
}

/** Fetch every artist for the given tracks, keyed by track id. */
export async function fetchArtistsByTrack(
  trackIds: string[],
): Promise<Map<string, TrackArtist[]>> {
  const byTrack = new Map<string, TrackArtist[]>();
  const unique = [...new Set(trackIds)];
  if (unique.length === 0) return byTrack;

  const rows = await db
    .select({
      trackId: trackArtists.trackId,
      artistId: artists.id,
      artistName: artists.artistName,
      spotifyArtistId: artists.spotifyArtistId,
    })
    .from(trackArtists)
    .innerJoin(artists, eq(trackArtists.artistId, artists.id))
    .where(inArray(trackArtists.trackId, unique));

  for (const row of rows) {
    const list = byTrack.get(row.trackId);
    const artist = {
      id: row.artistId,
      name: row.artistName,
      spotifyArtistId: row.spotifyArtistId,
    };
    if (list) list.push(artist);
    else byTrack.set(row.trackId, [artist]);
  }

  return byTrack;
}
