import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/getSession';
import { accessTokenFromRefresh } from '@/lib/auth/spotifyUserToken';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : null;
    const ids: unknown = body?.spotifyTrackIds;
    if (!name || !Array.isArray(ids) || ids.length === 0 || !ids.every((x) => typeof x === 'string')) {
      return NextResponse.json(
        { success: false, error: 'name and non-empty spotifyTrackIds are required' },
        { status: 400 }
      );
    }

    const rawDescription =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : 'Curated with oldski unwrapped';
    // Spotify caps playlist descriptions at 300 characters
    const description =
      rawDescription.length > 300 ? `${rawDescription.slice(0, 299)}…` : rawDescription;

    const accessToken = await accessTokenFromRefresh(session.refreshToken);
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const createRes = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    });
    if (!createRes.ok) throw new Error(`playlist create failed: ${createRes.status} ${await createRes.text()}`);
    const playlist = await createRes.json();

    const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uris: (ids as string[]).map((id) => `spotify:track:${id}`) }),
    });
    if (!addRes.ok) throw new Error(`add tracks failed: ${addRes.status} ${await addRes.text()}`);

    return NextResponse.json({
      success: true,
      playlistId: playlist.id,
      playlistUrl: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`,
    });
  } catch (error: any) {
    console.error('❌ playlist/push error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
