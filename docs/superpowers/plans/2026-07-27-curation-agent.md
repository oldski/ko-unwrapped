# Curation Agent (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace deterministic set assembly with an LLM set-director plus a verified discovery lane, per `docs/superpowers/specs/2026-07-27-curation-agent-design.md`.

**Architecture:** Two-call pipeline. Code gathers and verifies candidates (scorer overfetch + seeds + model proposals + Last.fm similars, all resolved via Spotify search and vibe-tagged); Sonnet reasons twice — once to propose discovery, once to select/sequence the set with rationale. Deterministic sequencing survives as automatic fallback.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle/Postgres, `@anthropic-ai/sdk` (existing), Last.fm REST API, Spotify Web API (client-credentials search), vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-27-curation-agent-design.md`. Branch: `curation-agent`. Working directory: `/Users/kristopherolds/Desktop/web/unwrapped/oldski-unwrapped` (the MAIN checkout — not a worktree).
- Path alias `@/*` → repo root. No new runtime dependencies.
- Models: proposer/director `claude-sonnet-5`; tagging stays `claude-haiku-4-5-20251001` via existing pipeline.
- Presets: `familiar` (0 discovered), `balanced` (~30%), `adventurous` (~60%). Preset type: `'familiar' | 'balanced' | 'adventurous'`.
- New env: `LASTFM_API_KEY` (user registers at last.fm/api — STOP AND ASK when reached). Existing: `ANTHROPIC_API_KEY`, `SPOTIFY_CLIENT_ID/SECRET`, `DATABASE_URL`.
- All new routes owner-gated with `getSession()` (401 pattern identical to `candidates`).
- Route handlers: `export const dynamic = 'force-dynamic'`; JSON `{ success: boolean, ... }`; guarded routes may return `error.message`, public routes must not (there are no new public routes in this plan).
- Every `agent()`-facing module lives under `lib/curation/agent/`.
- Commit after every task; NEVER `git add -A`/`git add .` — stage only the files each task names.
- Dev server: assume one is already running on port 3000 from the main checkout; do not start another.
- `npm test` must stay green after every task (22 existing tests + new ones).

---

### Task 1: `discovery_cache` schema + migration

**Files:**
- Modify: `db/schema.ts` (append table)
- Create: generated `drizzle/0002_*.sql` + meta (via `npm run db:generate`)

**Interfaces:**
- Produces: `discoveryCache` Drizzle table — columns `id uuid pk`, `cacheKey varchar(300) unique not null` (e.g. `lastfm:artist-similar:royksopp`), `payload jsonb not null`, `fetchedAt timestamp default now`. Consumed by Task 4 (lastfm client).

- [ ] **Step 1: Append to `db/schema.ts`**

Add `jsonb` to the existing `drizzle-orm/pg-core` import list, then append at the end of the file:

```ts
// Discovery cache - memoizes external similarity/resolution lookups (30-day TTL enforced in code)
export const discoveryCache = pgTable('discovery_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  cacheKey: varchar('cache_key', { length: 300 }).unique().notNull(),
  payload: jsonb('payload').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
});
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npm run db:generate` — expect a new `drizzle/0002_*.sql` containing `CREATE TABLE "discovery_cache"`.
Run: `npm run db:migrate` — expect `migrations applied successfully`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` (clean) and `npm test` (22 passing).

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts drizzle
git commit -m "Add discovery_cache table"
```

---

### Task 2: Targeted tagging — `tagTrackIds`

**Files:**
- Modify: `lib/curation/tagWithLLM.ts`

**Interfaces:**
- Produces: `export async function tagTrackIds(trackIds: string[]): Promise<TagWithLLMResult>` — tags exactly those tracks (skipping any that already have llm tags), reusing the existing batch machinery. Consumed by Task 6 (resolveTracks).
- Existing `tagWithLLM(limit)` behavior unchanged.

- [ ] **Step 1: Generalize the fetch helper**

In `lib/curation/tagWithLLM.ts`, change `fetchUntaggedTracks`'s signature and where-clause:

```ts
async function fetchUntaggedTracks(limit: number, onlyIds?: string[]): Promise<TrackInput[]> {
```

and replace the `.where(...)` call with:

```ts
    .where(
      onlyIds
        ? sql`${tracks.id} IN ${onlyIds} AND NOT EXISTS (SELECT 1 FROM ${vibeTags} WHERE ${vibeTags.trackId} = ${tracks.id} AND ${vibeTags.source} = 'llm')`
        : sql`NOT EXISTS (SELECT 1 FROM ${vibeTags} WHERE ${vibeTags.trackId} = ${tracks.id} AND ${vibeTags.source} = 'llm')`
    )
```

(Drizzle renders `IN ${array}` as a parenthesized parameter list; if tsc or runtime complains, use `inArray(tracks.id, onlyIds)` combined via `and(...)` from drizzle-orm instead — both imports already exist or are one addition.)

- [ ] **Step 2: Extract the batch loop and add `tagTrackIds`**

Refactor the body of `tagWithLLM` so the loop over candidates lives in a private helper, then add:

```ts
async function runTagging(candidates: TrackInput[]): Promise<TagWithLLMResult> {
  if (!candidates.length) {
    return { tracksConsidered: 0, tracksTagged: 0, totalTagsApplied: 0, estimatedCostUsd: 0, errors: [] };
  }
  const client = getClient();
  const errors: string[] = [];
  let tracksTagged = 0;
  let totalTagsApplied = 0;
  let batchCount = 0;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    batchCount++;
    try {
      const results = await tagBatch(client, batch);
      const validIds = new Set(batch.map((t) => t.id));
      for (const result of results) {
        if (!validIds.has(result.trackId) || result.tags.length === 0) continue;
        const inserts = result.tags.map((tag) => ({
          trackId: result.trackId,
          tag,
          source: 'llm',
          confidence: 1,
        }));
        await db.insert(vibeTags).values(inserts).onConflictDoNothing();
        tracksTagged++;
        totalTagsApplied += inserts.length;
      }
    } catch (err: any) {
      errors.push(`Batch ${batchCount} failed: ${err?.message ?? String(err)}`);
    }
  }

  return {
    tracksConsidered: candidates.length,
    tracksTagged,
    totalTagsApplied,
    estimatedCostUsd: batchCount * COST_PER_BATCH_USD,
    errors,
  };
}

export async function tagWithLLM(limit = 250): Promise<TagWithLLMResult> {
  return runTagging(await fetchUntaggedTracks(limit));
}

/** Tags exactly the given tracks (those still lacking llm tags). Used for discovered tracks. */
export async function tagTrackIds(trackIds: string[]): Promise<TagWithLLMResult> {
  if (!trackIds.length) {
    return { tracksConsidered: 0, tracksTagged: 0, totalTagsApplied: 0, estimatedCostUsd: 0, errors: [] };
  }
  return runTagging(await fetchUntaggedTracks(trackIds.length, trackIds));
}
```

(Keep the existing console.log lines inside `runTagging` if convenient, or drop them — either is fine; do not change `tagBatch`.)

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit` (clean), `npm test` (22 passing).

