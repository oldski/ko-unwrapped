import { NextResponse } from 'next/server';
import { db } from '@/db';
import { playHistory, tracks, artists, trackArtists } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '12'); // Default last 12 months

    // Calculate start date (X months ago)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const startDateISO = startDate.toISOString();

    // Get all plays in the date range
    const plays = await db
      .select({
        playedAt: playHistory.playedAt,
        trackId: tracks.id,
        popularity: tracks.popularity,
        artistId: artists.id,
      })
      .from(playHistory)
      .innerJoin(tracks, eq(playHistory.trackId, tracks.id))
      .innerJoin(trackArtists, eq(trackArtists.trackId, tracks.id))
      .innerJoin(artists, eq(trackArtists.artistId, artists.id))
      .where(sql`${playHistory.playedAt} >= ${startDateISO}`)
      .orderBy(desc(playHistory.playedAt));

    // Group by month and calculate stats
    const monthlyStats = new Map<string, {
      month: string;
      totalPlays: number;
      avgPopularity: number;
      uniqueArtists: Set<string>;
      totalPopularity: number;
      totalListeningTime: number;
    }>();

    plays.forEach((play) => {
      const date = new Date(play.playedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyStats.has(monthKey)) {
        monthlyStats.set(monthKey, {
          month: monthKey,
          totalPlays: 0,
          avgPopularity: 0,
          uniqueArtists: new Set(),
          totalPopularity: 0,
          totalListeningTime: 0,
        });
      }

      const stats = monthlyStats.get(monthKey)!;
      stats.totalPlays++;
      stats.totalPopularity += play.popularity || 0;
      stats.uniqueArtists.add(play.artistId);
    });

    // Calculate averages and convert to array
    const trends = Array.from(monthlyStats.values()).map((stats) => ({
      month: stats.month,
      totalPlays: stats.totalPlays,
      avgPopularity: stats.totalPlays > 0
        ? Math.round(stats.totalPopularity / stats.totalPlays)
        : 0,
      uniqueArtists: stats.uniqueArtists.size,
    })).sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      success: true,
      count: trends.length,
      data: trends,
    });
  } catch (error: any) {
    console.error('Error fetching monthly trends:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch monthly trends',
      },
      { status: 500 }
    );
  }
}
