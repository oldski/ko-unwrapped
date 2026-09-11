import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

/**
 * Per-day play counts and average popularity.
 *
 * The calendar used to build this in the browser from `/api/stats/history`,
 * which returns raw play rows. That made `limit` a cap on *plays*, not on
 * *days*: a 365-day window holds ~14,500 plays, so `limit=10000` returned the
 * newest 10,000 and silently dropped everything before 2026-01-26. The
 * calendar looked like it only had data back to January.
 *
 * Grouping in the database removes the truncation entirely — one row per day,
 * so 366 rows regardless of how much was played — and drops the payload from
 * ~859KB to ~15KB.
 *
 * Dates are the UTC date of `played_at`, matching how the rest of the app
 * buckets plays.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(
      Math.max(parseInt(searchParams.get('days') || '365', 10) || 365, 1),
      1826,
    );

    const start = new Date();
    start.setUTCDate(start.getUTCDate() - days);

    const rows = await db.execute<{
      date: string;
      plays: number;
      avg_popularity: number;
      top_track: string | null;
    }>(sql`
      SELECT
        to_char(ph.played_at, 'YYYY-MM-DD') AS date,
        count(*)::int AS plays,
        round(avg(coalesce(t.popularity, 50)))::int AS avg_popularity,
        -- Last track played that day, for the calendar tooltip.
        (array_agg(t.track_name ORDER BY ph.played_at DESC))[1] AS top_track
      FROM play_history ph
      JOIN tracks t ON t.id = ph.track_id
      WHERE ph.played_at >= ${start.toISOString()}
      GROUP BY 1
      ORDER BY 1
    `);

    const data = Array.from(rows).map((row) => ({
      date: row.date,
      plays: Number(row.plays),
      avgPopularity: Number(row.avg_popularity),
      topTrack: row.top_track,
    }));

    return NextResponse.json({
      success: true,
      count: data.length,
      days,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching daily stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch daily stats' },
      { status: 500 },
    );
  }
}
