import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tagRows = await db.execute(sql`
      select tag, count(distinct track_id)::int as count
      from vibe_tags
      group by tag
      order by count desc
    `);
    const genreRows = await db.execute(sql`
      select g as genre, count(*)::int as count
      from (select unnest(genres) as g from artist_genres) s
      group by g
      order by count desc
      limit 40
    `);
    return NextResponse.json({
      success: true,
      tags: [...tagRows],
      genres: [...genreRows],
    });
  } catch (error: any) {
    console.error('❌ curation/vibes error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
