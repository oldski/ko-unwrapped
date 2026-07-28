import { toCamelot } from './camelot';

export interface MixLookup {
  bpm: number | null;
  camelotKey: string | null;
  source: 'getsongbpm' | 'deezer' | null;
}

export class RateLimitError extends Error {}

const GSB_ROOT = 'https://api.getsong.co';

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function sanityBpm(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v >= 40 && v <= 220 ? v : null;
}

function cleanGsbQuery(s: string): string {
  // NFD diacritic-fold (keep case), strip non-letter/number/whitespace/hyphen, collapse whitespace
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove combining diacritics
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // strip non-letter/number/whitespace/hyphen
    .replace(/\s+/g, ' ') // collapse whitespace runs
    .trim();
}

export function buildGsbLookup(artistName: string, trackName: string): string {
  return `artist:${cleanGsbQuery(artistName)} song:${cleanGsbQuery(trackName)}`;
}

export function parseGetSongBpm(
  json: unknown,
  artistName: string
): { bpm: number | null; camelotKey: string | null } | null {
  const search = (json as any)?.search;
  if (!Array.isArray(search)) return null;
  const want = fold(artistName);
  const hit = search.find((s: any) => fold(String(s?.artist?.name ?? '')) === want);
  if (!hit) return null;
  return {
    bpm: sanityBpm(hit.tempo),
    camelotKey: typeof hit.key_of === 'string' ? toCamelot(hit.key_of) : null,
  };
}

export function parseDeezerTrack(json: unknown): number | null {
  return sanityBpm((json as any)?.bpm);
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (res.status === 429) throw new RateLimitError(`429 from ${new URL(url).host}`);
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return res.json();
}

async function fromGetSongBpm(artistName: string, trackName: string) {
  const key = process.env.GETSONGBPM_API_KEY;
  if (!key) return null;
  const lookup = encodeURIComponent(buildGsbLookup(artistName, trackName));
  const json = await getJson(`${GSB_ROOT}/search/?api_key=${key}&type=both&lookup=${lookup}`);
  return parseGetSongBpm(json, artistName);
}

async function fromDeezer(artistName: string, trackName: string): Promise<number | null> {
  const q = encodeURIComponent(`artist:"${artistName}" track:"${trackName}"`);
  const search = (await getJson(`https://api.deezer.com/search?q=${q}`)) as any;
  const want = fold(artistName);
  const hit = (search?.data ?? []).find((d: any) => fold(String(d?.artist?.name ?? '')) === want);
  if (!hit?.id) return null;
  const track = await getJson(`https://api.deezer.com/track/${hit.id}`);
  return parseDeezerTrack(track);
}

/** GetSongBPM first (bpm+key); Deezer fills bpm when GSB had none. */
export async function lookupMix(artistName: string, trackName: string): Promise<MixLookup> {
  const gsb = await fromGetSongBpm(artistName, trackName);
  if (gsb && (gsb.bpm !== null || gsb.camelotKey !== null)) {
    if (gsb.bpm !== null) return { ...gsb, source: 'getsongbpm' };
    const dz = await fromDeezer(artistName, trackName);
    return { bpm: dz, camelotKey: gsb.camelotKey, source: dz !== null ? 'deezer' : 'getsongbpm' };
  }
  const dz = await fromDeezer(artistName, trackName);
  return dz !== null
    ? { bpm: dz, camelotKey: null, source: 'deezer' }
    : { bpm: null, camelotKey: null, source: null };
}
