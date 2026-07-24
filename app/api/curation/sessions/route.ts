import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db.execute(sql`
      select
        s.id,
        s.started_at as "startedAt",
        s.track_count as "trackCount",
        s.hour_of_day as "hourOfDay",
        s.day_of_week as "dayOfWeek",
        coalesce(
          (
            select json_agg(json_build_object('trackId', x.track_id, 'trackName', x.track_name) order by x.position)
            from (
              select distinct on (st.track_id) st.track_id, t.track_name, st.position
              from session_tracks st
              join tracks t on t.id = st.track_id
              where st.session_id = s.id
              order by st.track_id, st.position
            ) x
            where x.position < 3
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
