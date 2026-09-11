import { NextResponse } from 'next/server';
import { db } from '@/db';
import { playHistory, tracks, audioFeatures } from '@/db/schema';
import { desc, and, gte, lte, eq, count } from 'drizzle-orm';
import { fetchArtistsByTrack } from '@/lib/stats/attachArtists';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const limit = parseInt(searchParams.get('limit') || '100');

    /*
     * Response shape.
     *
     * One endpoint serves five consumers and used to send the heaviest shape
     * to all of them: every play row with nested track and audio features.
     * Over a 365-day window that is ~5.6MB, and two of the consumers needed a
     * play count and a timestamp. `fields` lets a caller ask for what it uses.
     *
     *   count    row count only, no rows at all
     *   minimal  playedAt, duration and popularity — enough to aggregate
     *   full     everything (default, so existing callers are unaffected)
     */
    const fields = searchParams.get('fields') ?? 'full';

    // Build base query
    let conditions = [];

    // Add date filters if provided
    if (startDate) {
      conditions.push(gte(playHistory.playedAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(playHistory.playedAt, new Date(endDate)));
    }

    if (fields === 'count') {
      const [row] = conditions.length > 0
        ? await db.select({ value: count() }).from(playHistory).where(and(...conditions))
        : await db.select({ value: count() }).from(playHistory);

      return NextResponse.json({ success: true, count: row?.value ?? 0, data: [] });
    }

    if (fields === 'minimal') {
      const minimalQuery = db
        .select({
          playedAt: playHistory.playedAt,
          track: {
            popularity: tracks.popularity,
            durationMs: tracks.durationMs,
          },
        })
        .from(playHistory)
        .innerJoin(tracks, eq(playHistory.trackId, tracks.id))
        .orderBy(desc(playHistory.playedAt))
        .limit(limit);

      const rows = conditions.length > 0
        ? await minimalQuery.where(and(...conditions))
        : await minimalQuery;

      return NextResponse.json({ success: true, count: rows.length, data: rows });
    }

    // Query play history with track details, audio features, and artists
    const query = db
      .select({
        id: playHistory.id,
        playedAt: playHistory.playedAt,
        contextType: playHistory.contextType,
        track: {
          id: tracks.id,
          spotifyTrackId: tracks.spotifyTrackId,
          name: tracks.trackName,
          albumName: tracks.albumName,
          albumImage: tracks.albumImageUrl,
          popularity: tracks.popularity,
          durationMs: tracks.durationMs,
        },
        audioFeatures: {
          energy: audioFeatures.energy,
          danceability: audioFeatures.danceability,
          valence: audioFeatures.valence,
          tempo: audioFeatures.tempo,
          acousticness: audioFeatures.acousticness,
          instrumentalness: audioFeatures.instrumentalness,
          speechiness: audioFeatures.speechiness,
        },
      })
      .from(playHistory)
      .innerJoin(tracks, eq(playHistory.trackId, tracks.id))
      .leftJoin(audioFeatures, eq(tracks.id, audioFeatures.trackId))
      .orderBy(desc(playHistory.playedAt))
      .limit(limit);

    // Apply conditions if any
    const history = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    // Artists for every track in one query. This used to run a query per play
    // inside a .map(), which is where this endpoint's ~13s came from.
    const artistsByTrack = await fetchArtistsByTrack(history.map((p) => p.track.id));

    const historyWithArtists = history.map((play) => ({
      ...play,
      track: {
        ...play.track,
        artists: artistsByTrack.get(play.track.id) ?? [],
      },
    }));

    return NextResponse.json({
      success: true,
      count: historyWithArtists.length,
      data: historyWithArtists,
    });
  } catch (error: any) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch history',
      },
      { status: 500 }
    );
  }
}