import { db } from '@/db';
import { discoveryCache } from '@/db/schema';
import { eq } from 'drizzle-orm';

const API_ROOT = 'https://ws.audioscrobbler.com/2.0/';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PER_SEED_LIMIT = 8;

export interface LastfmSuggestion {
  artistName: string;
  trackName?: string;
  match: number;
}

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const [row] = await db.select().from(discoveryCache).where(eq(discoveryCache.cacheKey, key));
  if (row && Date.now() - new Date(row.fetchedAt).getTime() < TTL_MS) {
    return row.payload as T;
  }
  const fresh = await fetcher();
  await db
    .insert(discoveryCache)
    .values({ cacheKey: key, payload: fresh as object, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: discoveryCache.cacheKey,
      set: { payload: fresh as object, fetchedAt: new Date() },
    });
  return fresh;
}

async function lastfm(params: Record<string, string>): Promise<any> {
  const key = process.env.LASTFM_API_KEY;
  if (!key) throw new Error('LASTFM_API_KEY is not set');
  const qs = new URLSearchParams({ ...params, api_key: key, format: 'json' });
  const res = await fetch(`${API_ROOT}?${qs.toString()}`);
  if (!res.ok) throw new Error(`Last.fm ${params.method} failed: ${res.status}`);
  return res.json();
}

async function similarArtists(artistName: string): Promise<LastfmSuggestion[]> {
  return cached(`lastfm:artist-similar:${artistName.toLowerCase()}`, async () => {
    const data = await lastfm({
      method: 'artist.getSimilar',
      artist: artistName,
      autocorrect: '1',
      limit: String(PER_SEED_LIMIT),
    });
    const raw = data?.similarartists?.artist ?? [];
    const items = Array.isArray(raw) ? raw : [raw];
    return items.map((a: any) => ({ artistName: a.name as string, match: Number(a.match) || 0 }));
  });
}

async function similarTracks(artistName: string, trackName: string): Promise<LastfmSuggestion[]> {
  return cached(
    `lastfm:track-similar:${artistName.toLowerCase()}|${trackName.toLowerCase()}`,
    async () => {
      const data = await lastfm({
        method: 'track.getSimilar',
        artist: artistName,
        track: trackName,
        autocorrect: '1',
        limit: String(PER_SEED_LIMIT),
      });
      const raw = data?.similartracks?.track ?? [];
      const items = Array.isArray(raw) ? raw : [raw];
      return items.map((t: any) => ({
        artistName: (t.artist?.name ?? '') as string,
        trackName: t.name as string,
        match: Number(t.match) || 0,
      }));
    }
  );
}

/**
 * Similar artists + similar tracks for the seed set, deduped, best-match first.
 * Degrades to [] when the API key is missing or every call fails.
 */
export async function similarForSeeds(
  seedArtistNames: string[],
  seedTracks: { trackName: string; artistName: string }[]
): Promise<LastfmSuggestion[]> {
  if (!process.env.LASTFM_API_KEY) return [];

  const jobs: Promise<LastfmSuggestion[]>[] = [
    ...seedArtistNames.map((a) => similarArtists(a).catch(() => [])),
    ...seedTracks.map((t) => similarTracks(t.artistName, t.trackName).catch(() => [])),
  ];
  const results = (await Promise.all(jobs)).flat();

  const seen = new Set<string>();
  const out: LastfmSuggestion[] = [];
  for (const s of results.sort((a, b) => b.match - a.match)) {
    const key = `${s.artistName.toLowerCase()}|${s.trackName?.toLowerCase() ?? ''}`;
    if (!s.artistName || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 30) break;
  }
  return out;
}
