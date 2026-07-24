import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db.execute(sql`
      select
        s.id,
        to_char(s.started_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') as "startedAt",
        s.track_count as "trackCount",
        s.hour_of_day as "hourOfDay",
        s.day_of_week as "dayOfWeek",
        coalesce(
          (
            select json_agg(json_build_object('trackId', y.track_id, 'trackName', y.track_name) order by y.min_position)
            from (
              select x.track_id, x.track_name, x.min_position,
                     row_number() over (order by x.min_position) as rnk
              from (
                select st.track_id, t.track_name, min(st.position) as min_position
                from session_tracks st
                join tracks t on t.id = st.track_id
                where st.session_id = s.id
                group by st.track_id, t.track_name
              ) x
            ) y
            where y.rnk <= 3
          ), '[]'::json
        ) as "sampleTracks"
      from listening_sessions s
      where s.track_count >= 3
      order by s.started_at desc
      limit 60
    `);
    return NextResponse.json({ success: true, sessions: [...rows] });
  } catch (error: any) {
    console.error('❌ curation/sessions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
