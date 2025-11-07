import { NextResponse } from 'next/server';
import { db } from '@/db';
import { playHistory, tracks, artists, trackArtists } from '@/db/schema';
import { desc, and, gte, lte, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build base query
    let conditions = [];

    // Add date filters if provided
    if (startDate) {
      conditions.push(gte(playHistory.playedAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(playHistory.playedAt, new Date(endDate)));
    }

    // Query play history with track details and artists
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
      })
      .from(playHistory)
      .innerJoin(tracks, eq(playHistory.trackId, tracks.id))
      .orderBy(desc(playHistory.playedAt))
      .limit(limit);

    // Apply conditions if any
    const history = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    // For each play, get the artists
    const historyWithArtists = await Promise.all(
      history.map(async (play) => {
        const trackArtistsData = await db
          .select({
            artistId: artists.id,
            artistName: artists.artistName,
            spotifyArtistId: artists.spotifyArtistId,
          })
          .from(trackArtists)
          .innerJoin(artists, eq(trackArtists.artistId, artists.id))
          .where(eq(trackArtists.trackId, play.track.id));

        return {
          ...play,
          track: {
            ...play.track,
            artists: trackArtistsData.map((a) => ({
              id: a.artistId,
              name: a.artistName,
              spotifyArtistId: a.spotifyArtistId,
            })),
          },
        };
      })
    );

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