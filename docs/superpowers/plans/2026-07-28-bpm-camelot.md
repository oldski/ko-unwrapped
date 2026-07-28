# BPM + Camelot Enrichment & Harmonic Sequencing (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the track library with BPM + Camelot key data (GetSongBPM → Deezer) and make both sequencing paths (director LLM and deterministic `smoothTransitions`) harmonically aware, surfaced in the /curate UI.

**Architecture:** Four nullable mix columns on `tracks`, filled by a batch enrichment route following the existing `enrich/tags` pattern. A pure `lib/curation/mix/` module (key→Camelot conversion + `harmonicCompat`) is shared by the enrichment parser, the director prompt, the deterministic sequencer, and the client UI. All consumers tolerate nulls: an unenriched library behaves exactly as today.

**Tech Stack:** Next.js 16 App Router, Drizzle/Postgres, vitest. External: GetSongBPM API (key required), Deezer public API (no key).

**Spec:** docs/superpowers/specs/2026-07-28-bpm-camelot-design.md

## Global Constraints

- Work on branch `bpm-camelot` off `main` (create via superpowers:using-git-worktrees at execution start).
- BPM sanity range: accept 40–220 only; anything else → null.
- Camelot codes: `1A`–`12A` (minor), `1B`–`12B` (major). Stored as `varchar(3)`.
- Missing mix data must never change existing behavior or penalize a pairing.
- Throttle external lookups ≈700ms between tracks; HTTP 429 aborts the batch early.
- Env var name: `GETSONGBPM_API_KEY` (owner registers at getsongbpm.com/api; **precondition for Tasks 4-5 live steps** — code tasks proceed without it).
- Commit format: imperative subject, `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` trailer.
- Gates for every task: `npx tsc --noEmit` clean, `npm test` green.

---

### Task 1: Mix columns on `tracks` + migration 0003

**Files:**
- Modify: `db/schema.ts` (tracks table, ~line 5-17)
- Create (generated): `drizzle/0003_*.sql`

**Interfaces:**
- Produces: `tracks.bpm real | null`, `tracks.camelotKey varchar(3) | null`, `tracks.mixSource varchar(20) | null`, `tracks.mixCheckedAt timestamp | null` — used by Tasks 5, 6.

- [ ] **Step 1: Add columns to the tracks table in `db/schema.ts`**

Insert before `createdAt` in the `tracks` pgTable:

```ts
  // Mix-readiness data (Phase 2): from GetSongBPM/Deezer, see lib/curation/enrichMixData.ts
  bpm: real('bpm'),
  camelotKey: varchar('camelot_key', { length: 3 }),
  mixSource: varchar('mix_source', { length: 20 }),
  mixCheckedAt: timestamp('mix_checked_at'),
```

(`real`, `varchar`, `timestamp` are already imported at the top of schema.ts.)

- [ ] **Step 2: Generate and apply the migration**

```bash
npm run db:generate   # creates drizzle/0003_*.sql
npm run db:migrate
```

Expected: migration file contains 4 `ALTER TABLE "tracks" ADD COLUMN` statements; migrate exits 0.

- [ ] **Step 3: Verify**

```bash
source .env.local; psql "$DATABASE_URL" -c "\d tracks" | grep -E "bpm|camelot|mix_"
```

Expected: the 4 new columns listed. Then `npx tsc --noEmit` clean.

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts drizzle/
git commit -m "Add mix columns (bpm, camelot_key, mix_source, mix_checked_at) to tracks"
```

---

### Task 2: `lib/curation/mix/` — types + Camelot conversion (TDD)

**Files:**
- Create: `lib/curation/mix/types.ts`
- Create: `lib/curation/mix/camelot.ts`
- Test: `tests/curation/camelot.test.ts`

**Interfaces:**
- Produces: `MixInfo { bpm: number | null; camelotKey: string | null }`; `toCamelot(key: string): string | null`. Used by Tasks 3, 4, 7.

- [ ] **Step 1: Write the failing test**

`tests/curation/camelot.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toCamelot } from '@/lib/curation/mix/camelot';

