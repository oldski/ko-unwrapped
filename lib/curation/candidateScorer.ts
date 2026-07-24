import { db } from '@/db';
import {
  tracks,
  artists,
  trackArtists,
  artistGenres,
  vibeTags,
  listeningSessions,
  sessionTracks,
} from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

const DEFAULT_DURATION_MIN_MS = 45 * 60 * 1000;
const DEFAULT_DURATION_MAX_MS = 60 * 60 * 1000;
const ANTI_CLUMP_WINDOW = 4;

// Scoring weights. Tune in-place; not exposed in the API surface intentionally.
const W_GENRE_OVERLAP = 0.30;
const W_TAG_OVERLAP = 0.30;
const W_CO_SESSION = 0.25;
const W_TIME_AFFINITY = 0.10;
const W_POP_PROXIMITY = 0.05;

export interface RankCandidatesInput {
  seedTrackIds: string[];
  durationTargetMs?: [number, number];
  genreAllow?: string[];
  genreDeny?: string[];
  tagAllow?: string[];
  hourOfDayFilter?: number[];
  popularityRange?: [number, number];
  excludeTrackIds?: string[];
  alternatesCount?: number;
}

export interface CandidateTrack {
  trackId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  durationMs: number;
  popularity: number | null;
  albumImageUrl: string | null;
  tags: string[];
  score: number;
  reasons: string[];
}

export interface RankCandidatesResult {
  tracks: CandidateTrack[];
  totalDurationMs: number;
  alternates: CandidateTrack[];
  meta: {
    candidatePoolSize: number;
    constraintsApplied: string[];
    seedProfile: {
      genres: string[];
      tags: string[];
      hourDistribution: Record<number, number>;
      medianPopularity: number;
    };
  };
}

interface TrackRow {
  id: string;
  spotifyTrackId: string;
  trackName: string;
  durationMs: number;
  popularity: number | null;
  albumImageUrl: string | null;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function normalizeDistribution(d: Record<number, number>): Record<number, number> {
  const total = Object.values(d).reduce((s, v) => s + v, 0);
  if (total === 0) return d;
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(d)) out[Number(k)] = v / total;
  return out;
}

function distributionSimilarity(a: Record<number, number>, b: Record<number, number>): number {
  // 1 - 0.5 * sum of abs diffs (i.e. total-variation distance complement). 0..1, higher = closer.
  const an = normalizeDistribution(a);
  const bn = normalizeDistribution(b);
  let diff = 0;
  for (let h = 0; h < 24; h++) diff += Math.abs((an[h] ?? 0) - (bn[h] ?? 0));
  return Math.max(0, 1 - diff / 2);
}

