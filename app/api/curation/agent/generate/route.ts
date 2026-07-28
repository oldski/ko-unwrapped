import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/getSession';
import { rankCandidates, type CandidateTrack, type RankCandidatesInput } from '@/lib/curation/candidateScorer';
import { db } from '@/db';
import { tracks, vibeTags, trackArtists, artists } from '@/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { buildPool, type DiscoveredCandidate } from '@/lib/curation/agent/buildPool';
import { proposeDiscovery } from '@/lib/curation/agent/proposeDiscovery';
import { resolveProposals, type ProposedTrack } from '@/lib/curation/agent/resolveTracks';
import { similarForSeeds } from '@/lib/curation/agent/lastfm';
import { directSet } from '@/lib/curation/agent/director';
import type { AgentGenerateResult, AgentTrack, PoolTrack, Preset } from '@/lib/curation/agent/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const DEFAULT_DURATION: [number, number] = [45 * 60_000, 60 * 60_000];

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

async function seedCandidates(seedTrackIds: string[]): Promise<CandidateTrack[]> {
  const rows = await db
    .select({
      trackId: tracks.id,
      spotifyTrackId: tracks.spotifyTrackId,
      trackName: tracks.trackName,
      durationMs: tracks.durationMs,
      popularity: tracks.popularity,
      albumImageUrl: tracks.albumImageUrl,
      bpm: tracks.bpm,
      camelotKey: tracks.camelotKey,
    })
    .from(tracks)
    .where(inArray(tracks.id, seedTrackIds));

  const artistRows = await db
    .select({ trackId: trackArtists.trackId, artistName: artists.artistName })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(inArray(trackArtists.trackId, seedTrackIds));
  const tagRows = await db
    .select({ trackId: vibeTags.trackId, tag: vibeTags.tag })
    .from(vibeTags)
    .where(inArray(vibeTags.trackId, seedTrackIds));

  const artistsBy = new Map<string, string[]>();
  for (const r of artistRows) artistsBy.set(r.trackId, [...(artistsBy.get(r.trackId) ?? []), r.artistName]);
  const tagsBy = new Map<string, string[]>();
  for (const r of tagRows) tagsBy.set(r.trackId, [...(tagsBy.get(r.trackId) ?? []), r.tag]);

  return rows.map((r) => ({
    ...r,
    artistNames: artistsBy.get(r.trackId) ?? [],
    tags: tagsBy.get(r.trackId) ?? [],
    score: 1,
    reasons: ['seed track'],
  }));
}

function toAgentTracks(
  orderedIds: string[],
  pool: PoolTrack[],
  placementNotes: Record<string, string>
): AgentTrack[] {
  const byId = new Map(pool.map((p) => [p.trackId, p]));
  return orderedIds.map((id) => {
    const p = byId.get(id)!;
    return {
      ...p,
      source: p.source === 'discovery' ? 'discovery' : 'library',
      placementNote: placementNotes[id] ?? p.discoveryReason ?? '',
      reasons: p.discoveryReason ? [p.discoveryReason] : [],
    };
  });
}

type AgentGenerateResultWithAlternates = AgentGenerateResult & { alternates: AgentTrack[] };

