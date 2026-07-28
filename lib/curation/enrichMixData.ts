import { db } from '@/db';
import { tracks, artists, trackArtists } from '@/db/schema';
import { eq, isNull, inArray, asc } from 'drizzle-orm';
import { lookupMix, RateLimitError } from './mix/sources';

const THROTTLE_MS = 700;

export interface EnrichMixResult {
  considered: number;
  enriched: number;   // got bpm + key
  bpmOnly: number;    // got bpm, no key
  noData: number;     // lookup completed, nothing found (stamped, won't retry)
  rateLimited: boolean;
  errors: string[];   // transient failures (NOT stamped, retried next run)
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
    noData: 0,
    rateLimited: false,
    errors: [],
  };
  if (rows.length === 0) return result;

  const artistRows = await db
    .select({ trackId: trackArtists.trackId, artistName: artists.artistName })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(inArray(trackArtists.trackId, rows.map((r) => r.id)));
  const artistByTrack = new Map<string, string>();
  for (const a of artistRows) {
    if (!artistByTrack.has(a.trackId)) artistByTrack.set(a.trackId, a.artistName);
  }

  for (const row of rows) {
    const artistName = artistByTrack.get(row.id);
    try {
      const mix = artistName
        ? await lookupMix(artistName, row.trackName)
        : { bpm: null, camelotKey: null, source: null };
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
      else result.noData++;
    } catch (e: any) {
      if (e instanceof RateLimitError) {
        result.rateLimited = true;
        result.errors.push(`rate limited: ${e.message}`);
        break; // abort batch; un-stamped rows retry next run
      }
      result.errors.push(`${row.trackName}: ${e.message}`); // transient; not stamped
    }
    await sleep(THROTTLE_MS);
  }
  return result;
}
