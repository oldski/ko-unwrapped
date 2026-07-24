import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql, SQL } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const BASE_SELECT = sql`
  select
    t.id as "trackId",
    t.spotify_track_id as "spotifyTrackId",
    t.track_name as "trackName",
    t.duration_ms as "durationMs",
    t.album_image_url as "albumImageUrl",
    t.popularity as "popularity",
    array_agg(distinct a.artist_name) as "artistNames",
    count(distinct ph.id)::int as "plays",
    max(ph.played_at) as "lastPlayed"
  from tracks t
  join track_artists ta on ta.track_id = t.id
  join artists a on a.id = ta.artist_id
  left join play_history ph on ph.track_id = t.id
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const shelf = searchParams.get('shelf');
    const tags = searchParams.get('tags')?.split(',').map((t) => t.trim()).filter(Boolean);

    let rows;
    if (q) {
      const pattern = `%${q}%`;
      rows = await db.execute(sql`
        ${BASE_SELECT}
        where t.id in (
          select t2.id from tracks t2
          join track_artists ta2 on ta2.track_id = t2.id
          join artists a2 on a2.id = ta2.artist_id
          where t2.track_name ilike ${pattern} or a2.artist_name ilike ${pattern}
        )
        group by t.id
        order by "plays" desc
        limit 30
      `);
    } else if (tags && tags.length > 0) {
      // Build array literal with individual tag parameters
      const tagArray = tags.map((tag) => sql`${tag}`);

      rows = await db.execute(sql`
        ${BASE_SELECT}
        where t.id in (
          select vt.track_id from vibe_tags vt
          where vt.tag = any(array[${sql.join(tagArray, sql`, `)}]::text[])
          group by vt.track_id
          having count(distinct vt.tag) = ${tags.length}
        )
        group by t.id
        order by "plays" desc
        limit 30
      `);
    } else if (shelf === 'recent') {
      rows = await db.execute(sql`
        ${BASE_SELECT}
        group by t.id
        order by "lastPlayed" desc nulls last
        limit 30
      `);
    } else {
      // default shelf: most-played
      rows = await db.execute(sql`
        ${BASE_SELECT}
        group by t.id
        order by "plays" desc
        limit 30
      `);
    }

    const tracks = [...rows].map((r: any) => ({
      trackId: r.trackId,
      spotifyTrackId: r.spotifyTrackId,
      trackName: r.trackName,
      artistNames: r.artistNames ?? [],
      durationMs: r.durationMs,
      albumImageUrl: r.albumImageUrl,
      popularity: r.popularity,
      plays: r.plays,
    }));

    return NextResponse.json({ success: true, tracks });
  } catch (error: any) {
    console.error('❌ curation/tracks error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