function fallbackResult(
  ranked: Awaited<ReturnType<typeof rankCandidates>>,
  reason: string
): AgentGenerateResultWithAlternates {
  return {
    mode: 'fallback',
    tracks: ranked.tracks.map((t) => ({
      ...t,
      energy: 0.5,
      score: t.score,
      source: 'library' as const,
      placementNote: t.reasons.join('; '),
    })),
    alternates: ranked.alternates.map((t) => ({
      ...t,
      energy: 0.5,
      score: t.score,
      source: 'library' as const,
      placementNote: t.reasons.join('; '),
    })),
    transitions: [],
    narrative: '',
    totalDurationMs: ranked.totalDurationMs,
    meta: { poolSize: ranked.meta.candidatePoolSize, discoveredCount: 0, fallbackReason: reason },
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (!isStringArray(body?.seedTrackIds) || body.seedTrackIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'seedTrackIds must be a non-empty array of strings' },
        { status: 400 }
      );
    }
    const preset: Preset = ['familiar', 'balanced', 'adventurous'].includes(body.preset)
      ? body.preset
      : 'balanced';
    const durationTargetMs: [number, number] =
      Array.isArray(body.durationTargetMs) && body.durationTargetMs.length === 2
        ? [Number(body.durationTargetMs[0]), Number(body.durationTargetMs[1])]
        : DEFAULT_DURATION;

    const scorerInput: RankCandidatesInput = {
      seedTrackIds: body.seedTrackIds,
      durationTargetMs,
      alternatesCount: 30,
      ...(isStringArray(body.genreAllow) ? { genreAllow: body.genreAllow } : {}),
      ...(isStringArray(body.genreDeny) ? { genreDeny: body.genreDeny } : {}),
      ...(isStringArray(body.excludeTrackIds) ? { excludeTrackIds: body.excludeTrackIds } : {}),
      ...(Array.isArray(body.popularityRange) && body.popularityRange.length === 2
        ? { popularityRange: [Number(body.popularityRange[0]), Number(body.popularityRange[1])] as [number, number] }
        : {}),
    };

    const ranked = await rankCandidates(scorerInput);
    const library: CandidateTrack[] = [...ranked.tracks, ...ranked.alternates];
    const seeds = await seedCandidates(body.seedTrackIds);

    // ---- Discovery lanes (independent failure) ----
    let discovered: DiscoveredCandidate[] = [];
    if (preset !== 'familiar') {
      const seedPool = buildPool([], seeds, []);
      const [proposals, lastfmSuggestions] = await Promise.all([
        proposeDiscovery(seedPool, ranked.meta.seedProfile).catch((e) => {
          console.error('❌ discovery proposals failed:', e);
          return [] as ProposedTrack[];
        }),
        similarForSeeds(
          [...new Set(seeds.flatMap((s) => s.artistNames))],
          seeds.map((s) => ({ trackName: s.trackName, artistName: s.artistNames[0] ?? '' }))
        ).catch(() => []),
      ]);
      const lastfmProposals: ProposedTrack[] = lastfmSuggestions
        .filter((s) => s.trackName)
        .map((s) => ({
          artistName: s.artistName,
          trackName: s.trackName!,
          reason: `Last.fm similarity ${(s.match * 100).toFixed(0)}%`,
        }));
      discovered = await resolveProposals([...proposals, ...lastfmProposals]).catch((e) => {
        console.error('❌ resolution failed:', e);
        return [];
      });
    }

    const pool = buildPool(library, seeds, discovered);

    // ---- Director (fallback on failure) ----
    try {
      const set = await directSet({ seeds: buildPool([], seeds, []), pool, preset, durationTargetMs });
      const agentTracks = toAgentTracks(set.trackIds, pool, set.placementNotes);
      const usedIds = new Set(set.trackIds);
      const leftovers: AgentTrack[] = pool
        .filter((p) => !usedIds.has(p.trackId))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 15)
        .map((p) => ({
          ...p,
          source: p.source === 'discovery' ? 'discovery' : ('library' as const),
          placementNote: p.discoveryReason ?? '',
          reasons: [],
        }));
      const result: AgentGenerateResultWithAlternates = {
        mode: 'agent',
        tracks: agentTracks,
        alternates: leftovers,
        transitions: set.transitions,
        narrative: set.narrative,
        totalDurationMs: agentTracks.reduce((s, t) => s + t.durationMs, 0),
        meta: {
          poolSize: pool.length,
          discoveredCount: agentTracks.filter((t) => t.source === 'discovery').length,
        },
      };
      if (set.warnings.length) console.warn('⚠️ director warnings:', set.warnings);
      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      console.error('❌ director failed, deterministic fallback:', err);
      return NextResponse.json({ success: true, ...fallbackResult(ranked, err?.message ?? 'director failed') });
    }
  } catch (error: any) {
    console.error('❌ agent/generate error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
