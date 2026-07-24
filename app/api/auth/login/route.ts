import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const home = process.env.NEXT_PUBLIC_HOST;
  if (!home) {
    return NextResponse.json({ success: false, error: 'NEXT_PUBLIC_HOST is not set' }, { status: 500 });
  }

  const state = randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${home}/api/auth/callback`,
    scope: 'playlist-modify-private playlist-modify-public',
    state,
  });
  const res = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  return res;
}
