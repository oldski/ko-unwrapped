// Client-credentials Spotify search. Search needs no user scope, so this
// avoids touching the user-session token machinery.

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function appToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 30_000) return tokenCache.token;
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  if (!res.ok) throw new Error(`Spotify app token failed: ${res.status}`);
  const data = await res.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return tokenCache.token;
}

export interface SpotifyTrackHit {
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  primaryArtistSpotifyId: string;
  durationMs: number;
  popularity: number;
  albumName: string | null;
  albumImageUrl: string | null;
}

async function search(q: string): Promise<SpotifyTrackHit | null> {
  const token = await appToken();
  const res = await fetch(
    `https://api.spotify.com/v1/search?type=track&limit=1&q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`);
  const data = await res.json();
  const t = data?.tracks?.items?.[0];
  if (!t) return null;
  return {
    spotifyTrackId: t.id,
    trackName: t.name,
    artistNames: t.artists.map((a: any) => a.name),
    primaryArtistSpotifyId: t.artists[0]?.id ?? '',
    durationMs: t.duration_ms,
    popularity: t.popularity ?? 0,
    albumName: t.album?.name ?? null,
    albumImageUrl: t.album?.images?.[0]?.url ?? null,
  };
}

/** Field-scoped search first, free-text fallback. Null when Spotify has no match. */
export async function searchTrack(trackName: string, artistName: string): Promise<SpotifyTrackHit | null> {
  const scoped = await search(`track:"${trackName}" artist:"${artistName}"`);
  if (scoped) return scoped;
  return search(`${trackName} ${artistName}`);
}
