import { NextResponse } from 'next/server';
import { db } from '@/db';
import { playHistory, tracks, artists, trackArtists } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthDay = searchParams.get('monthDay'); // Format: "MM-DD" e.g., "11-07"

    if (!monthDay) {
      return NextResponse.json(
        {
          success: false,
          error: 'monthDay parameter is required (format: MM-DD)',
        },
        { status: 400 }
      );
    }

    // Parse month and day
    const [month, day] = monthDay.split('-').map(Number);

    if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid monthDay format. Use MM-DD (e.g., 11-07)',
        },
        { status: 400 }
      );
    }

    // Query plays that occurred on this month/day in any year
    // Using SQL to extract month and day from timestamp
    const plays = await db
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
        },
      })
      .from(playHistory)
      .innerJoin(tracks, eq(playHistory.trackId, tracks.id))
      .where(
        sql`EXTRACT(MONTH FROM ${playHistory.playedAt}) = ${month} AND EXTRACT(DAY FROM ${playHistory.playedAt}) = ${day}`
      )
      .orderBy(desc(playHistory.playedAt))
      .limit(50); // Limit to 50 to avoid too much data

    // For each play, get the artists
    const playsWithArtists = await Promise.all(
      plays.map(async (play) => {
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

    // Group by year for better organization
    const groupedByYear = playsWithArtists.reduce((acc, play) => {
      const year = new Date(play.playedAt).getFullYear();
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(play);
      return acc;
    }, {} as Record<number, typeof playsWithArtists>);

    return NextResponse.json({
      success: true,
      monthDay,
      totalPlays: playsWithArtists.length,
      years: Object.keys(groupedByYear).map(Number).sort((a, b) => b - a),
      data: playsWithArtists,
      groupedByYear,
    });
  } catch (error: any) {
    console.error('Error fetching on this day:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch on this day data',
      },
      { status: 500 }
    );
  }
}