describe('toCamelot', () => {
  it('maps majors onto the B wheel', () => {
    expect(toCamelot('C')).toBe('8B');
    expect(toCamelot('G')).toBe('9B');
    expect(toCamelot('B')).toBe('1B');
    expect(toCamelot('F')).toBe('7B');
  });

  it('maps minors onto the A wheel', () => {
    expect(toCamelot('Am')).toBe('8A');
    expect(toCamelot('Em')).toBe('9A');
    expect(toCamelot('F#m')).toBe('11A');
    expect(toCamelot('Abm')).toBe('1A');
  });

  it('handles enharmonic equivalents', () => {
    expect(toCamelot('Gb')).toBe('2B');
    expect(toCamelot('F#')).toBe('2B');
    expect(toCamelot('C#m')).toBe('12A');
    expect(toCamelot('Dbm')).toBe('12A');
  });

  it('handles unicode accidentals and verbose minor suffixes', () => {
    expect(toCamelot('F♯m')).toBe('11A');
    expect(toCamelot('B♭')).toBe('6B');
    expect(toCamelot('A minor')).toBe('8A');
    expect(toCamelot('a min')).toBe('8A');
  });

  it('returns null for garbage', () => {
    expect(toCamelot('')).toBeNull();
    expect(toCamelot('H#')).toBeNull();
    expect(toCamelot('123')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

`npm test -- camelot` → FAIL (module not found).

- [ ] **Step 3: Implement**

`lib/curation/mix/types.ts`:

```ts
export interface MixInfo {
  bpm: number | null;
  camelotKey: string | null;
}
```

`lib/curation/mix/camelot.ts`:

```ts
// Musical key -> Camelot wheel code. Minor keys land on the A wheel,
// majors on B. Pure lookup, shared by enrichment parsing and (via
// harmonicCompat) both sequencers and the UI.

const NOTE_TO_PITCH: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

// pitch class -> Camelot number, per mode
const MAJOR_NUM: Record<number, number> = { 0: 8, 1: 3, 2: 10, 3: 5, 4: 12, 5: 7, 6: 2, 7: 9, 8: 4, 9: 11, 10: 6, 11: 1 };
const MINOR_NUM: Record<number, number> = { 0: 5, 1: 12, 2: 7, 3: 2, 4: 9, 5: 4, 6: 11, 7: 6, 8: 1, 9: 8, 10: 3, 11: 10 };

export function toCamelot(rawKey: string): string | null {
  if (!rawKey) return null;
  let s = rawKey.trim().replace(/♯/g, '#').replace(/♭/g, 'b');

  let minor = false;
  const modeMatch = s.match(/\s*(m|min|minor)$/i);
  if (modeMatch) {
    minor = true;
    s = s.slice(0, -modeMatch[0].length).trim();
  } else if (/\s*(maj|major)$/i.test(s)) {
    s = s.replace(/\s*(maj|major)$/i, '').trim();
  }

  const note = s.length >= 1 ? s[0].toUpperCase() + s.slice(1, 2).replace(/B$/, 'b') : '';
  const pitch = NOTE_TO_PITCH[note];
  if (pitch === undefined) return null;

  const num = minor ? MINOR_NUM[pitch] : MAJOR_NUM[pitch];
  return `${num}${minor ? 'A' : 'B'}`;
}
```

- [ ] **Step 4: Green + full suite**

`npm test` → all passing (36+ tests).

- [ ] **Step 5: Commit**

```bash
git add lib/curation/mix/types.ts lib/curation/mix/camelot.ts tests/curation/camelot.test.ts
git commit -m "Add Camelot wheel conversion with enharmonic handling"
```

---

### Task 3: `harmonicCompat` (TDD)

**Files:**
- Create: `lib/curation/mix/compat.ts`
- Test: `tests/curation/compat.test.ts`

**Interfaces:**
- Consumes: `MixInfo` from Task 2.
- Produces: `harmonicCompat(a: MixInfo, b: MixInfo): MixCompat` where `MixCompat { bpmDelta: number | null; keyRelation: 'same' | 'adjacent' | 'energy-boost' | 'clash' | null; score: number }`. Used by Tasks 7, 8; rules quoted in Task 6's prompt.

- [ ] **Step 1: Write the failing test**

`tests/curation/compat.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { harmonicCompat } from '@/lib/curation/mix/compat';

const mix = (bpm: number | null, camelotKey: string | null) => ({ bpm, camelotKey });

describe('harmonicCompat', () => {
  it('computes straight bpm delta as a percentage', () => {
    const c = harmonicCompat(mix(120, null), mix(126, null));
    expect(c.bpmDelta).toBeCloseTo(5, 1);
    expect(c.keyRelation).toBeNull();
  });

  it('uses double/half time when closer', () => {
    expect(harmonicCompat(mix(70, null), mix(140, null)).bpmDelta).toBeCloseTo(0, 1);
    expect(harmonicCompat(mix(140, null), mix(72, null)).bpmDelta).toBeCloseTo(2.9, 1);
  });

  it('classifies key relations on the wheel', () => {
    expect(harmonicCompat(mix(null, '8A'), mix(null, '8A')).keyRelation).toBe('same');
    expect(harmonicCompat(mix(null, '8A'), mix(null, '9A')).keyRelation).toBe('adjacent');
    expect(harmonicCompat(mix(null, '8A'), mix(null, '8B')).keyRelation).toBe('energy-boost');
    expect(harmonicCompat(mix(null, '8A'), mix(null, '3A')).keyRelation).toBe('clash');
  });

  it('wraps the wheel: 12 and 1 are adjacent', () => {
    expect(harmonicCompat(mix(null, '12A'), mix(null, '1A')).keyRelation).toBe('adjacent');
    expect(harmonicCompat(mix(null, '1B'), mix(null, '12B')).keyRelation).toBe('adjacent');
  });

  it('scores perfect pairings 1 and clashes low', () => {
    expect(harmonicCompat(mix(120, '8A'), mix(120, '8A')).score).toBe(1);
    expect(harmonicCompat(mix(120, '8A'), mix(150, '3A')).score).toBeLessThan(0.25);
  });

  it('missing data is neutral, never a penalty', () => {
    const none = harmonicCompat(mix(null, null), mix(null, null));
    expect(none.bpmDelta).toBeNull();
    expect(none.keyRelation).toBeNull();
    expect(none.score).toBe(0.5);
    // one-sided data: only the available component counts
    expect(harmonicCompat(mix(120, null), mix(120, null)).score).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

`npm test -- compat` → FAIL (module not found).

- [ ] **Step 3: Implement**

`lib/curation/mix/compat.ts`:

```ts
import type { MixInfo } from './types';

export interface MixCompat {
  bpmDelta: number | null; // % change vs. best of straight/double/half time
  keyRelation: 'same' | 'adjacent' | 'energy-boost' | 'clash' | null;
  score: number; // 0-1 blended mixability; 0.5 when no data at all
}

const KEY_SCORE: Record<NonNullable<MixCompat['keyRelation']>, number> = {
  same: 1,
  adjacent: 0.9,
  'energy-boost': 0.75,
  clash: 0.2,
};

function parseCamelot(code: string): { num: number; letter: 'A' | 'B' } | null {
  const m = code.match(/^([1-9]|1[0-2])([AB])$/);
  return m ? { num: Number(m[1]), letter: m[2] as 'A' | 'B' } : null;
}

export function harmonicCompat(a: MixInfo, b: MixInfo): MixCompat {
  let bpmDelta: number | null = null;
  if (a.bpm && b.bpm) {
    const ratios = [b.bpm / a.bpm, (b.bpm * 2) / a.bpm, b.bpm / (a.bpm * 2)];
    const best = ratios.reduce((r, x) => (Math.abs(x - 1) < Math.abs(r - 1) ? x : r));
    bpmDelta = (best - 1) * 100;
  }

  let keyRelation: MixCompat['keyRelation'] = null;
  const ka = a.camelotKey ? parseCamelot(a.camelotKey) : null;
  const kb = b.camelotKey ? parseCamelot(b.camelotKey) : null;
  if (ka && kb) {
    const dist = Math.min(Math.abs(ka.num - kb.num), 12 - Math.abs(ka.num - kb.num));
    if (ka.num === kb.num && ka.letter === kb.letter) keyRelation = 'same';
    else if (ka.letter === kb.letter && dist === 1) keyRelation = 'adjacent';
    else if (ka.num === kb.num) keyRelation = 'energy-boost';
    else keyRelation = 'clash';
  }

  const parts: number[] = [];
  if (bpmDelta !== null) parts.push(Math.max(0, Math.min(1, 1 - Math.abs(bpmDelta) / 12)));
  if (keyRelation !== null) parts.push(KEY_SCORE[keyRelation]);
  const score = parts.length ? parts.reduce((s, x) => s + x, 0) / parts.length : 0.5;

  return { bpmDelta, keyRelation, score };
}
```

- [ ] **Step 4: Green + full suite**

`npm test` → all passing.

- [ ] **Step 5: Commit**

```bash
git add lib/curation/mix/compat.ts tests/curation/compat.test.ts
git commit -m "Add harmonic compatibility scoring (bpm window + Camelot relations)"
```

---

### Task 4: Source clients — GetSongBPM + Deezer (parsers TDD, then live verify)

**Files:**
- Create: `lib/curation/mix/sources.ts`
- Test: `tests/curation/mixSources.test.ts`

**Interfaces:**
- Consumes: `toCamelot` (Task 2).
- Produces: `lookupMix(artistName: string, trackName: string): Promise<MixLookup>` where `MixLookup { bpm: number | null; camelotKey: string | null; source: 'getsongbpm' | 'deezer' | null }`; `RateLimitError` class; exported pure parsers `parseGetSongBpm(json: unknown, artistName: string): { bpm: number | null; camelotKey: string | null } | null` and `parseDeezerTrack(json: unknown): number | null`. Used by Task 5.

- [ ] **Step 1: Write the failing parser tests**

`tests/curation/mixSources.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseGetSongBpm, parseDeezerTrack } from '@/lib/curation/mix/sources';

const gsbFixture = {
  search: [
    {
      song_title: 'Near Light',
      tempo: '122',
      key_of: 'F♯m',
      artist: { name: 'Ólafur Arnalds' },
    },
    { song_title: 'Other', tempo: '90', key_of: 'C', artist: { name: 'Somebody Else' } },
  ],
};

describe('parseGetSongBpm', () => {
  it('takes the first artist-matched result, folding diacritics', () => {
    const r = parseGetSongBpm(gsbFixture, 'Olafur Arnalds');
    expect(r).toEqual({ bpm: 122, camelotKey: '11A' });
  });

  it('rejects results whose artist does not match', () => {
    expect(parseGetSongBpm(gsbFixture, 'Röyksopp')).toBeNull();
  });

  it('handles the no-result error shape and garbage', () => {
    expect(parseGetSongBpm({ search: { error: 'no result' } }, 'X')).toBeNull();
    expect(parseGetSongBpm(null, 'X')).toBeNull();
  });

  it('null key and out-of-range bpm are dropped, not fatal', () => {
    const r = parseGetSongBpm(
      { search: [{ song_title: 'T', tempo: '300', key_of: '?', artist: { name: 'A' } }] },
      'A'
    );
    expect(r).toEqual({ bpm: null, camelotKey: null });
  });
});

describe('parseDeezerTrack', () => {
  it('extracts bpm and treats 0 as no data', () => {
    expect(parseDeezerTrack({ bpm: 124.5 })).toBe(124.5);
    expect(parseDeezerTrack({ bpm: 0 })).toBeNull();
    expect(parseDeezerTrack({})).toBeNull();
  });

  it('applies the sanity range', () => {
    expect(parseDeezerTrack({ bpm: 20 })).toBeNull();
    expect(parseDeezerTrack({ bpm: 500 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

`npm test -- mixSources` → FAIL (module not found).

- [ ] **Step 3: Implement**

`lib/curation/mix/sources.ts`:

```ts
import { toCamelot } from './camelot';

export interface MixLookup {
  bpm: number | null;
  camelotKey: string | null;
  source: 'getsongbpm' | 'deezer' | null;
}

export class RateLimitError extends Error {}

const GSB_ROOT = 'https://api.getsong.co';

function fold(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function sanityBpm(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v >= 40 && v <= 220 ? v : null;
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
  const lookup = encodeURIComponent(`song:${trackName} artist:${artistName}`);
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
```

- [ ] **Step 4: Green + full suite**

`npm test` → all passing.

- [ ] **Step 5: Live verify (needs GETSONGBPM_API_KEY in .env.local)**

```bash
source .env.local && GETSONGBPM_API_KEY=$GETSONGBPM_API_KEY npx tsx -e "
import { lookupMix } from './lib/curation/mix/sources';
console.log(await lookupMix('Röyksopp', 'What Else Is There?'));
console.log(await lookupMix('Ólafur Arnalds', 'Near Light'));
"
```

Expected: real bpm values (and camelotKey when GSB has the song). **If the response shape differs from the fixture** (GetSongBPM has changed hosts/fields before), adjust `parseGetSongBpm` + fixture to the real shape and re-run Steps 1-5. If the key isn't registered yet, skip this step, note it in the commit body, and Task 9 re-verifies live.

- [ ] **Step 6: Commit**

```bash
git add lib/curation/mix/sources.ts tests/curation/mixSources.test.ts
git commit -m "Add GetSongBPM/Deezer lookup chain with validated parsing"
```

---

### Task 5: `enrichMixData` + `POST /api/curation/enrich/mix`

**Files:**
- Create: `lib/curation/enrichMixData.ts`
- Create: `app/api/curation/enrich/mix/route.ts`

**Interfaces:**
- Consumes: `lookupMix`, `RateLimitError` (Task 4); `tracks` mix columns (Task 1).
- Produces: `enrichMixData(limit: number): Promise<EnrichMixResult>` where `EnrichMixResult { considered: number; enriched: number; bpmOnly: number; noData: number; rateLimited: boolean; errors: string[] }`; the authed route. Used operationally by Task 9's sweep.

- [ ] **Step 1: Implement `lib/curation/enrichMixData.ts`**

```ts
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
        : { bpm: null, camelotKey: null, source: null as const };
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
```

- [ ] **Step 2: Implement the route**

`app/api/curation/enrich/mix/route.ts` (same shape as `enrich/tags/route.ts`):

```ts
import { NextResponse } from 'next/server';
import { enrichMixData } from '@/lib/curation/enrichMixData';
import { getSession } from '@/lib/auth/getSession';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    let limit = 100;
    try {
      const body = await request.json();
      if (typeof body?.limit === 'number' && body.limit > 0) {
        limit = Math.floor(body.limit);
      }
    } catch {
      // Empty body is fine.
    }
    const result = await enrichMixData(limit);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('❌ enrich/mix error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify gates + small live batch (needs API key + logged-in cookie; skip live if key absent, Task 9 covers it)**

`npx tsc --noEmit` clean; `npm test` green. Live smoke (dev server running, use the browser's logged-in session or curl with the session cookie):

```bash
# from the browser devtools console on http://127.0.0.1:3000/curate:
# fetch('/api/curation/enrich/mix', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{"limit":5}'}).then(r=>r.json()).then(console.log)
source .env.local; psql "$DATABASE_URL" -c "SELECT track_name, bpm, camelot_key, mix_source FROM tracks WHERE mix_checked_at IS NOT NULL LIMIT 5;"
```

Expected: 5 rows stamped, most with bpm.

- [ ] **Step 4: Commit**

```bash
git add lib/curation/enrichMixData.ts app/api/curation/enrich/mix/route.ts
git commit -m "Add batch mix enrichment (GetSongBPM->Deezer) behind authed route"
```

---

### Task 6: Plumb mix data through scorer → pool → director → client types

**Files:**
- Modify: `lib/curation/candidateScorer.ts` (CandidateTrack ~36, TrackRow ~65, select ~117, toCandidate ~413)
- Modify: `lib/curation/agent/types.ts` (PoolTrack)
- Modify: `lib/curation/agent/buildPool.ts` (fromCandidate + discovered branch)
- Modify: `lib/curation/agent/director.ts` (pool lines + system prompt)
- Modify: `app/curate/types.ts` (SetTrack)
- Test: `tests/curation/buildPool.test.ts` (extend fixture)

**Interfaces:**
- Consumes: `tracks.bpm`/`tracks.camelotKey` columns (Task 1).
- Produces: `bpm: number | null; camelotKey: string | null` on `CandidateTrack`, `PoolTrack`, and `SetTrack` — everything downstream (route spreads, UI) inherits them. Used by Tasks 7, 8.

- [ ] **Step 1: candidateScorer.ts — four spots**

`CandidateTrack` interface — add after `albumImageUrl`:

```ts
  bpm: number | null;
  camelotKey: string | null;
```

`TrackRow` interface — add the same two fields. The `.select({...})` from `tracks` — add:

```ts
      bpm: tracks.bpm,
      camelotKey: tracks.camelotKey,
```

`toCandidate` — add to the returned object:

```ts
      bpm: t.bpm,
      camelotKey: t.camelotKey,
```

- [ ] **Step 2: agent/types.ts — PoolTrack gains the same two nullable fields** (after `albumImageUrl`):

```ts
  bpm: number | null;
  camelotKey: string | null;
```

- [ ] **Step 3: buildPool.ts** — in `fromCandidate` add `bpm: c.bpm, camelotKey: c.camelotKey,`; in the discovered-track branch add `bpm: null, camelotKey: null,` (discoveries get enriched by later sweeps).

- [ ] **Step 4: director.ts** — pool line gains mix segments. In the `poolLines` template, after the `energy` segment insert:

```ts
${p.bpm != null ? ` | bpm:${Math.round(p.bpm)}` : ''}${p.camelotKey ? ` | key:${p.camelotKey}` : ''}
```

(inline in the template literal, matching its single-line style). System prompt: after the "Adjacent tracks should flow" rule, add:

```
- When bpm/key data is present, prefer adjacent tracks within ±6% BPM (double/half-time counts as matching) and harmonically compatible Camelot keys (same code, ±1 same letter with 12↔1 wrap, or same number other letter). Missing data is not a penalty. Call out deliberate rule-breaks in the transition note.
```

- [ ] **Step 5: app/curate/types.ts — SetTrack gains** (after `albumImageUrl`):

```ts
  bpm: number | null;
  camelotKey: string | null;
```

- [ ] **Step 6: Fix compile fallout + extend the buildPool fixture**

`npx tsc --noEmit` — the `cand()` fixture helper in `tests/curation/buildPool.test.ts` needs `bpm: null, camelotKey: null` (add `bpm: 122, camelotKey: '8A'` to one fixture track and assert they arrive on the PoolTrack). Any other missing-field errors: add the two nullable fields at the reported construction sites — do not silence with casts.

- [ ] **Step 7: Green + commit**

`npm test` all passing.

```bash
git add lib/curation/candidateScorer.ts lib/curation/agent/types.ts lib/curation/agent/buildPool.ts lib/curation/agent/director.ts app/curate/types.ts tests/curation/buildPool.test.ts
git commit -m "Plumb bpm/camelotKey from tracks through scorer, pool, director, and client types"
```

---

### Task 7: Harmonic-aware `smoothTransitions` (TDD)

**Files:**
- Modify: `lib/curation/smoothTransitions.ts`
- Test: `tests/curation/smoothTransitions.test.ts` (extend)

**Interfaces:**
- Consumes: `harmonicCompat` (Task 3).
- Produces: same export, widened generic: `smoothTransitions<T extends { energy: number; bpm?: number | null; camelotKey?: string | null }>(items: T[]): T[]`. Callers (CurateClient) need no change.

- [ ] **Step 1: Write the failing tests** — add to `tests/curation/smoothTransitions.test.ts`:

```ts
describe('harmonic blend', () => {
  const t = (id: string, energy: number, bpm: number | null, camelotKey: string | null) => ({
    id, energy, bpm, camelotKey,
  });

  it('prefers the harmonic neighbor over an equal-energy clash', () => {
    // both b and c are equidistant in energy from the opener; only b is key-compatible
    const opener = t('open', 0.5, 120, '8A');
    const clash = t('clash', 0.6, 121, '3A');
    const harmonic = t('harm', 0.4, 122, '9A');
    const outro = t('out', 0.2, 100, '5A');
    const out = smoothTransitions([opener, clash, harmonic, outro]).map((x) => x.id);
    expect(out).toEqual(['open', 'harm', 'clash', 'out']);
  });

  it('regression: identical to energy-only ordering when no mix data', () => {
    const bare = (id: string, energy: number) => ({ id, energy });
    const items = [bare('a', 0.5), bare('b', 0.9), bare('c', 0.55), bare('d', 0.2)];
    const withNulls = items.map((x) => ({ ...x, bpm: null, camelotKey: null }));
    expect(smoothTransitions(withNulls).map((x) => x.id)).toEqual(
      smoothTransitions(items).map((x) => x.id)
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

`npm test -- smoothTransitions` → the new "prefers the harmonic neighbor" test FAILS (current code ignores mix data; energy tie broken by array order picks `clash` first).

- [ ] **Step 3: Implement** — replace `lib/curation/smoothTransitions.ts` body:

```ts
// Greedy nearest-neighbor reorder of the middle of a set to minimize
// adjacent jumps. Cost blends energy distance with harmonic mixability
// (bpm/Camelot) when both tracks carry mix data; without it the cost is
// energy distance alone — identical to the pre-Phase-2 behavior.
// Opener and outro stay pinned (chosen deliberately upstream).

import { harmonicCompat } from './mix/compat';

type Mixable = { energy: number; bpm?: number | null; camelotKey?: string | null };

function hasMixData(t: Mixable): boolean {
  return t.bpm != null || t.camelotKey != null;
}

function cost(from: Mixable, to: Mixable): number {
  const energyDist = Math.abs(to.energy - from.energy);
  if (!hasMixData(from) || !hasMixData(to)) return energyDist;
  const compat = harmonicCompat(
    { bpm: from.bpm ?? null, camelotKey: from.camelotKey ?? null },
    { bpm: to.bpm ?? null, camelotKey: to.camelotKey ?? null }
  );
  return (energyDist + (1 - compat.score)) / 2;
}

export function smoothTransitions<T extends Mixable>(items: T[]): T[] {
  if (items.length <= 3) return [...items];

  const opener = items[0];
  const outro = items[items.length - 1];
  const pool = items.slice(1, -1);

  const ordered: T[] = [];
  let current: T = opener;
  while (pool.length > 0) {
    let bestIdx = 0;
    let bestCost = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = cost(current, pool[i]);
      if (c < bestCost) {
        bestCost = c;
        bestIdx = i;
      }
    }
    const next = pool.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next;
  }

  return [opener, ...ordered, outro];
}
```

- [ ] **Step 4: Green + full suite**

`npm test` → all passing, including the pre-existing energy-only tests (they use bare `{energy}` objects → cost path unchanged).

- [ ] **Step 5: Commit**

```bash
git add lib/curation/smoothTransitions.ts tests/curation/smoothTransitions.test.ts
git commit -m "Blend harmonic mixability into smoothTransitions cost"
```

---

### Task 8: UI — slot-panel mix line, transition compat chip, attribution

**Files:**
- Modify: `app/curate/SetTimeline.tsx` (slot panel)
- Modify: `app/curate/CurateClient.tsx` (footer attribution)

**Interfaces:**
- Consumes: `SetTrack.bpm`/`camelotKey` (Task 6), `harmonicCompat` (Task 3 — pure, client-safe).

- [ ] **Step 1: SetTimeline slot panel — metadata line**

Import at top: `import { harmonicCompat } from '@/lib/curation/mix/compat';`

Replace the artist/energy line:

```tsx
              <p className="truncate text-xs text-[var(--color-text-secondary)]">
                {set[openSlot].artistNames.join(', ')} · energy {set[openSlot].energy.toFixed(2)}
                {set[openSlot].bpm != null && <> · {Math.round(set[openSlot].bpm!)} BPM</>}
                {set[openSlot].camelotKey && <> · {set[openSlot].camelotKey}</>}
              </p>
```

- [ ] **Step 2: SetTimeline — compat chip beside the transition-in note**

Replace the existing transition-note IIFE with:

```tsx
          {(() => {
            const t = transitions.find((tr) => tr.fromIndex === openSlot - 1);
            const prev = openSlot > 0 ? set[openSlot - 1] : null;
            const cur = set[openSlot];
            const compat =
              prev && (prev.bpm != null || prev.camelotKey) && (cur.bpm != null || cur.camelotKey)
                ? harmonicCompat(
                    { bpm: prev.bpm, camelotKey: prev.camelotKey },
                    { bpm: cur.bpm, camelotKey: cur.camelotKey }
                  )
                : null;
            const chipClass =
              compat?.keyRelation === 'clash'
                ? 'bg-red-500/15 text-red-300'
                : compat?.keyRelation === 'energy-boost'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-emerald-500/15 text-emerald-300';
            const chipLabel = compat
              ? [
                  prev?.camelotKey && cur.camelotKey ? `${prev.camelotKey}→${cur.camelotKey}` : null,
                  compat.bpmDelta != null
                    ? `${compat.bpmDelta >= 0 ? '+' : ''}${compat.bpmDelta.toFixed(1)}%`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : null;
            if (!t && !chipLabel) return null;
            return (
              <p className="mt-1 text-xs text-[var(--color-primary)]">
                {t && <>↪ transition in: {t.note}</>}
                {chipLabel && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${chipClass}`}>
                    ⚡ {chipLabel}
                  </span>
                )}
              </p>
            );
          })()}
```

(The chip is computed from the *current* adjacent pair, so it stays truthful through drags/swaps even when the director's prose note describes the original order.)

- [ ] **Step 3: CurateClient footer attribution** — after the tabs `<section>`, before `{pushOpen && ...}`:

```tsx
        <p className="text-[10px] text-[var(--color-text-secondary)] text-center">
          BPM &amp; key data by{' '}
          <a href="https://getsongbpm.com" target="_blank" rel="noreferrer" className="underline hover:text-white">
            GetSongBPM
          </a>
        </p>
```

- [ ] **Step 4: Verify and commit**

`npx tsc --noEmit` clean; `npm test` green; page renders (spot-check in browser: slot panel shows `· 122 BPM · 8A` for an enriched track once Task 9's sweep has run; chip absent for unenriched pairs).

```bash
git add app/curate/SetTimeline.tsx app/curate/CurateClient.tsx
git commit -m "Surface BPM/Camelot in slot panel with transition compat chip and attribution"
```

---

### Task 9: Library sweep + end-to-end verification

**Files:** none (operational + verification; fixes go where the defect lives)

- [ ] **Step 1: Static + build gates**

`npx tsc --noEmit` clean; `npm test` all passing; `npm run build` succeeds.

- [ ] **Step 2: Run the enrichment sweep (needs GETSONGBPM_API_KEY in .env.local + owner login)**

From the logged-in browser console on http://127.0.0.1:3000/curate, repeatedly (each call ≈ limit × 0.7s+, stay under the 300s route cap):

```js
fetch('/api/curation/enrich/mix', {method:'POST', headers:{'Content-Type':'application/json'}, body:'{"limit":300}'}).then(r=>r.json()).then(console.log)
```

Track progress between calls:

```bash
source .env.local; psql "$DATABASE_URL" -c "SELECT count(*) FILTER (WHERE mix_checked_at IS NOT NULL) AS checked, count(*) FILTER (WHERE bpm IS NOT NULL) AS with_bpm, count(*) FILTER (WHERE camelot_key IS NOT NULL) AS with_key, count(*) AS total FROM tracks;"
```

Full sweep = ~18 calls. If `rateLimited: true` comes back, pause and resume later (un-stamped rows retry). Report final coverage percentages. (A partial sweep — a few thousand tracks — is enough to proceed to Step 3; finish the tail afterward.)

- [ ] **Step 3: Browser E2E on http://127.0.0.1:3000/curate**

1. Generate (balanced, 2 seeds): slot panel shows `· N BPM · XY` on enriched tracks; transition chip appears between enriched pairs, colored by relation; unenriched pairs show no chip.
2. Toggle "smooth transitions" on a set with mix data: order may change; toggling off restores; no console errors.
3. Drag a track next to a key-clashing neighbor: chip turns red with the current pair's codes (proves client-side computation).
4. Fallback/regression: tracks without mix data render exactly as before (no stray `·` separators).

- [ ] **Step 4: Update ledger, clean status**

`git status --short` → expect clean. Any fixes discovered above are committed where they belong. Then superpowers:finishing-a-development-branch.