```bash
git add lib/curation/tagWithLLM.ts
git commit -m "Extract runTagging and add targeted tagTrackIds"
```

---

### Task 3: Pool types + `buildPool` (TDD)

**Files:**
- Create: `lib/curation/agent/types.ts`
- Create: `lib/curation/agent/buildPool.ts`
- Test: `tests/curation/buildPool.test.ts`

**Interfaces:**
- Produces (`lib/curation/agent/types.ts`):

```ts
import type { CandidateTrack } from '@/lib/curation/candidateScorer';

export type Preset = 'familiar' | 'balanced' | 'adventurous';

export const DISCOVERY_RATIO: Record<Preset, number> = {
  familiar: 0,
  balanced: 0.3,
  adventurous: 0.6,
};

export interface PoolTrack {
  trackId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  durationMs: number;
  popularity: number | null;
  albumImageUrl: string | null;
  tags: string[];
  energy: number;
  score: number | null;           // null for discovered tracks (no play-history signals)
  source: 'library' | 'seed' | 'discovery';
  discoveryReason?: string;       // proposer/Last.fm justification
}

export interface DirectorSet {
  trackIds: string[];             // ordered
  placementNotes: Record<string, string>; // trackId -> note
  transitions: { fromIndex: number; note: string }[];
  narrative: string;
}

export interface AgentTrack extends Omit<PoolTrack, 'source'> {
  source: 'library' | 'discovery';
  placementNote: string;
  reasons: string[];
}

export interface AgentGenerateResult {
  mode: 'agent' | 'fallback';
  tracks: AgentTrack[];
  transitions: { fromIndex: number; note: string }[];
  narrative: string;
  totalDurationMs: number;
  meta: {
    poolSize: number;
    discoveredCount: number;
    fallbackReason?: string;
  };
}
```

- Produces (`buildPool.ts`): `buildPool(library: CandidateTrack[], seeds: CandidateTrack[], discovered: DiscoveredCandidate[]): PoolTrack[]` where

```ts
export interface DiscoveredCandidate {
  trackId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  durationMs: number;
  popularity: number | null;
  albumImageUrl: string | null;
  tags: string[];
  reason: string;
}
```

Dedup by `trackId` with precedence **seed > library > discovery** (a discovered track that exists in the library keeps its library score but keeps the discovery reason). Energy computed via `energyFromTags`.

- [ ] **Step 1: Write the failing test**

Create `tests/curation/buildPool.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildPool } from '@/lib/curation/agent/buildPool';
import type { CandidateTrack } from '@/lib/curation/candidateScorer';

const cand = (id: string, over: Partial<CandidateTrack> = {}): CandidateTrack => ({
  trackId: id,
  spotifyTrackId: `sp-${id}`,
  trackName: `Track ${id}`,
  artistNames: ['Artist'],
  durationMs: 200_000,
  popularity: 40,
  albumImageUrl: null,
  tags: ['electronic', 'high-energy'],
  score: 0.5,
  reasons: ['r'],
  ...over,
});

const disc = (id: string) => ({
  trackId: id,
  spotifyTrackId: `sp-${id}`,
  trackName: `Track ${id}`,
  artistNames: ['New Artist'],
  durationMs: 210_000,
  popularity: 30,
  albumImageUrl: null,
  tags: ['ambient'],
  reason: 'similar to seed',
});

describe('buildPool', () => {
  it('labels sources and computes energy from tags', () => {
    const pool = buildPool([cand('a')], [cand('s')], [disc('d')]);
    const byId = new Map(pool.map((p) => [p.trackId, p]));
    expect(byId.get('a')!.source).toBe('library');
    expect(byId.get('s')!.source).toBe('seed');
    expect(byId.get('d')!.source).toBe('discovery');
    expect(byId.get('a')!.energy).toBeGreaterThan(0.6);
    expect(byId.get('d')!.energy).toBeLessThan(0.3);
  });

  it('dedups with precedence seed > library > discovery', () => {
    const pool = buildPool([cand('x'), cand('y')], [cand('x')], [disc('y'), disc('z')]);
    expect(pool.filter((p) => p.trackId === 'x')).toHaveLength(1);
    expect(pool.find((p) => p.trackId === 'x')!.source).toBe('seed');
    const y = pool.find((p) => p.trackId === 'y')!;
    expect(y.source).toBe('library');
    expect(y.score).toBe(0.5);
    expect(y.discoveryReason).toBe('similar to seed');
    expect(pool.find((p) => p.trackId === 'z')!.source).toBe('discovery');
  });

  it('discovered tracks carry null score and their reason', () => {
    const pool = buildPool([], [], [disc('d')]);
    expect(pool[0].score).toBeNull();
    expect(pool[0].discoveryReason).toBe('similar to seed');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/curation/buildPool.test.ts` — FAIL (module not found).

- [ ] **Step 3: Implement**

Create `lib/curation/agent/types.ts` with the exact block from Interfaces above.

Create `lib/curation/agent/buildPool.ts`:

