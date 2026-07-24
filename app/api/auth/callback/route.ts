import { NextResponse } from 'next/server';
import { sealSession, SESSION_COOKIE } from '@/lib/auth/session';
import { requestOrigin } from '@/lib/auth/requestOrigin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let home: string;
  try {
    home = requestOrigin(request);
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.headers.get('cookie')?.match(/oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(`${home}/curate?error=state`);
  }

  try {
    const basic = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${home}/api/auth/callback`,
      }),
    });
    if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
    const tokens = await tokenRes.json();
    if (!tokens.refresh_token) throw new Error('token response missing refresh_token');

    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!meRes.ok) throw new Error(`profile fetch failed: ${meRes.status}`);
    const me = await meRes.json();

    if (me.id !== process.env.OWNER_SPOTIFY_USER_ID) {
      return NextResponse.redirect(`${home}/curate?denied=1`);
    }

    const res = NextResponse.redirect(`${home}/curate`);
    res.cookies.set(
      SESSION_COOKIE,
      sealSession({
        spotifyUserId: me.id,
        displayName: me.display_name ?? me.id,
        refreshToken: tokens.refresh_token,
      }),
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      }
    );
    res.cookies.delete('oauth_state');
    return res;
  } catch (error) {
    console.error('❌ auth/callback error:', error);
    return NextResponse.redirect(`${home}/curate?error=auth`);
  }
}
