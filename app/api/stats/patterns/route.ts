import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

export const dynamic = 'force-dynamic';

/**
 * Listening patterns for a window: plays by weekday and hour, totals, top artists.
 *
 * The stats page used to build all of this in the browser from
 * `/api/stats/history?limit=2000`, which returns raw play rows newest-first.
 * That made `limit` a cap on *plays*, so every window holding more than 2,000
 * of them collapsed onto the same newest 2,000 rows: 3 months (3,640 plays),
 * 6 months (7,858) and a year (14,724) all reported identical totals, peak
 * hour and top artists. Same failure the calendar hit — see
 * `app/api/stats/daily/route.ts`.
 *
 * Grouping in the database removes the cap: 168 rows at most, whatever the
 * window holds.
 *
 * `tz` is an IANA zone from the browser. `played_at` is stored as UTC in a
 * naive timestamp column, so it is labelled UTC and converted, which keeps
 * "peak hour" meaning the hour the listener actually experienced — what the
 * old `date.getHours()` in the browser gave them.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const timezone = resolveTimezone(searchParams.get('tz'));

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const startFilter = start ? start.toISOString() : null;
    const endFilter = end ? end.toISOString() : null;

    const bucketRows = await db.execute<{
      dow: number;
      hour: number;
      plays: number;
      duration_ms: string;
    }>(sql`
      SELECT
        extract(dow FROM local_at)::int AS dow,
        extract(hour FROM local_at)::int AS hour,
        count(*)::int AS plays,
        coalesce(sum(duration_ms), 0)::bigint AS duration_ms
      FROM (
        SELECT
          (ph.played_at AT TIME ZONE 'UTC') AT TIME ZONE ${timezone} AS local_at,
          t.duration_ms
        FROM play_history ph
        JOIN tracks t ON t.id = ph.track_id
        WHERE (${startFilter}::timestamptz IS NULL OR ph.played_at >= ${startFilter}::timestamptz)
          AND (${endFilter}::timestamptz IS NULL OR ph.played_at <= ${endFilter}::timestamptz)
      ) AS plays_local
      GROUP BY 1, 2
    `);

    const artistRows = await db.execute<{ artist_name: string; plays: number }>(sql`
      SELECT a.artist_name, count(*)::int AS plays
      FROM play_history ph
      JOIN track_artists ta ON ta.track_id = ph.track_id
      JOIN artists a ON a.id = ta.artist_id
      WHERE (${startFilter}::timestamptz IS NULL OR ph.played_at >= ${startFilter}::timestamptz)
        AND (${endFilter}::timestamptz IS NULL OR ph.played_at <= ${endFilter}::timestamptz)
      GROUP BY 1
      ORDER BY 2 DESC, 1 ASC
      LIMIT 5
    `);

    // 7 days × 24 hours, so the heatmap gets its grid without re-bucketing.
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const hourCounts = Array(24).fill(0);
    const dayOfWeekCounts = Array(7).fill(0);
    let totalPlays = 0;
    let totalDurationMs = 0;

    for (const row of Array.from(bucketRows)) {
      const dow = Number(row.dow);
      const hour = Number(row.hour);
      const plays = Number(row.plays);

      grid[dow][hour] = plays;
      hourCounts[hour] += plays;
      dayOfWeekCounts[dow] += plays;
      totalPlays += plays;
      totalDurationMs += Number(row.duration_ms);
    }

    return NextResponse.json({
      success: true,
      timezone,
      data: {
        totalPlays,
        totalDurationMs,
        hourCounts,
        dayOfWeekCounts,
        grid,
        topArtists: Array.from(artistRows).map((row) => ({
          name: row.artist_name,
          count: Number(row.plays),
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching listening patterns:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch listening patterns' },
      { status: 500 },
    );
  }
}

/**
 * Only zones Postgres will accept get through. An unknown one would throw
 * mid-query and take the whole response down, so it falls back to UTC.
 */
function resolveTimezone(value: string | null): string {
  if (!value) return 'UTC';

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return 'UTC';
  }
}
