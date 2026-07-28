import { db } from '@/db';
import { tracks, artists, trackArtists } from '@/db/schema';
import { eq, isNull, inArray, asc } from 'drizzle-orm';
import { lookupMix, RateLimitError, type MixLookup } from './mix/sources';

const THROTTLE_MS = 700;

export interface EnrichMixResult {
  considered: number;
  enriched: number;   // got bpm + key
  bpmOnly: number;    // got bpm, no key
  keyOnly: number;    // got camelotKey, no bpm
  noData: number;     // lookup completed, nothing found (stamped, won't retry)
  rateLimited: boolean;
  errors: string[];   // transient failures (NOT stamped, retried next run)
}

/** Attempts up to 3 artists per track; stops at first hit or throws on rate limit/transient error */
async function tryArtistsForTrack(
  artists: string[],
  trackName: string
): Promise<MixLookup> {
  for (const artist of artists.slice(0, 3)) {
    try {
      const mix = await lookupMix(artist, trackName);
      if (mix.bpm !== null || mix.camelotKey !== null) {
        return mix; // hit; return immediately
      }
    } catch (e) {
      if (e instanceof RateLimitError) throw e; // propagate rate limit to abort batch
      throw e; // propagate transient error to abort this track (no stamp)
    }
  }
  // no artist hit; return all-null (will be stamped)
  return { bpm: null, camelotKey: null, source: null };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function enrichMixData(limit: number): Promise<EnrichMixResult> {
  const rows = await db
    .select({ id: tracks.id, trackName: tracks.trackName })
    .from(tracks)
    .where(isNull(tracks.mixCheckedAt))
    .orderBy(asc(tracks.createdAt))
    .limit(limit);

  const result: EnrichMixResult = {
    considered: rows.length,
    enriched: 0,
    bpmOnly: 0,
    keyOnly: 0,
    noData: 0,
    rateLimited: false,
    errors: [],
  };
  if (rows.length === 0) return result;

  const artistRows = await db
    .select({ trackId: trackArtists.trackId, artistName: artists.artistName })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(inArray(trackArtists.trackId, rows.map((r) => r.id)))
    .orderBy(asc(artists.artistName));
  const artistsByTrack = new Map<string, string[]>();
  for (const a of artistRows) {
    if (!artistsByTrack.has(a.trackId)) artistsByTrack.set(a.trackId, []);
    artistsByTrack.get(a.trackId)!.push(a.artistName);
  }

  for (const row of rows) {
    const trackArtists = artistsByTrack.get(row.id) ?? [];
    try {
      const mix = await tryArtistsForTrack(trackArtists, row.trackName);
      await db
        .update(tracks)
        .set({
          bpm: mix.bpm,
          camelotKey: mix.camelotKey,
          mixSource: mix.source,
          mixCheckedAt: new Date(),
        })
        .where(eq(tracks.id, row.id));
      if (mix.bpm !== null && mix.camelotKey !== null) result.enriched++;
      else if (mix.bpm !== null) result.bpmOnly++;
      else if (mix.camelotKey !== null) result.keyOnly++;
      else result.noData++;
    } catch (e: any) {
      if (e instanceof RateLimitError) {
        result.rateLimited = true;
        result.errors.push(`rate limited: ${e.message}`);
        break; // abort batch; un-stamped rows retry next run
      }
      result.errors.push(`${row.trackName}: ${e.message}`); // transient error on an artist; not stamped
    }
    await sleep(THROTTLE_MS);
  }
  return result;
}
