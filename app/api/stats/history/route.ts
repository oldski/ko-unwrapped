import { NextResponse } from 'next/server';
import { db } from '@/db';
import { playHistory, tracks, audioFeatures } from '@/db/schema';
import { desc, and, gte, lte, eq } from 'drizzle-orm';
import { fetchArtistsByTrack } from '@/lib/stats/attachArtists';

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