```ts
import type { CandidateTrack } from '@/lib/curation/candidateScorer';
import { energyFromTags } from '@/lib/curation/energy';
import type { PoolTrack } from './types';

export interface DiscoveredCandidate {
  trackId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  durationMs: number;
  popularity: number | null;
  albumImageUrl: string | null;
  tags: string[];
  reason: string;
}

function fromCandidate(c: CandidateTrack, source: 'library' | 'seed'): PoolTrack {
  return {
    trackId: c.trackId,
    spotifyTrackId: c.spotifyTrackId,
    trackName: c.trackName,
    artistNames: c.artistNames,
    durationMs: c.durationMs,
    popularity: c.popularity,
    albumImageUrl: c.albumImageUrl,
    tags: c.tags,
    energy: energyFromTags(c.tags),
    score: c.score,
    source,
  };
}

/** Merge candidate lanes into one labeled pool. Precedence: seed > library > discovery. */
export function buildPool(
  library: CandidateTrack[],
  seeds: CandidateTrack[],
  discovered: DiscoveredCandidate[]
): PoolTrack[] {
  const byId = new Map<string, PoolTrack>();

  for (const d of discovered) {
    byId.set(d.trackId, {
      trackId: d.trackId,
      spotifyTrackId: d.spotifyTrackId,
      trackName: d.trackName,
      artistNames: d.artistNames,
      durationMs: d.durationMs,
      popularity: d.popularity,
      albumImageUrl: d.albumImageUrl,
      tags: d.tags,
      energy: energyFromTags(d.tags),
      score: null,
      source: 'discovery',
      discoveryReason: d.reason,
    });
  }
  for (const c of library) {
    const existing = byId.get(c.trackId);
    byId.set(c.trackId, {
      ...fromCandidate(c, 'library'),
      ...(existing?.discoveryReason ? { discoveryReason: existing.discoveryReason } : {}),
    });
  }
  for (const s of seeds) {
    const existing = byId.get(s.trackId);
    byId.set(s.trackId, {
      ...fromCandidate(s, 'seed'),
      ...(existing?.discoveryReason ? { discoveryReason: existing.discoveryReason } : {}),
    });
  }

  return [...byId.values()];
}
```

- [ ] **Step 4: Verify green + full suite**

Run: `npx vitest run tests/curation/buildPool.test.ts` (3 passing), then `npm test` (all passing), `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add lib/curation/agent/types.ts lib/curation/agent/buildPool.ts tests/curation/buildPool.test.ts
git commit -m "Add agent pool types and buildPool merge"
```

---

### Task 4: Last.fm client with cache

**Files:**
- Create: `lib/curation/agent/lastfm.ts`

**Interfaces:**
- Consumes: `discoveryCache` (Task 1). Env `LASTFM_API_KEY`.
- Produces:

```ts
export interface LastfmSuggestion { artistName: string; trackName?: string; match: number }
export async function similarForSeeds(
  seedArtistNames: string[],
  seedTracks: { trackName: string; artistName: string }[]
): Promise<LastfmSuggestion[]>
```

Returns up to ~30 deduped suggestions (similar artists + similar tracks), each with Last.fm's 0-1 `match`. Missing `LASTFM_API_KEY` → returns `[]` (discovery degrades, never throws). Cache: `discovery_cache` keyed `lastfm:artist-similar:<name>` / `lastfm:track-similar:<artist>|<track>`, 30-day TTL.

**PRECONDITION — STOP AND ASK:** if `LASTFM_API_KEY` is not present in `.env.local`, ask the user to register a free API account at https://www.last.fm/api/account/create and provide the key before verifying this task. (Implementation can be written first.)

- [ ] **Step 1: Implement `lib/curation/agent/lastfm.ts`**

```ts
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
    const items = data?.similarartists?.artist ?? [];
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
      const items = data?.similartracks?.track ?? [];
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
```

- [ ] **Step 2: Verify live (needs the API key — see precondition)**

Confirm `LASTFM_API_KEY` is in `.env.local` (ask the user if not). Run `npx tsc --noEmit` (clean), then verify live behavior via a throwaway vitest run (project alias support):

Create `tests/curation/_tmp-lastfm.test.ts` (DELETE after running, do not commit):

```ts
import { describe, it, expect } from 'vitest';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

describe('lastfm live', () => {
  it('returns suggestions for a known artist', async () => {
    const { similarForSeeds } = await import('@/lib/curation/agent/lastfm');
    const out = await similarForSeeds(['Röyksopp'], []);
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].artistName).toBeTruthy();
  }, 30_000);
});
```

Run: `npx vitest run tests/curation/_tmp-lastfm.test.ts` → passing; run again → second run should be near-instant (cache hit; optionally check `discovery_cache` row count grew). Then `rm tests/curation/_tmp-lastfm.test.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/curation/agent/lastfm.ts
git commit -m "Add cached Last.fm similarity client"
```

---

### Task 5: Spotify search + track resolution

**Files:**
- Create: `lib/curation/agent/spotifySearch.ts`
- Create: `lib/curation/agent/resolveTracks.ts`

**Interfaces:**
- Produces (`spotifySearch.ts`): `searchTrack(query: string): Promise<SpotifyTrackHit | null>` using the client-credentials flow (no user scope needed), module-level token cache.

```ts
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
```

- Produces (`resolveTracks.ts`):

```ts
export interface ProposedTrack { artistName: string; trackName: string; reason: string }
export async function resolveProposals(proposals: ProposedTrack[]): Promise<DiscoveredCandidate[]>
```

For each proposal: Spotify search `track:"<name>" artist:"<artist>"` (fallback: free-text query) → if no hit, drop. If the resolved `spotifyTrackId` already exists in `tracks`, fold back (return it as a discovered candidate with the LIBRARY `trackId` and its existing tags). Otherwise insert into `tracks`/`artists`/`track_artists`, run `tagTrackIds` on the new ids (one call for the whole batch), and return with fresh tags. Consumed by Task 7's route.

- [ ] **Step 1: Implement `lib/curation/agent/spotifySearch.ts`**

```ts
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
```

- [ ] **Step 2: Implement `lib/curation/agent/resolveTracks.ts`**