export async function rankCandidates(input: RankCandidatesInput): Promise<RankCandidatesResult> {
  const seedIds = input.seedTrackIds ?? [];
  if (seedIds.length === 0) {
    throw new Error('At least one seed track is required.');
  }
  const [durMin, durMax] = input.durationTargetMs ?? [DEFAULT_DURATION_MIN_MS, DEFAULT_DURATION_MAX_MS];
  const exclude = new Set([...(input.excludeTrackIds ?? []), ...seedIds]);

  // ---------- Load core track data ----------
  const allTracks: TrackRow[] = await db
    .select({
      id: tracks.id,
      spotifyTrackId: tracks.spotifyTrackId,
      trackName: tracks.trackName,
      durationMs: tracks.durationMs,
      popularity: tracks.popularity,
      albumImageUrl: tracks.albumImageUrl,
    })
    .from(tracks);

  const tracksById = new Map<string, TrackRow>();
  for (const t of allTracks) tracksById.set(t.id, t);

  // ---------- Track → artists + artist names ----------
  const trackArtistRows = await db
    .select({
      trackId: trackArtists.trackId,
      artistId: trackArtists.artistId,
      artistName: artists.artistName,
    })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId));

  const artistsByTrack = new Map<string, { id: string; name: string }[]>();
  for (const row of trackArtistRows) {
    const list = artistsByTrack.get(row.trackId) ?? [];
    list.push({ id: row.artistId, name: row.artistName });
    artistsByTrack.set(row.trackId, list);
  }

  // ---------- Artist → genres ----------
  const genreRows = await db
    .select({ artistId: artistGenres.artistId, genres: artistGenres.genres })
    .from(artistGenres);

  const genresByArtist = new Map<string, string[]>();
  for (const row of genreRows) genresByArtist.set(row.artistId, row.genres ?? []);

  function genresForTrack(trackId: string): string[] {
    const out = new Set<string>();
    for (const a of artistsByTrack.get(trackId) ?? []) {
      for (const g of genresByArtist.get(a.id) ?? []) out.add(g);
    }
    return [...out];
  }

  // ---------- Track → vibe tags ----------
  const tagRows = await db
    .select({ trackId: vibeTags.trackId, tag: vibeTags.tag })
    .from(vibeTags);

  const tagsByTrack = new Map<string, Set<string>>();
  for (const row of tagRows) {
    const set = tagsByTrack.get(row.trackId) ?? new Set<string>();
    set.add(row.tag);
    tagsByTrack.set(row.trackId, set);
  }

  // ---------- Session memberships ----------
  // Sessions that contain any seed (used for co-session scoring) and a per-track
  // hour-of-day distribution.
  const seedSessionRows = await db
    .select({ sessionId: sessionTracks.sessionId, trackId: sessionTracks.trackId })
    .from(sessionTracks)
    .where(inArray(sessionTracks.trackId, seedIds));

  const sessionsBySeed = new Map<string, Set<string>>();
  const sessionsThatContainSeeds = new Set<string>();
  for (const row of seedSessionRows) {
    sessionsThatContainSeeds.add(row.sessionId);
    const set = sessionsBySeed.get(row.trackId) ?? new Set<string>();
    set.add(row.sessionId);
    sessionsBySeed.set(row.trackId, set);
  }

  // Tracks that appear in seed-containing sessions.
  let cohortTracksByTrack = new Map<string, Set<string>>();
  if (sessionsThatContainSeeds.size > 0) {
    const cohortRows = await db
      .select({ sessionId: sessionTracks.sessionId, trackId: sessionTracks.trackId })
      .from(sessionTracks)
      .where(inArray(sessionTracks.sessionId, [...sessionsThatContainSeeds]));

    for (const row of cohortRows) {
      const set = cohortTracksByTrack.get(row.trackId) ?? new Set<string>();
      set.add(row.sessionId);
      cohortTracksByTrack.set(row.trackId, set);
    }
  }

  // Per-track hour-of-day distribution across all sessions the track appears in.
  const allSessionMeta = await db
    .select({ id: listeningSessions.id, hourOfDay: listeningSessions.hourOfDay })
    .from(listeningSessions);
  const hourBySession = new Map<string, number>();
  for (const s of allSessionMeta) hourBySession.set(s.id, s.hourOfDay);

  const allSessionTrackRows = await db
    .select({ sessionId: sessionTracks.sessionId, trackId: sessionTracks.trackId })
    .from(sessionTracks);

  const hourDistByTrack = new Map<string, Record<number, number>>();
  for (const row of allSessionTrackRows) {
    const h = hourBySession.get(row.sessionId);
    if (h === undefined) continue;
    const dist = hourDistByTrack.get(row.trackId) ?? {};
    dist[h] = (dist[h] ?? 0) + 1;
    hourDistByTrack.set(row.trackId, dist);
  }

  // ---------- Build seed profile ----------
  const seedGenreSet = new Set<string>();
  for (const id of seedIds) for (const g of genresForTrack(id)) seedGenreSet.add(g);

  const seedTagSet = new Set<string>();
  for (const id of seedIds) for (const t of tagsByTrack.get(id) ?? []) seedTagSet.add(t);

  const seedHourDist: Record<number, number> = {};
  for (const id of seedIds) {
    for (const [h, c] of Object.entries(hourDistByTrack.get(id) ?? {})) {
      seedHourDist[Number(h)] = (seedHourDist[Number(h)] ?? 0) + (c as number);
    }
  }

  const seedPopValues = seedIds
    .map((id) => tracksById.get(id)?.popularity)
    .filter((p): p is number => typeof p === 'number');
  const seedMedianPop = median(seedPopValues);

  const constraintsApplied: string[] = [];
  if (input.genreAllow?.length) constraintsApplied.push(`genreAllow=${input.genreAllow.join('|')}`);
  if (input.genreDeny?.length) constraintsApplied.push(`genreDeny=${input.genreDeny.join('|')}`);
  if (input.tagAllow?.length) constraintsApplied.push(`tagAllow=${input.tagAllow.join('|')}`);
  if (input.hourOfDayFilter?.length) constraintsApplied.push(`hour=${input.hourOfDayFilter.join('|')}`);
  if (input.popularityRange) constraintsApplied.push(`pop=${input.popularityRange.join('-')}`);

  // ---------- Score every candidate ----------
  interface Scored {
    trackId: string;
    score: number;
    components: Record<string, number>;
    artistIds: string[];
  }

  const scored: Scored[] = [];
  for (const t of allTracks) {
    if (exclude.has(t.id)) continue;

    const candidateGenres = new Set(genresForTrack(t.id));
    const candidateTags = tagsByTrack.get(t.id) ?? new Set<string>();

    // ---- Hard gates ----
    if (input.genreAllow?.length) {
      const ok = input.genreAllow.some((g) => candidateGenres.has(g));
      if (!ok) continue;
    }
    if (input.genreDeny?.length) {
      const blocked = input.genreDeny.some((g) => candidateGenres.has(g));
      if (blocked) continue;
    }
    if (input.tagAllow?.length) {
      const ok = input.tagAllow.some((tag) => candidateTags.has(tag));
      if (!ok) continue;
    }
    if (input.popularityRange) {
      const [lo, hi] = input.popularityRange;
      const p = t.popularity ?? -1;
      if (p < lo || p > hi) continue;
    }
    if (input.hourOfDayFilter?.length) {
      const dist = hourDistByTrack.get(t.id) ?? {};
      const inFilter = input.hourOfDayFilter.some((h) => (dist[h] ?? 0) > 0);
      if (!inFilter) continue;
    }

    // ---- Score components ----
    const genreOverlap = jaccard(seedGenreSet, candidateGenres);
    const tagOverlap = jaccard(seedTagSet, candidateTags);

    const candidateSessions = cohortTracksByTrack.get(t.id) ?? new Set<string>();
    let coSessionCount = 0;
    for (const seed of seedIds) {
      const seedSessions = sessionsBySeed.get(seed) ?? new Set<string>();
      for (const s of seedSessions) {
        if (candidateSessions.has(s)) {
          coSessionCount++;
          break;
        }
      }
    }
    const coSession = coSessionCount / seedIds.length;

    const timeAffinity = distributionSimilarity(seedHourDist, hourDistByTrack.get(t.id) ?? {});

    const popDist = t.popularity === null ? 0.5 : 1 - Math.abs(seedMedianPop - t.popularity) / 100;
    const popProximity = Math.max(0, Math.min(1, popDist));

    const score =
      W_GENRE_OVERLAP * genreOverlap +
      W_TAG_OVERLAP * tagOverlap +
      W_CO_SESSION * coSession +
      W_TIME_AFFINITY * timeAffinity +
      W_POP_PROXIMITY * popProximity;

    if (score <= 0) continue;

    scored.push({
      trackId: t.id,
      score,
      components: { genreOverlap, tagOverlap, coSession, timeAffinity, popProximity },
      artistIds: (artistsByTrack.get(t.id) ?? []).map((a) => a.id),
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // ---------- Duration-targeted selection w/ anti-clumping ----------
  const chosen: Scored[] = [];
  let totalMs = 0;
  const recentArtistIds: Set<string>[] = [];

  function violatesAntiClump(candidateArtistIds: string[]): boolean {
    const window = recentArtistIds.slice(-ANTI_CLUMP_WINDOW);
    for (const set of window) {
      for (const aid of candidateArtistIds) if (set.has(aid)) return true;
    }
    return false;
  }

  // First pass: strict score, strict anti-clumping.
  for (const c of scored) {
    const dur = tracksById.get(c.trackId)?.durationMs ?? 0;
    if (totalMs + dur > durMax) continue;
    if (violatesAntiClump(c.artistIds)) continue;
    chosen.push(c);
    recentArtistIds.push(new Set(c.artistIds));
    totalMs += dur;
    if (totalMs >= durMin) break;
  }

  // Second pass: if under the min, relax anti-clumping and keep filling.
  if (totalMs < durMin) {
    const chosenIds = new Set(chosen.map((c) => c.trackId));
    for (const c of scored) {
      if (chosenIds.has(c.trackId)) continue;
      const dur = tracksById.get(c.trackId)?.durationMs ?? 0;
      if (totalMs + dur > durMax) continue;
      chosen.push(c);
      totalMs += dur;
      if (totalMs >= durMin) break;
    }
  }

  // ---------- Sequencing ----------
  // Opener: highest-scoring track with popularity >= median.
  // Outro: 1-2 lowest-popularity tracks at the end.
  // Middle: by score descending, with anti-clump preference.
  function sequenceChosen(items: Scored[]): Scored[] {
    if (items.length < 3) return [...items];
    const pops = items.map((c) => tracksById.get(c.trackId)?.popularity ?? 0);
    const popMedian = median(pops);

    const sortedByScore = [...items].sort((a, b) => b.score - a.score);
    const opener =
      sortedByScore.find((c) => (tracksById.get(c.trackId)?.popularity ?? 0) >= popMedian) ??
      sortedByScore[0];

    const remaining = items.filter((c) => c.trackId !== opener.trackId);
    remaining.sort((a, b) => (tracksById.get(a.trackId)?.popularity ?? 0) - (tracksById.get(b.trackId)?.popularity ?? 0));
    const outroCount = Math.min(2, Math.max(1, Math.floor(items.length / 8)));
    const outro = remaining.slice(0, outroCount);
    const middle = remaining
      .slice(outroCount)
      .sort((a, b) => b.score - a.score);

    return [opener, ...middle, ...outro];
  }

  const sequenced = sequenceChosen(chosen);

  // ---------- Reasons ----------
  function topReasons(c: Scored): string[] {
    const labels: Record<string, (v: number) => string> = {
      genreOverlap: (v) => `${(v * 100).toFixed(0)}% genre overlap w/ seeds`,
      tagOverlap: (v) => `${(v * 100).toFixed(0)}% vibe-tag overlap w/ seeds`,
      coSession: (v) => `co-occurs in ${(v * seedIds.length).toFixed(0)}/${seedIds.length} seed sessions`,
      timeAffinity: (v) => `${(v * 100).toFixed(0)}% time-of-day match`,
      popProximity: (v) => `${(v * 100).toFixed(0)}% popularity proximity`,
    };
    return Object.entries(c.components)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 2)
      .filter(([, v]) => (v as number) > 0)
      .map(([k, v]) => labels[k](v as number));
  }

  function toCandidate(c: Scored): CandidateTrack {
    const t = tracksById.get(c.trackId)!;
    const artistNames = (artistsByTrack.get(c.trackId) ?? []).map((a) => a.name);
    return {
      trackId: t.id,
      spotifyTrackId: t.spotifyTrackId,
      trackName: t.trackName,
      artistNames,
      durationMs: t.durationMs,
      popularity: t.popularity,
      albumImageUrl: t.albumImageUrl,
      tags: [...(tagsByTrack.get(c.trackId) ?? [])],
      score: Number(c.score.toFixed(4)),
      reasons: topReasons(c),
    };
  }

  const out: CandidateTrack[] = sequenced.map(toCandidate);

  const chosenIdSet = new Set(chosen.map((c) => c.trackId));
  const alternates: CandidateTrack[] = scored
    .filter((c) => !chosenIdSet.has(c.trackId))
    .slice(0, Math.max(0, input.alternatesCount ?? 0))
    .map(toCandidate);

  return {
    tracks: out,
    totalDurationMs: totalMs,
    alternates,
    meta: {
      candidatePoolSize: scored.length,
      constraintsApplied,
      seedProfile: {
        genres: [...seedGenreSet],
        tags: [...seedTagSet],
        hourDistribution: seedHourDist,
        medianPopularity: seedMedianPop,
      },
    },
  };
}
