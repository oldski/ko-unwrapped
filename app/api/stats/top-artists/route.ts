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

    // Query top artists by play count
    // This counts how many times tracks by each artist were played
    const topArtistsQuery = db
      .select({
        artistId: artists.id,
        spotifyArtistId: artists.spotifyArtistId,
        artistName: artists.artistName,
        playCount: count(playHistory.id).as('play_count'),
      })
      .from(playHistory)
      .innerJoin(tracks, eq(playHistory.trackId, tracks.id))
      .innerJoin(trackArtists, eq(trackArtists.trackId, tracks.id))
      .innerJoin(artists, eq(trackArtists.artistId, artists.id))
      .groupBy(artists.id, artists.spotifyArtistId, artists.artistName)
      .orderBy(desc(sql`play_count`))
      .limit(limit);

    // Apply date filters if provided
    const topArtists = conditions.length > 0
      ? await topArtistsQuery.where(and(...conditions))
      : await topArtistsQuery;

    return NextResponse.json({
      success: true,
      count: topArtists.length,
      data: topArtists,
    });
  } catch (error: any) {
    console.error('Error fetching top artists:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch top artists',
      },
      { status: 500 }
    );
  }
}