```ts
import { db } from '@/db';
import { tracks, artists, trackArtists, vibeTags } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { tagTrackIds } from '@/lib/curation/tagWithLLM';
import { searchTrack } from './spotifySearch';
import type { DiscoveredCandidate } from './buildPool';

export interface ProposedTrack {
  artistName: string;
  trackName: string;
  reason: string;
}

async function upsertArtist(spotifyArtistId: string, artistName: string): Promise<string> {
  const [existing] = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.spotifyArtistId, spotifyArtistId));
  if (existing) return existing.id;
  const [row] = await db
    .insert(artists)
    .values({ spotifyArtistId, artistName })
    .onConflictDoNothing()
    .returning({ id: artists.id });
  if (row) return row.id;
  const [raced] = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.spotifyArtistId, spotifyArtistId));
  return raced.id;
}

/**
 * Resolves proposals against Spotify; folds library duplicates back to their
 * existing rows; inserts + vibe-tags genuinely new tracks. Unresolvable
 * proposals are silently dropped. Per-proposal failures never abort the batch.
 */
export async function resolveProposals(proposals: ProposedTrack[]): Promise<DiscoveredCandidate[]> {
  const out: DiscoveredCandidate[] = [];
  const newTrackIds: string[] = [];

  for (const p of proposals) {
    try {
      const hit = await searchTrack(p.trackName, p.artistName);
      if (!hit) continue;

      const [existing] = await db
        .select({
          id: tracks.id,
          trackName: tracks.trackName,
          durationMs: tracks.durationMs,
          popularity: tracks.popularity,
          albumImageUrl: tracks.albumImageUrl,
        })
        .from(tracks)
        .where(eq(tracks.spotifyTrackId, hit.spotifyTrackId));

      if (existing) {
        const tagRows = await db
          .select({ tag: vibeTags.tag })
          .from(vibeTags)
          .where(eq(vibeTags.trackId, existing.id));
        out.push({
          trackId: existing.id,
          spotifyTrackId: hit.spotifyTrackId,
          trackName: existing.trackName,
          artistNames: hit.artistNames,
          durationMs: existing.durationMs,
          popularity: existing.popularity,
          albumImageUrl: existing.albumImageUrl,
          tags: tagRows.map((r) => r.tag),
          reason: p.reason,
        });
        continue;
      }

      const [inserted] = await db
        .insert(tracks)
        .values({
          spotifyTrackId: hit.spotifyTrackId,
          trackName: hit.trackName,
          durationMs: hit.durationMs,
          albumName: hit.albumName,
          albumImageUrl: hit.albumImageUrl,
          popularity: hit.popularity,
        })
        .onConflictDoNothing()
        .returning({ id: tracks.id });
      if (!inserted) continue;

      if (hit.primaryArtistSpotifyId) {
        const artistId = await upsertArtist(hit.primaryArtistSpotifyId, hit.artistNames[0]);
        await db.insert(trackArtists).values({ trackId: inserted.id, artistId }).onConflictDoNothing();
      }

      newTrackIds.push(inserted.id);
      out.push({
        trackId: inserted.id,
        spotifyTrackId: hit.spotifyTrackId,
        trackName: hit.trackName,
        artistNames: hit.artistNames,
        durationMs: hit.durationMs,
        popularity: hit.popularity,
        albumImageUrl: hit.albumImageUrl,
        tags: [],
        reason: p.reason,
      });
    } catch {
      // drop this proposal; never abort the batch
    }
  }

  if (newTrackIds.length) {
    await tagTrackIds(newTrackIds).catch(() => undefined);
    const tagged = await db
      .select({ trackId: vibeTags.trackId, tag: vibeTags.tag })
      .from(vibeTags)
      .where(inArray(vibeTags.trackId, newTrackIds));
    const byTrack = new Map<string, string[]>();
    for (const row of tagged) {
      const list = byTrack.get(row.trackId) ?? [];
      list.push(row.tag);
      byTrack.set(row.trackId, list);
    }
    for (const c of out) {
      if (byTrack.has(c.trackId)) c.tags = byTrack.get(c.trackId)!;
    }
  }

  return out;
}
```

Note: `trackArtists` has no unique constraint, so `.onConflictDoNothing()` on it is a no-op safeguard — acceptable duplication risk is zero here because the track row is brand new.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit` (clean), `npm test` (all passing). Live behavior is verified end-to-end in Task 7.

```bash
git add lib/curation/agent/spotifySearch.ts lib/curation/agent/resolveTracks.ts
git commit -m "Add Spotify search resolution for discovered tracks"
```

---

### Task 6: Director output validation (TDD) + the two Sonnet calls

**Files:**
- Create: `lib/curation/agent/validateDirectorOutput.ts`
- Test: `tests/curation/validateDirectorOutput.test.ts`
- Create: `lib/curation/agent/proposeDiscovery.ts`
- Create: `lib/curation/agent/director.ts`

**Interfaces:**
- Produces (`validateDirectorOutput.ts`) — pure, fully unit-tested:

```ts
export interface ValidationInput {
  raw: { track_ids: string[]; placement_notes: { track_id: string; note: string }[];
         transitions: { from_index: number; note: string }[]; narrative: string };
  pool: PoolTrack[];
  durationTargetMs: [number, number];
}
export interface ValidatedSet extends DirectorSet { warnings: string[] }
export function validateDirectorOutput(input: ValidationInput): ValidatedSet
```

Rules: drop unknown/duplicate track ids (warning per drop); repair duration overshoot by removing tracks from the END until `<= max` (warning); if under min, warn but keep (director judgment stands); re-index transitions after any removal by dropping transition entries whose `from_index` no longer has a successor; narrative defaults to `''`.
- Produces (`proposeDiscovery.ts`): `proposeDiscovery(seeds: PoolTrack[], seedProfile: { genres: string[]; tags: string[] }): Promise<ProposedTrack[]>` — Sonnet call, forced tool `propose_tracks`, 15–25 proposals, each `{artist_name, track_name, reason}`. Throws on API failure (route catches).
- Produces (`director.ts`): `directSet(args: { seeds: PoolTrack[]; pool: PoolTrack[]; preset: Preset; durationTargetMs: [number, number] }): Promise<ValidatedSet>` — Sonnet call, forced tool `build_set`, then `validateDirectorOutput`. Throws on API failure.
- Both use `claude-sonnet-5`, lazy client like `tagWithLLM.getClient`.

- [ ] **Step 1: Write the failing validation test**

Create `tests/curation/validateDirectorOutput.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateDirectorOutput } from '@/lib/curation/agent/validateDirectorOutput';
import type { PoolTrack } from '@/lib/curation/agent/types';

