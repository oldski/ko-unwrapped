import { NextResponse } from 'next/server';
import { db } from '@/db';
import { playHistory, tracks, artists, trackArtists } from '@/db/schema';
import { desc, count, sql, and, gte, lte, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build conditions for date filtering
    let conditions = [];
    if (startDate) {
      conditions.push(gte(playHistory.playedAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(playHistory.playedAt, new Date(endDate)));
    }

    // Query top tracks by play count
    const topTracksQuery = db
      .select({
        trackId: tracks.id,
        spotifyTrackId: tracks.spotifyTrackId,
        trackName: tracks.trackName,
        albumName: tracks.albumName,
        albumImage: tracks.albumImageUrl,
        popularity: tracks.popularity,
        durationMs: tracks.durationMs,
        playCount: count(playHistory.id).as('play_count'),
      })
      .from(playHistory)
      .innerJoin(tracks, eq(playHistory.trackId, tracks.id))
      .groupBy(
        tracks.id,
        tracks.spotifyTrackId,
        tracks.trackName,
        tracks.albumName,
        tracks.albumImageUrl,
        tracks.popularity,
        tracks.durationMs
      )
      .orderBy(desc(sql`play_count`))
      .limit(limit);

    // Apply date filters if provided
    const topTracks = conditions.length > 0
      ? await topTracksQuery.where(and(...conditions))
      : await topTracksQuery;

    // For each track, get the artists
    const topTracksWithArtists = await Promise.all(
      topTracks.map(async (track) => {
        const trackArtistsData = await db
          .select({
            artistId: artists.id,
            artistName: artists.artistName,
            spotifyArtistId: artists.spotifyArtistId,
          })
          .from(trackArtists)
          .innerJoin(artists, eq(trackArtists.artistId, artists.id))
          .where(eq(trackArtists.trackId, track.trackId));

        return {
          ...track,
          artists: trackArtistsData.map((a) => ({
            id: a.artistId,
            name: a.artistName,
            spotifyArtistId: a.spotifyArtistId,
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: topTracksWithArtists.length,
      data: topTracksWithArtists,
    });
  } catch (error: any) {
    console.error('Error fetching top tracks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch top tracks',
      },
      { status: 500 }
    );
  }
}