const pt = (id: string, durationMs = 180_000): PoolTrack => ({
  trackId: id,
  spotifyTrackId: `sp-${id}`,
  trackName: id,
  artistNames: ['A'],
  durationMs,
  popularity: 30,
  albumImageUrl: null,
  tags: [],
  energy: 0.5,
  score: 0.4,
  source: 'library',
});

const raw = (ids: string[], over: Partial<any> = {}) => ({
  track_ids: ids,
  placement_notes: ids.map((id) => ({ track_id: id, note: `note-${id}` })),
  transitions: ids.slice(0, -1).map((_, i) => ({ from_index: i, note: `t-${i}` })),
  narrative: 'a set',
  ...over,
});

describe('validateDirectorOutput', () => {
  const pool = [pt('a'), pt('b'), pt('c'), pt('d')];

  it('passes a clean set through', () => {
    const v = validateDirectorOutput({ raw: raw(['a', 'b', 'c']), pool, durationTargetMs: [300_000, 700_000] });
    expect(v.trackIds).toEqual(['a', 'b', 'c']);
    expect(v.placementNotes['b']).toBe('note-b');
    expect(v.transitions).toHaveLength(2);
    expect(v.warnings).toEqual([]);
  });

  it('drops ids not in the pool, with a warning', () => {
    const v = validateDirectorOutput({ raw: raw(['a', 'ghost', 'b']), pool, durationTargetMs: [100_000, 700_000] });
    expect(v.trackIds).toEqual(['a', 'b']);
    expect(v.warnings.some((w) => w.includes('ghost'))).toBe(true);
  });

  it('drops duplicate ids', () => {
    const v = validateDirectorOutput({ raw: raw(['a', 'a', 'b']), pool, durationTargetMs: [100_000, 700_000] });
    expect(v.trackIds).toEqual(['a', 'b']);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  it('repairs duration overshoot by trimming from the end', () => {
    const v = validateDirectorOutput({ raw: raw(['a', 'b', 'c', 'd']), pool, durationTargetMs: [100_000, 400_000] });
    expect(v.trackIds).toEqual(['a', 'b']);
    expect(v.warnings.some((w) => w.includes('duration'))).toBe(true);
  });

  it('keeps under-min sets but warns', () => {
    const v = validateDirectorOutput({ raw: raw(['a']), pool, durationTargetMs: [600_000, 900_000] });
    expect(v.trackIds).toEqual(['a']);
    expect(v.warnings.some((w) => w.includes('below'))).toBe(true);
  });

  it('drops transitions whose from_index lost its successor', () => {
    const v = validateDirectorOutput({ raw: raw(['a', 'b', 'c', 'd']), pool, durationTargetMs: [100_000, 400_000] });
    for (const t of v.transitions) expect(t.fromIndex).toBeLessThan(v.trackIds.length - 1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/curation/validateDirectorOutput.test.ts` — FAIL (module not found).

- [ ] **Step 3: Implement `lib/curation/agent/validateDirectorOutput.ts`**

```ts
import type { DirectorSet, PoolTrack } from './types';

export interface ValidationInput {
  raw: {
    track_ids: string[];
    placement_notes: { track_id: string; note: string }[];
    transitions: { from_index: number; note: string }[];
    narrative: string;
  };
  pool: PoolTrack[];
  durationTargetMs: [number, number];
}

export interface ValidatedSet extends DirectorSet {
  warnings: string[];
}

/** Structural guard: the director may only sequence tracks we handed it. */
export function validateDirectorOutput(input: ValidationInput): ValidatedSet {
  const { raw, pool, durationTargetMs } = input;
  const [minMs, maxMs] = durationTargetMs;
  const byId = new Map(pool.map((p) => [p.trackId, p]));
  const warnings: string[] = [];

  const seen = new Set<string>();
  let trackIds: string[] = [];
  for (const id of raw.track_ids ?? []) {
    if (!byId.has(id)) {
      warnings.push(`dropped unknown track id ${id}`);
      continue;
    }
    if (seen.has(id)) {
      warnings.push(`dropped duplicate track id ${id}`);
      continue;
    }
    seen.add(id);
    trackIds.push(id);
  }

  let totalMs = trackIds.reduce((s, id) => s + byId.get(id)!.durationMs, 0);
  while (trackIds.length > 0 && totalMs > maxMs) {
    const removed = trackIds.pop()!;
    totalMs -= byId.get(removed)!.durationMs;
    warnings.push(`trimmed ${removed} to repair duration overshoot`);
  }
  if (totalMs < minMs) {
    warnings.push(`set duration ${Math.round(totalMs / 60000)}min is below the ${Math.round(minMs / 60000)}min target`);
  }

  const placementNotes: Record<string, string> = {};
  for (const n of raw.placement_notes ?? []) {
    if (seen.has(n.track_id) && trackIds.includes(n.track_id)) placementNotes[n.track_id] = n.note;
  }

  const transitions = (raw.transitions ?? [])
    .filter((t) => Number.isInteger(t.from_index) && t.from_index >= 0 && t.from_index < trackIds.length - 1)
    .map((t) => ({ fromIndex: t.from_index, note: t.note }));

  return {
    trackIds,
    placementNotes,
    transitions,
    narrative: typeof raw.narrative === 'string' ? raw.narrative : '',
    warnings,
  };
}
```

- [ ] **Step 4: Green + full suite**

Run: `npx vitest run tests/curation/validateDirectorOutput.test.ts` (6 passing), `npm test`, `npx tsc --noEmit`.

- [ ] **Step 5: Implement `lib/curation/agent/proposeDiscovery.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk';
import type { PoolTrack } from './types';
import type { ProposedTrack } from './resolveTracks';

const MODEL = 'claude-sonnet-5';

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const SYSTEM = `You are a music-discovery specialist for a personal DJ-set builder. Given seed tracks the listener loves (with their vibe tags and genres), propose real, existing tracks in the same sonic/mood neighborhood that a fan of the seeds likely hasn't worn out. Favor: adjacent artists, notable remixes, deeper cuts from adjacent scenes, and era-consistent picks. Every proposal must be a real released track — never invent titles. Return proposals via the propose_tracks tool.`;

export async function proposeDiscovery(
  seeds: PoolTrack[],
  seedProfile: { genres: string[]; tags: string[] }
): Promise<ProposedTrack[]> {
  const client = getClient();
  const seedLines = seeds
    .map((s) => `- "${s.trackName}" by ${s.artistNames.join(', ')} [tags: ${s.tags.join(', ') || 'none'}]`)
    .join('\n');
  const user = `Seed tracks:\n${seedLines}\n\nSeed genre profile: ${seedProfile.genres.join(', ') || 'unknown'}\nSeed vibe tags: ${seedProfile.tags.join(', ') || 'none'}\n\nPropose 15-25 tracks.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
    tools: [
      {
        name: 'propose_tracks',
        description: 'Submit discovery proposals.',
        input_schema: {
          type: 'object',
          properties: {
            proposals: {
              type: 'array',
              minItems: 15,
              maxItems: 25,
              items: {
                type: 'object',
                properties: {
                  artist_name: { type: 'string' },
                  track_name: { type: 'string' },
                  reason: { type: 'string', description: 'One line: why this fits the seed vibe.' },
                },
                required: ['artist_name', 'track_name', 'reason'],
              },
            },
          },
          required: ['proposals'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'propose_tracks' },
  });

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'propose_tracks') {
      const input = block.input as { proposals: { artist_name: string; track_name: string; reason: string }[] };
      return input.proposals
        .filter((p) => p.artist_name && p.track_name)
        .map((p) => ({ artistName: p.artist_name, trackName: p.track_name, reason: p.reason ?? '' }));
    }
  }
  return [];
}
```

- [ ] **Step 6: Implement `lib/curation/agent/director.ts`**

```ts
import Anthropic from '@anthropic-ai/sdk';
import type { PoolTrack, Preset } from './types';
import { DISCOVERY_RATIO } from './types';
import { validateDirectorOutput, type ValidatedSet } from './validateDirectorOutput';

const MODEL = 'claude-sonnet-5';

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const SYSTEM = `You are a set director for a personal DJ-set builder. You receive seed tracks (the listener's anchors) and a candidate pool. Build ONE continuous set from ONLY the pool's track ids.

Craft rules:
- Think like a DJ: an intentional opener, an arc (build, peak, comedown), and a closing track that lands.
- Adjacent tracks should flow: use the energy values (0-1) and vibe tags to avoid jarring jumps unless deliberate.
- Seeds are candidates too — place them where they serve the arc, or omit them.
- Respect the requested discovery ratio approximately: discovered tracks are marked source=discovery.
- Avoid clumping one artist's tracks together.
- Hit the duration window using each track's duration_ms.
- For every chosen track write a short placement note (why here). For every adjacent pair write a one-line transition note.
- Write a 2-3 sentence narrative describing the set's journey.
Return via the build_set tool only.`;

export async function directSet(args: {
  seeds: PoolTrack[];
  pool: PoolTrack[];
  preset: Preset;
  durationTargetMs: [number, number];
}): Promise<ValidatedSet> {
  const { seeds, pool, preset, durationTargetMs } = args;
  const client = getClient();

  const poolLines = pool
    .map(
      (p) =>
        `- id:${p.trackId} | "${p.trackName}" by ${p.artistNames.join(', ')} | source:${p.source} | energy:${p.energy.toFixed(2)} | duration_ms:${p.durationMs} | popularity:${p.popularity ?? 'n/a'} | score:${p.score ?? 'n/a'} | tags:${p.tags.join(',') || 'none'}${p.discoveryReason ? ` | why-suggested:${p.discoveryReason}` : ''}`
    )
    .join('\n');

  const user = `Seeds (anchors): ${seeds.map((s) => `"${s.trackName}" by ${s.artistNames.join(', ')}`).join('; ')}
Duration window: ${Math.round(durationTargetMs[0] / 60000)}-${Math.round(durationTargetMs[1] / 60000)} minutes.
Discovery preset: ${preset} (~${Math.round(DISCOVERY_RATIO[preset] * 100)}% of the set from source=discovery tracks).

Candidate pool (${pool.length} tracks):
${poolLines}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
    tools: [
      {
        name: 'build_set',
        description: 'Submit the final ordered set.',
        input_schema: {
          type: 'object',
          properties: {
            track_ids: { type: 'array', items: { type: 'string' }, minItems: 3 },
            placement_notes: {
              type: 'array',
              items: {
                type: 'object',
                properties: { track_id: { type: 'string' }, note: { type: 'string' } },
                required: ['track_id', 'note'],
              },
            },
            transitions: {
              type: 'array',
              items: {
                type: 'object',
                properties: { from_index: { type: 'integer' }, note: { type: 'string' } },
                required: ['from_index', 'note'],
              },
            },
            narrative: { type: 'string' },
          },
          required: ['track_ids', 'placement_notes', 'transitions', 'narrative'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'build_set' },
  });

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'build_set') {
      return validateDirectorOutput({
        raw: block.input as ValidationInput['raw'],
        pool,
        durationTargetMs,
      });
    }
  }
  throw new Error('director returned no build_set tool call');
}

type ValidationInput = Parameters<typeof validateDirectorOutput>[0];
```

- [ ] **Step 7: Verify and commit**

Run: `npx tsc --noEmit` (clean), `npm test` (all passing — includes the 6 new validation tests).

```bash
git add lib/curation/agent/validateDirectorOutput.ts tests/curation/validateDirectorOutput.test.ts lib/curation/agent/proposeDiscovery.ts lib/curation/agent/director.ts
git commit -m "Add director/proposer Sonnet calls with validated structured output"
```

---

### Task 7: Orchestrating route with fallback

**Files:**
- Create: `app/api/curation/agent/generate/route.ts`

**Interfaces:**
- Consumes: everything from Tasks 3–6, `rankCandidates`, `getSession`.
- Produces: `POST /api/curation/agent/generate`, body:

```ts
{ seedTrackIds: string[]; preset?: 'familiar'|'balanced'|'adventurous';
  durationTargetMs?: [number, number]; genreAllow?: string[]; genreDeny?: string[];
  popularityRange?: [number, number]; excludeTrackIds?: string[] }
```

Response: `{ success: true, ...AgentGenerateResult }` (Task 3 type). Fallback path maps the deterministic `rankCandidates` output into the same shape (`mode: 'fallback'`, `placementNote` = joined scorer reasons, empty transitions, `narrative: ''`).

- [ ] **Step 1: Implement the route**

```ts
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

function fallbackResult(ranked: Awaited<ReturnType<typeof rankCandidates>>, reason: string): AgentGenerateResult {
  return {
    mode: 'fallback',
    tracks: ranked.tracks.map((t) => ({
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
      const result: AgentGenerateResult = {
        mode: 'agent',
        tracks: agentTracks,
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
```

Note on the fallback's `energy: 0.5`: the deterministic path's `CandidateTrack` already carries `tags` — compute real energy in the UI as before; the constant here is only a server-side placeholder the client overwrites. (The UI maps energy from tags for BOTH modes — see Task 8.)

- [ ] **Step 2: Verify**

`npx tsc --noEmit` clean; `npm test` all passing; unauthenticated: `curl -s -X POST http://localhost:3000/api/curation/agent/generate -H 'Content-Type: application/json' -d '{"seedTrackIds":["x"]}'` → 401. Authenticated live verification happens via the browser in Task 10 (controller).

- [ ] **Step 3: Commit**

```bash
git add app/api/curation/agent/generate
git commit -m "Add agent generate route with discovery lanes and fallback"
```

---

### Task 8: UI — presets, agent generate, staged progress, fallback banner

**Files:**
- Modify: `app/curate/types.ts`
- Modify: `app/curate/CurateClient.tsx`
- Modify: `app/curate/SeedTray.tsx`

**Interfaces:**
- `SetTrack` gains `source: 'library' | 'discovery'` and `placementNote: string`. New client types `Transition { fromIndex: number; note: string }`.
- `CurateClient` state gains `preset` (default `'balanced'`), `transitions`, `narrative`, `fallbackNotice: string | null`, `progressStage: string | null`.
- `SeedTray` gains preset chips (`preset`, `onPresetChange` props).

- [ ] **Step 1: Extend `app/curate/types.ts`**

Add to `SetTrack`:

```ts
  source: 'library' | 'discovery';
  placementNote: string;
```

Append:

```ts
export interface Transition {
  fromIndex: number;
  note: string;
}

export type Preset = 'familiar' | 'balanced' | 'adventurous';
```

- [ ] **Step 2: Preset chips in `app/curate/SeedTray.tsx`**

Add props `preset: Preset; onPresetChange: (p: Preset) => void;` (import `Preset` from `./types`). Render between the seed chips and the Generate button:

```tsx
      <div className="flex gap-1 ml-auto mr-3">
        {(['familiar', 'balanced', 'adventurous'] as const).map((p) => (
          <button
            key={p}
            onClick={() => onPresetChange(p)}
            className={`px-3 py-1 rounded-full text-xs capitalize transition ${
              preset === p ? 'bg-[var(--color-primary)] text-black' : 'bg-white/10 hover:bg-white/20'
            }`}
            title={
              p === 'familiar'
                ? 'Library only'
                : p === 'balanced'
                ? '~30% new music'
                : '~60% new music'
            }
          >
            {p}
          </button>
        ))}
      </div>
```

(Remove `ml-auto` from the Generate button's className since the preset group now carries it.)

- [ ] **Step 3: Rewire `CurateClient.tsx` generate**

Add state:

```tsx
  const [preset, setPreset] = useState<Preset>('balanced');
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [narrative, setNarrative] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string | null>(null);
```

(import `Preset`, `Transition` from `./types`). Replace `generate`'s body: POST to `/api/curation/agent/generate` with the same body plus `preset`, and optimistic staged progress:

```tsx
  const generate = useCallback(async () => {
    if (seeds.length === 0) return;
    setGenerating(true);
    setError(null);
    setFallbackNotice(null);
    setProgressStage('finding candidates…');
    const stages = ['discovering new music…', 'sequencing the set…'];
    const timers = stages.map((s, i) => setTimeout(() => setProgressStage(s), 4000 * (i + 1)));
    try {
      const res = await fetch('/api/curation/agent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedTrackIds: seeds.map((s) => s.trackId),
          preset,
          durationTargetMs: [
            filters.durationMinMinutes * 60_000,
            filters.durationMaxMinutes * 60_000,
          ],
          popularityRange: [filters.popularityMin, filters.popularityMax],
          ...(filters.genreAllow.length ? { genreAllow: filters.genreAllow } : {}),
          ...(filters.genreDeny.length ? { genreDeny: filters.genreDeny } : {}),
          excludeTrackIds: excluded,
        }),
      });
      if (res.status === 401) {
        window.location.href = '/api/auth/login';
        return;
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Generation failed');
      const withEnergy = (t: any): SetTrack => ({ ...t, energy: energyFromTags(t.tags) });
      setSet(data.tracks.map(withEnergy));
      setAlternates([]);
      setTransitions(data.transitions ?? []);
      setNarrative(data.narrative ?? '');
      if (data.mode === 'fallback') {
        setFallbackNotice('Agent unavailable — classic sequencing used.');
      }
      setSmoothed(false);
      setBaseOrder([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      timers.forEach(clearTimeout);
      setProgressStage(null);
      setGenerating(false);
    }
  }, [seeds, filters, excluded, preset]);
```

Note: `alternates` is cleared — the director consumed the whole pool, so swap now offers *unused pool tracks*; to keep swap working, ALSO store the unused pool: add state `const [poolLeftovers, setPoolLeftovers] = useState<SetTrack[]>([]);` — but the route doesn't return the pool. Simplest correct v1: after `setSet(...)`, keep the old alternates behavior by deriving leftovers is impossible client-side; therefore the route MUST return leftovers. **Add to the route (Task 7 file, this task may edit it):** after building `agentTracks`, compute

```ts
      const usedIds = new Set(set.trackIds);
      const leftovers = pool
        .filter((p) => !usedIds.has(p.trackId))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 15)
        .map((p) => ({ ...p, source: p.source === 'discovery' ? 'discovery' : 'library', placementNote: p.discoveryReason ?? '', reasons: [] }));
```

and include `alternates: leftovers` in the JSON response (and `alternates: ranked.alternates.map(...)` similarly shaped in `fallbackResult`). In the client, `setAlternates(data.alternates.map(withEnergy))` instead of `[]`.

Pass `preset`/`onPresetChange={setPreset}` to `<SeedTray ...>`; render the fallback banner and progress:

- In the SeedTray row area (right after `<SeedTray .../>`):

```tsx
        {fallbackNotice && (
          <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            <span>{fallbackNotice}</span>
            <button onClick={() => setFallbackNotice(null)} className="ml-auto hover:text-white">✕</button>
          </div>
        )}
```

- Generate button label: SeedTray already shows `generating ? 'Generating…' : 'Generate'`; extend SeedTray with optional `progressLabel?: string | null` prop and render `{generating ? (progressLabel ?? 'Generating…') : 'Generate'}`; pass `progressLabel={progressStage}`.

- [ ] **Step 4: Verify and commit**

`npx tsc --noEmit` clean; `npm test` passing; page renders (`curl -s http://localhost:3000/curate | head -c 100`). Browser verification deferred to Task 10 (controller).

```bash
git add app/curate/types.ts app/curate/CurateClient.tsx app/curate/SeedTray.tsx app/api/curation/agent/generate/route.ts
git commit -m "Wire UI to agent generate with presets, staged progress, fallback banner"
```

---

### Task 9: UI — discovery badges, placement notes, transitions, narrative

**Files:**
- Modify: `app/curate/SetTimeline.tsx`
- Modify: `app/curate/CurateClient.tsx` (pass new props)
- Modify: `app/curate/PushDialog.tsx` (description prefill)

**Interfaces:**
- `SetTimeline` gains props: `transitions: Transition[]`, `narrative: string`.
- `PushDialog` gains prop `defaultDescription: string`.

- [ ] **Step 1: `SetTimeline.tsx` additions**

Add `transitions`/`narrative` to the props interface (import `Transition` from `./types`). Render:

1. Narrative under the header row (only when non-empty):

```tsx
      {narrative && (
        <p className="text-xs text-[var(--color-text-secondary)] italic mb-3 max-w-3xl">{narrative}</p>
      )}
```

2. Discovery badge on bars — inside the bar `<button>`, after the artwork `<img>`:

```tsx
            {t.source === 'discovery' && (
              <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] px-1 rounded bg-[var(--color-vibrant-safe)] text-black font-bold">
                new
              </span>
            )}
```

3. Slot panel: replace the `why:` line with placement note + transition-in note:

```tsx
          <p className="text-xs text-[var(--color-text-secondary)]">
            {set[openSlot].placementNote || set[openSlot].reasons.join('; ') || 'seed-adjacent pick'}
          </p>
          {(() => {
            const t = transitions.find((tr) => tr.fromIndex === openSlot - 1);
            return t ? (
              <p className="mt-1 text-xs text-[var(--color-primary)]">↪ transition in: {t.note}</p>
            ) : null;
          })()}
```

4. Slot panel header: mark discovered tracks:

```tsx
              <p className="truncate font-semibold">
                {openSlot + 1}. {set[openSlot].trackName}
                {set[openSlot].source === 'discovery' && (
                  <span className="ml-2 text-[10px] align-middle px-1.5 py-0.5 rounded bg-[var(--color-vibrant-safe)] text-black font-bold">NEW TO YOU</span>
                )}
              </p>
```

- [ ] **Step 2: Wire through `CurateClient.tsx`**

Pass `transitions={transitions}` and `narrative={narrative}` to `<SetTimeline>`. Pass `defaultDescription={narrative || 'Curated with oldski unwrapped'}` to `<PushDialog>`.

- [ ] **Step 3: `PushDialog.tsx` description**

Add prop `defaultDescription: string`; in the push body replace the static description with `description: defaultDescription`.

- [ ] **Step 4: Verify and commit**

`npx tsc --noEmit` clean; `npm test` passing; page renders.

```bash
git add app/curate/SetTimeline.tsx app/curate/CurateClient.tsx app/curate/PushDialog.tsx
git commit -m "Surface discovery badges, placement/transition notes, and narrative"
```

---

### Task 10: End-to-end verification

**Files:** none (verification only; fixes go where the defect lives)

- [ ] **Step 1: Static + build gates**

`npx tsc --noEmit` clean; `npm test` all passing; `npm run build` succeeds.

- [ ] **Step 2: Browser E2E (controller performs; needs owner login via http://127.0.0.1:3000/curate)**

1. Familiar preset + 2 seeds → generate: set arrives (~10s), `mode: 'agent'`, no "new" badges, placement notes present, narrative shown.
2. Balanced preset, same seeds → generate: discovery badges appear on some bars; slot panel shows "NEW TO YOU" and transition-in notes; alternates/swap works with leftovers.
3. Push: dialog description prefilled with the narrative; playlist created; discovered tracks play (real Spotify IDs).
4. Fallback: temporarily set `ANTHROPIC_API_KEY=` invalid? Do NOT mutate env — instead verify the fallback branch by code review + the route's catch (fallback is exercised naturally if the API hiccups; the deterministic path is the previous release's behavior). Mark as code-verified.

- [ ] **Step 3: Commit anything outstanding, update ledger**

```bash
git status --short   # expect clean
```