# Curation UI ("Deck") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/curate` page where the owner logs in with Spotify, picks seed tracks, generates a mix-aware sequenced set from the candidate scorer, refines it (reorder/remove/swap), and pushes it to Spotify as a private playlist.

**Architecture:** Deck layout — the set as an energy-arc timeline on top, tabbed source browser (Search/Vibes/Sessions/Shape) below. All builder state client-side; thin API routes over `lib/curation/*`. Spotify OAuth session (encrypted httpOnly cookie, single authorized user ID) gates all mutating routes; playlist push uses the session's token.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Tailwind + `--color-*` CSS vars, Drizzle/Postgres, vitest (new), Node `crypto` for session sealing, native HTML5 drag-and-drop.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-24-curation-ui-design.md`.
- Path alias `@/*` maps to repo root (see `tsconfig.json`).
- All new UI follows existing conventions: dark theme, Tailwind classes, `var(--color-text-primary)` / `var(--color-primary)` / `var(--color-vibrant-safe)` CSS vars.
- No new runtime dependencies except `vitest` (dev). Drag-and-drop is native HTML5.
- Env vars added by this plan: `SESSION_SECRET` (random 32+ bytes hex), `OWNER_SPOTIFY_USER_ID`. Existing: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `NEXT_PUBLIC_HOST`, `DATABASE_URL`.
- Manual precondition (user does this once): add `http://localhost:3000/api/auth/callback` (and the production equivalent) as a Redirect URI in the Spotify developer dashboard for the existing app.
- Session cookie name is `curation_session` everywhere.
- Route handlers follow the existing pattern: `export const dynamic = 'force-dynamic'`, JSON `{ success: boolean, ... }` bodies, try/catch returning 500 with `{ success: false, error }`.
- Commit after every task (steps include the commands). Branch: `curation-ui`.

---

### Task 1: Vitest infrastructure + energy model

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/curation/energy.ts`
- Create: `tests/curation/energy.test.ts`
- Modify: `package.json` (add `test` script + vitest devDependency)

**Interfaces:**
- Consumes: `VIBE_TAGS` names from `lib/curation/vibeVocabulary.ts` (read-only reference).
- Produces: `energyFromTags(tags: string[]): number` (0–1), `DEFAULT_ENERGY = 0.5`. Task 2 and the UI (Tasks 11/13) import `energyFromTags` from `@/lib/curation/energy`.

- [ ] **Step 1: Install vitest and add config + script**

```bash
npm install -D vitest
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

In `package.json` scripts, after `"lint"`, add:

```json
    "test": "vitest run",
```

- [ ] **Step 2: Write the failing test**

Create `tests/curation/energy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { energyFromTags, DEFAULT_ENERGY } from '@/lib/curation/energy';

describe('energyFromTags', () => {
  it('returns DEFAULT_ENERGY for no tags', () => {
    expect(energyFromTags([])).toBe(DEFAULT_ENERGY);
  });

  it('returns DEFAULT_ENERGY when no tag is energy-mapped', () => {
    expect(energyFromTags(['summer', 'retro-80s'])).toBe(DEFAULT_ENERGY);
  });

  it('rates high-energy tags high', () => {
    expect(energyFromTags(['high-energy', 'dancefloor'])).toBeGreaterThan(0.7);
  });

  it('rates ambient/low tags low', () => {
    expect(energyFromTags(['ambient', 'low-energy'])).toBeLessThan(0.3);
  });

  it('averages mapped tags and ignores unmapped ones', () => {
    const withNoise = energyFromTags(['high-energy', 'ambient', 'summer']);
    const withoutNoise = energyFromTags(['high-energy', 'ambient']);
    expect(withNoise).toBeCloseTo(withoutNoise, 5);
  });

  it('is clamped to [0, 1]', () => {
    const v = energyFromTags(['frenetic', 'high-energy', 'workout']);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/curation/energy`.

- [ ] **Step 4: Implement `lib/curation/energy.ts`**

```ts
// Maps vibe tags (see vibeVocabulary.ts) to a 0-1 energy estimate.
// v1 of mix-awareness: replaced/augmented by real BPM/key enrichment later
// behind this same function signature.

export const DEFAULT_ENERGY = 0.5;

const ENERGY_BY_TAG: Record<string, number> = {
  // energy / intensity
  'high-energy': 0.95,
  frenetic: 0.95,
  pulsing: 0.85,
  'mid-tempo': 0.5,
  'slow-burn': 0.3,
  'low-energy': 0.15,
  meditative: 0.1,
  // scene / setting
  dancefloor: 0.85,
  club: 0.8,
  'house-party': 0.8,
  'pre-game': 0.75,
  workout: 0.85,
  running: 0.8,
  driving: 0.55,
  'road-trip': 0.55,
  study: 0.25,
  'work-focus': 0.3,
  'background-listening': 0.25,
  'cocktail-hour': 0.45,
  'dinner-party': 0.4,
  // emotional register
  euphoric: 0.8,
  cathartic: 0.65,
  playful: 0.6,
  hopeful: 0.55,
  sensual: 0.4,
  romantic: 0.35,
  tender: 0.25,
  contemplative: 0.2,
  melancholic: 0.3,
  wistful: 0.3,
  lonely: 0.25,
  // sonic palette / genre-ish
  punk: 0.8,
  metal: 0.85,
  'hip-hop': 0.65,
  electronic: 0.6,
  'indie-rock': 0.6,
  'r-n-b': 0.5,
  soul: 0.45,
  jazz: 0.4,
  'dream-pop': 0.4,
  shoegaze: 0.5,
  cinematic: 0.45,
  orchestral: 0.4,
  classical: 0.3,
  folk: 0.35,
  'singer-songwriter': 0.35,
  acoustic: 0.3,
  ambient: 0.1,
  sparse: 0.25,
  // time of day
  'late-night': 0.4,
  'after-hours': 0.35,
};

export function energyFromTags(tags: string[]): number {
  const mapped = tags
    .map((t) => ENERGY_BY_TAG[t])
    .filter((v): v is number => v !== undefined);
  if (mapped.length === 0) return DEFAULT_ENERGY;
  const avg = mapped.reduce((s, v) => s + v, 0) / mapped.length;
  return Math.max(0, Math.min(1, avg));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts lib/curation/energy.ts tests/curation/energy.test.ts package.json package-lock.json
git commit -m "Add vitest infra and tag-based energy model"
```

---

### Task 2: Transition smoothing

**Files:**
- Create: `lib/curation/smoothTransitions.ts`
- Test: `tests/curation/smoothTransitions.test.ts`

**Interfaces:**
- Produces: `smoothTransitions<T extends { energy: number }>(items: T[]): T[]` — returns a NEW array; first and last elements pinned; middle greedily reordered to minimize adjacent energy deltas. Imported by the UI (Task 13) from `@/lib/curation/smoothTransitions`.

- [ ] **Step 1: Write the failing test**

Create `tests/curation/smoothTransitions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { smoothTransitions } from '@/lib/curation/smoothTransitions';

const t = (id: string, energy: number) => ({ id, energy });

describe('smoothTransitions', () => {
  it('returns arrays of length <= 3 unchanged (new array)', () => {
    const items = [t('a', 0.9), t('b', 0.1), t('c', 0.5)];
    const out = smoothTransitions(items);
    expect(out).toEqual(items);
    expect(out).not.toBe(items);
  });

  it('pins first and last elements', () => {
    const items = [t('open', 0.7), t('x', 0.2), t('y', 0.9), t('z', 0.5), t('outro', 0.1)];
    const out = smoothTransitions(items);
    expect(out[0].id).toBe('open');
    expect(out[out.length - 1].id).toBe('outro');
  });

  it('preserves all elements', () => {
    const items = [t('a', 0.7), t('b', 0.2), t('c', 0.9), t('d', 0.5), t('e', 0.1)];
    const out = smoothTransitions(items);
    expect(out.map((i) => i.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('reduces total adjacent energy jump for a jumpy input', () => {
    const items = [t('a', 0.5), t('b', 0.9), t('c', 0.1), t('d', 0.8), t('e', 0.2), t('f', 0.5)];
    const jump = (arr: { energy: number }[]) =>
      arr.slice(1).reduce((s, cur, i) => s + Math.abs(cur.energy - arr[i].energy), 0);
    const out = smoothTransitions(items);
    expect(jump(out)).toBeLessThan(jump(items));
  });

  it('greedy pick walks to nearest energy neighbor from the opener', () => {
    const items = [t('open', 0.6), t('far', 0.1), t('near', 0.55), t('outro', 0.3)];
    const out = smoothTransitions(items);
    expect(out.map((i) => i.id)).toEqual(['open', 'near', 'far', 'outro']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/curation/smoothTransitions`.

- [ ] **Step 3: Implement `lib/curation/smoothTransitions.ts`**

```ts
// Greedy nearest-neighbor reorder of the middle of a set to minimize
// adjacent energy jumps. Opener and outro stay pinned (the candidate
// scorer chose them deliberately).

export function smoothTransitions<T extends { energy: number }>(items: T[]): T[] {
  if (items.length <= 3) return [...items];

  const opener = items[0];
  const outro = items[items.length - 1];
  const pool = items.slice(1, -1);

  const ordered: T[] = [];
  let current = opener.energy;
  while (pool.length > 0) {
    let bestIdx = 0;
    let bestDelta = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const d = Math.abs(pool[i].energy - current);
      if (d < bestDelta) {
        bestDelta = d;
        bestIdx = i;
      }
    }
    const next = pool.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next.energy;
  }

  return [opener, ...ordered, outro];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all tests, both files).

- [ ] **Step 5: Commit**

```bash
git add lib/curation/smoothTransitions.ts tests/curation/smoothTransitions.test.ts
git commit -m "Add energy-based transition smoothing"
```

---

### Task 3: Session sealing (encrypted cookie payload)

**Files:**
- Create: `lib/auth/session.ts`
- Test: `tests/auth/session.test.ts`

**Interfaces:**
- Produces: `interface CurationSession { spotifyUserId: string; displayName: string; refreshToken: string }`, `sealSession(s: CurationSession): string`, `unsealSession(token: string): CurationSession | null`, `SESSION_COOKIE = 'curation_session'`. Consumed by Tasks 4, 5, 10, 11.
- Requires env `SESSION_SECRET` at runtime (tests set their own).

- [ ] **Step 1: Write the failing test**

Create `tests/auth/session.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { sealSession, unsealSession, type CurationSession } from '@/lib/auth/session';

const SESSION: CurationSession = {
  spotifyUserId: 'oldski',
  displayName: 'kris',
  refreshToken: 'AQ-example-refresh-token',
};

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-not-for-production';
});

describe('session sealing', () => {
  it('round-trips a session', () => {
    const token = sealSession(SESSION);
    expect(unsealSession(token)).toEqual(SESSION);
  });

  it('produces different ciphertexts per call (random IV)', () => {
    expect(sealSession(SESSION)).not.toBe(sealSession(SESSION));
  });

  it('returns null for a tampered token', () => {
    const token = sealSession(SESSION);
    const tampered = token.slice(0, -4) + (token.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect(unsealSession(tampered)).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(unsealSession('not-a-token')).toBeNull();
    expect(unsealSession('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/auth/session`.

- [ ] **Step 3: Implement `lib/auth/session.ts`**

```ts
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

// AES-256-GCM sealed session stored in an httpOnly cookie. No DB.
// Key derived from SESSION_SECRET; GCM auth tag makes tampering detectable.

export const SESSION_COOKIE = 'curation_session';

export interface CurationSession {
  spotifyUserId: string;
  displayName: string;
  refreshToken: string;
}

function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return createHash('sha256').update(secret).digest();
}

export function sealSession(session: CurationSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function unsealSession(token: string): CurationSession | null {
  try {
    const raw = Buffer.from(token, 'base64url');
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const enc = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    return JSON.parse(json) as CurationSession;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/session.ts tests/auth/session.test.ts
git commit -m "Add AES-GCM session sealing for curation auth"
```

---

### Task 4: Spotify OAuth routes + session helper

**Files:**
- Create: `lib/auth/getSession.ts`
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/callback/route.ts`
- Create: `app/api/auth/logout/route.ts`

**Interfaces:**
- Consumes: `sealSession`, `unsealSession`, `SESSION_COOKIE`, `CurationSession` from `@/lib/auth/session` (Task 3).
- Produces: `getSession(): Promise<CurationSession | null>` from `@/lib/auth/getSession` — returns null unless the cookie unseals AND `spotifyUserId === process.env.OWNER_SPOTIFY_USER_ID`. Consumed by Tasks 5, 10, 11.
- Env: requires `OWNER_SPOTIFY_USER_ID`, `SESSION_SECRET` added to `.env.local`. Owner's Spotify user ID is the "Username" at https://www.spotify.com/account/profile.

- [ ] **Step 1: Add env vars**

Append to the main repo's `.env.local` (the worktree symlinks it). Generate the secret:

```bash
echo "SESSION_SECRET=$(openssl rand -hex 32)" 
echo "OWNER_SPOTIFY_USER_ID=<ask user — their Spotify username>"
```

The implementer cannot know the owner's Spotify username: **stop and ask the user** for it if it isn't already in `.env.local`. Restart the dev server after editing.

- [ ] **Step 2: Implement `lib/auth/getSession.ts`**

```ts
import { cookies } from 'next/headers';
import { unsealSession, SESSION_COOKIE, type CurationSession } from './session';

// Returns the session only if it belongs to the authorized owner.
export async function getSession(): Promise<CurationSession | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = unsealSession(token);
  if (!session) return null;
  if (session.spotifyUserId !== process.env.OWNER_SPOTIFY_USER_ID) return null;
  return session;
}
```

- [ ] **Step 3: Implement `app/api/auth/login/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_HOST}/api/auth/callback`,
    scope: 'playlist-modify-private playlist-modify-public',
    state,
  });
  const res = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  res.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });
  return res;
}
```

- [ ] **Step 4: Implement `app/api/auth/callback/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { sealSession, SESSION_COOKIE } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = request.headers.get('cookie')?.match(/oauth_state=([^;]+)/)?.[1];
  const home = process.env.NEXT_PUBLIC_HOST!;

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
```

- [ ] **Step 5: Implement `app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
```

- [ ] **Step 6: Verify manually**

Run: `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/api/auth/login`
Expected: `307 https://accounts.spotify.com/authorize?client_id=...&scope=playlist-modify-private+playlist-modify-public...`

Full login can only be verified in a browser AFTER the user adds the redirect URI in the Spotify dashboard — defer end-to-end check to Task 11.

- [ ] **Step 7: Commit**

```bash
git add lib/auth/getSession.ts app/api/auth
git commit -m "Add Spotify OAuth login/callback/logout with owner-gated session"
```

---

### Task 5: Guard mutating curation routes

**Files:**
- Modify: `app/api/curation/enrich/sessions/route.ts`
- Modify: `app/api/curation/enrich/artists/route.ts`
- Modify: `app/api/curation/enrich/tags/route.ts`
- Modify: `app/api/curation/candidates/route.ts`

**Interfaces:**
- Consumes: `getSession` from `@/lib/auth/getSession` (Task 4).
- Produces: every mutating curation POST returns `401 { success: false, error: 'Unauthorized' }` without a valid owner session.

- [ ] **Step 1: Add the guard to all four routes**

In each file, add the import and the check at the top of the `POST` function (before any work). Example for `app/api/curation/candidates/route.ts` — apply identically to the three enrich routes:

```ts
import { getSession } from '@/lib/auth/getSession';
```

```ts
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  // ...existing body unchanged
```

(For `enrich/sessions/route.ts` the signature is `POST()` with no request param — keep it that way, just add the guard lines.)

- [ ] **Step 2: Verify 401 without a session**

Run: `curl -s -X POST http://localhost:3000/api/curation/candidates -H 'Content-Type: application/json' -d '{"seedTrackIds":["x"]}'`
Expected: `{"success":false,"error":"Unauthorized"}` (status 401). Same for the three enrich routes.

- [ ] **Step 3: Commit**

```bash
git add app/api/curation
git commit -m "Require owner session on mutating curation routes"
```

---

### Task 6: Track search + shelves route

**Files:**
- Create: `app/api/curation/tracks/route.ts`

**Interfaces:**
- Produces: `GET /api/curation/tracks?q=<text>` | `?shelf=most-played|recent` | `?tags=tag1,tag2`. Response `{ success: true, tracks: TrackHit[] }` where

```ts
interface TrackHit {
  trackId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  durationMs: number;
  albumImageUrl: string | null;
  popularity: number | null;
  plays: number;
}
```

Consumed by the UI (Tasks 11, 12). Read-only — intentionally unauthenticated (spec).

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const BASE_SELECT = sql`
  select
    t.id as "trackId",
    t.spotify_track_id as "spotifyTrackId",
    t.track_name as "trackName",
    t.duration_ms as "durationMs",
    t.album_image_url as "albumImageUrl",
    t.popularity as "popularity",
    array_agg(distinct a.artist_name) as "artistNames",
    count(distinct ph.id)::int as "plays",
    max(ph.played_at) as "lastPlayed"
  from tracks t
  join track_artists ta on ta.track_id = t.id
  join artists a on a.id = ta.artist_id
  left join play_history ph on ph.track_id = t.id
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const shelf = searchParams.get('shelf');
    const tags = searchParams.get('tags')?.split(',').map((t) => t.trim()).filter(Boolean);

    let rows;
    if (q) {
      const pattern = `%${q}%`;
      rows = await db.execute(sql`
        ${BASE_SELECT}
        where t.id in (
          select t2.id from tracks t2
          join track_artists ta2 on ta2.track_id = t2.id
          join artists a2 on a2.id = ta2.artist_id
          where t2.track_name ilike ${pattern} or a2.artist_name ilike ${pattern}
        )
        group by t.id
        order by "plays" desc
        limit 30
      `);
    } else if (tags && tags.length > 0) {
      rows = await db.execute(sql`
        ${BASE_SELECT}
        where t.id in (
          select vt.track_id from vibe_tags vt
          where vt.tag = any(${tags})
          group by vt.track_id
          having count(distinct vt.tag) = ${tags.length}
        )
        group by t.id
        order by "plays" desc
        limit 30
      `);
    } else if (shelf === 'recent') {
      rows = await db.execute(sql`
        ${BASE_SELECT}
        group by t.id
        order by "lastPlayed" desc nulls last
        limit 30
      `);
    } else {
      // default shelf: most-played
      rows = await db.execute(sql`
        ${BASE_SELECT}
        group by t.id
        order by "plays" desc
        limit 30
      `);
    }

    const tracks = [...rows].map((r: any) => ({
      trackId: r.trackId,
      spotifyTrackId: r.spotifyTrackId,
      trackName: r.trackName,
      artistNames: r.artistNames ?? [],
      durationMs: r.durationMs,
      albumImageUrl: r.albumImageUrl,
      popularity: r.popularity,
      plays: r.plays,
    }));

    return NextResponse.json({ success: true, tracks });
  } catch (error: any) {
    console.error('❌ curation/tracks error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify**

Run:
```bash
curl -s 'http://localhost:3000/api/curation/tracks?q=royksopp' | head -c 400
curl -s 'http://localhost:3000/api/curation/tracks?shelf=most-played' | head -c 400
curl -s 'http://localhost:3000/api/curation/tracks?tags=dancefloor,euphoric' | head -c 400
```
Expected: each returns `{"success":true,"tracks":[{...` with sensible hits (search matches Röyksopp; tags query returns tracks carrying BOTH tags).

- [ ] **Step 3: Commit**

```bash
git add app/api/curation/tracks
git commit -m "Add curation track search/shelves/tags route"
```

---

### Task 7: Vibes route

**Files:**
- Create: `app/api/curation/vibes/route.ts`

**Interfaces:**
- Produces: `GET /api/curation/vibes` → `{ success: true, tags: { tag: string; count: number }[], genres: { genre: string; count: number }[] }`. Tags ordered by count desc (all of them); genres top 40. Consumed by Task 12.

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tagRows = await db.execute(sql`
      select tag, count(distinct track_id)::int as count
      from vibe_tags
      group by tag
      order by count desc
    `);
    const genreRows = await db.execute(sql`
      select g as genre, count(*)::int as count
      from (select unnest(genres) as g from artist_genres) s
      group by g
      order by count desc
      limit 40
    `);
    return NextResponse.json({
      success: true,
      tags: [...tagRows],
      genres: [...genreRows],
    });
  } catch (error: any) {
    console.error('❌ curation/vibes error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify**

Run: `curl -s http://localhost:3000/api/curation/vibes | head -c 400`
Expected: `{"success":true,"tags":[{"tag":"electronic","count":...`

- [ ] **Step 3: Commit**

```bash
git add app/api/curation/vibes
git commit -m "Add vibes route (tag and genre counts)"
```

---

### Task 8: Sessions route

**Files:**
- Create: `app/api/curation/sessions/route.ts`

**Interfaces:**
- Produces: `GET /api/curation/sessions` → `{ success: true, sessions: SessionSummary[] }`:

```ts
interface SessionSummary {
  id: string;
  startedAt: string;      // ISO
  trackCount: number;
  hourOfDay: number;
  dayOfWeek: number;      // 0=Sunday
  sampleTracks: { trackId: string; trackName: string }[]; // first 3 by position
}
```

Consumed by Task 12 ("use as seeds" = the sampleTracks' trackIds).

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db.execute(sql`
      select
        s.id,
        s.started_at as "startedAt",
        s.track_count as "trackCount",
        s.hour_of_day as "hourOfDay",
        s.day_of_week as "dayOfWeek",
        coalesce(
          (
            select json_agg(json_build_object('trackId', x.track_id, 'trackName', x.track_name) order by x.position)
            from (
              select distinct on (st.track_id) st.track_id, t.track_name, st.position
              from session_tracks st
              join tracks t on t.id = st.track_id
              where st.session_id = s.id
              order by st.track_id, st.position
            ) x
            where x.position < 3
          ), '[]'::json
        ) as "sampleTracks"
      from listening_sessions s
      where s.track_count >= 3
      order by s.started_at desc
      limit 60
    `);
    return NextResponse.json({ success: true, sessions: [...rows] });
  } catch (error: any) {
    console.error('❌ curation/sessions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify**

Run: `curl -s http://localhost:3000/api/curation/sessions | head -c 500`
Expected: `{"success":true,"sessions":[{"id":...,"sampleTracks":[{...}]` — sessions newest-first, each with up to 3 sample tracks.

- [ ] **Step 3: Commit**

```bash
git add app/api/curation/sessions
git commit -m "Add sessions route for seed browsing"
```

---

### Task 9: Scorer additions — tags, artwork, alternates

**Files:**
- Modify: `lib/curation/candidateScorer.ts`
- Modify: `app/api/curation/candidates/route.ts`

**Interfaces:**
- `RankCandidatesInput` gains `alternatesCount?: number` (default 0).
- `CandidateTrack` gains `albumImageUrl: string | null` and `tags: string[]`.
- `RankCandidatesResult` gains `alternates: CandidateTrack[]` — next-best scored tracks NOT in the chosen set, score-descending.
- Route passes through `alternatesCount` (body field, number, capped at 30).
- Consumed by the UI (Tasks 11, 13) for artwork, energy (via tags), and instant swap.

- [ ] **Step 1: Extend the interfaces in `lib/curation/candidateScorer.ts`**

In `RankCandidatesInput`, after `excludeTrackIds?: string[];` add:

```ts
  alternatesCount?: number;
```

In `CandidateTrack`, after `popularity: number | null;` add:

```ts
  albumImageUrl: string | null;
  tags: string[];
```

In `RankCandidatesResult`, after `totalDurationMs: number;` add:

```ts
  alternates: CandidateTrack[];
```

In the internal `TrackRow` interface, after `popularity: number | null;` add:

```ts
  albumImageUrl: string | null;
```

- [ ] **Step 2: Select artwork in the core track load**

In the "Load core track data" select near the top of `rankCandidates` (the `db.select({...}).from(tracks)` call), add to the selected fields:

```ts
      albumImageUrl: tracks.albumImageUrl,
```

- [ ] **Step 3: Extract a `toCandidate` helper and build alternates**

Replace the existing `const out: CandidateTrack[] = sequenced.map((c) => {...})` block (currently building `out` from `sequenced`) with:

```ts
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
```

And add `alternates,` to the returned object, after `totalDurationMs: totalMs,`.

- [ ] **Step 4: Pass through in the route**

In `app/api/curation/candidates/route.ts`, after the `excludeTrackIds` passthrough, add:

```ts
    if (typeof body.alternatesCount === 'number' && body.alternatesCount > 0) {
      input.alternatesCount = Math.min(30, Math.floor(body.alternatesCount));
    }
```

- [ ] **Step 5: Verify (route is now session-guarded — test via vitest-less script)**

The route needs auth now; verify the lib directly:

```bash
npx tsx --env-file=.env.local -e "
import { rankCandidates } from './lib/curation/candidateScorer';
rankCandidates({ seedTrackIds: ['fc9f7986-7863-46b8-b89f-3d2479634ad1'], alternatesCount: 5 }).then(r => {
  console.log('tracks', r.tracks.length, 'alternates', r.alternates.length);
  console.log('first has tags/art:', r.tracks[0].tags.length > 0, r.tracks[0].albumImageUrl !== undefined);
});"
```

(If `tsx` is unavailable, `npm i -D tsx` first.)
Expected: `tracks <n> alternates 5` and `first has tags/art: true true`.

- [ ] **Step 6: Run `npm test` (regression) and commit**

Run: `npm test` — expected PASS (scorer has no unit tests; this catches accidental breakage of energy/smoothing/session).

```bash
git add lib/curation/candidateScorer.ts app/api/curation/candidates/route.ts package.json package-lock.json
git commit -m "Scorer: expose tags/artwork and ranked alternates for swap"
```

---

### Task 10: Playlist push route

**Files:**
- Create: `lib/auth/spotifyUserToken.ts`
- Create: `app/api/curation/playlist/push/route.ts`

**Interfaces:**
- Consumes: `getSession` (Task 4).
- Produces: `POST /api/curation/playlist/push` body `{ name: string; description?: string; spotifyTrackIds: string[] }` → `{ success: true, playlistUrl: string, playlistId: string }`. Creates a **private** playlist on the session user's account with tracks in order.
- Produces: `accessTokenFromRefresh(refreshToken: string): Promise<string>` from `@/lib/auth/spotifyUserToken`.

- [ ] **Step 1: Implement `lib/auth/spotifyUserToken.ts`**

```ts
// Exchanges a user's OAuth refresh token for a short-lived access token.
export async function accessTokenFromRefresh(refreshToken: string): Promise<string> {
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}
```

- [ ] **Step 2: Implement `app/api/curation/playlist/push/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/getSession';
import { accessTokenFromRefresh } from '@/lib/auth/spotifyUserToken';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : null;
    const ids: unknown = body?.spotifyTrackIds;
    if (!name || !Array.isArray(ids) || ids.length === 0 || !ids.every((x) => typeof x === 'string')) {
      return NextResponse.json(
        { success: false, error: 'name and non-empty spotifyTrackIds are required' },
        { status: 400 }
      );
    }

    const accessToken = await accessTokenFromRefresh(session.refreshToken);
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const createRes = await fetch('https://api.spotify.com/v1/me/playlists', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name,
        description: typeof body.description === 'string' ? body.description : 'Curated with oldski unwrapped',
        public: false,
      }),
    });
    if (!createRes.ok) throw new Error(`playlist create failed: ${createRes.status} ${await createRes.text()}`);
    const playlist = await createRes.json();

    const addRes = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uris: (ids as string[]).map((id) => `spotify:track:${id}`) }),
    });
    if (!addRes.ok) throw new Error(`add tracks failed: ${addRes.status} ${await addRes.text()}`);

    return NextResponse.json({
      success: true,
      playlistId: playlist.id,
      playlistUrl: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`,
    });
  } catch (error: any) {
    console.error('❌ playlist/push error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify unauthenticated rejection**

Run: `curl -s -X POST http://localhost:3000/api/curation/playlist/push -H 'Content-Type: application/json' -d '{"name":"x","spotifyTrackIds":["a"]}'`
Expected: 401 `{"success":false,"error":"Unauthorized"}`. (Authorized end-to-end push is verified in Task 14 via the browser.)

- [ ] **Step 4: Commit**

```bash
git add lib/auth/spotifyUserToken.ts app/api/curation/playlist
git commit -m "Add playlist push route using session token"
```

---

### Task 11: /curate page shell — login gate, state, seed tray, Search tab, Generate

**Files:**
- Create: `app/curate/types.ts`
- Create: `app/curate/page.tsx`
- Create: `app/curate/CurateClient.tsx`
- Create: `app/curate/SeedTray.tsx`
- Create: `app/curate/SearchTab.tsx`

**Interfaces:**
- Consumes: `getSession` (Task 4), `GET /api/curation/tracks` (Task 6), `POST /api/curation/candidates` (Tasks 5/9), `energyFromTags` (Task 1).
- Produces (for Tasks 12/13/14 which extend these files):
  - `app/curate/types.ts` exports `TrackHit`, `SetTrack` (CandidateTrack + `energy: number`), `Filters`.
  - `CurateClient` owns state: `seeds: TrackHit[]`, `set: SetTrack[]`, `alternates: SetTrack[]`, `excluded: string[]`, `filters: Filters`, `generating: boolean`, and callbacks `addSeed(t: TrackHit)`, `removeSeed(trackId: string)`, `generate()`.

- [ ] **Step 1: Create `app/curate/types.ts`**

```ts
export interface TrackHit {
  trackId: string;
  spotifyTrackId: string;
  trackName: string;
  artistNames: string[];
  durationMs: number;
  albumImageUrl: string | null;
  popularity: number | null;
  plays: number;
}

export interface SetTrack {
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
  energy: number;
}

export interface Filters {
  durationMinMinutes: number;
  durationMaxMinutes: number;
  popularityMin: number;
  popularityMax: number;
  genreAllow: string[];
  genreDeny: string[];
}

export const DEFAULT_FILTERS: Filters = {
  durationMinMinutes: 45,
  durationMaxMinutes: 60,
  popularityMin: 0,
  popularityMax: 100,
  genreAllow: [],
  genreDeny: [],
};
```

- [ ] **Step 2: Create `app/curate/page.tsx` (server component gate)**

```tsx
import { getSession } from '@/lib/auth/getSession';
import CurateClient from './CurateClient';

export const dynamic = 'force-dynamic';

export default async function CuratePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string; error?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white p-8">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4 text-[var(--color-text-primary)]">
            Curate<span className="text-[var(--color-vibrant-safe)]">.</span>
          </h1>
          {params.denied ? (
            <p className="mb-6 text-[var(--color-text-secondary)]">
              This is Kris&apos;s kitchen — your Spotify account isn&apos;t authorized to cook here.
            </p>
          ) : params.error ? (
            <p className="mb-6 text-[var(--color-text-secondary)]">
              Login didn&apos;t complete ({params.error}). Try again.
            </p>
          ) : (
            <p className="mb-6 text-[var(--color-text-secondary)]">
              Build mixable sets from your listening history. Log in to start.
            </p>
          )}
          <a
            href="/api/auth/login"
            className="inline-block px-6 py-3 rounded-full bg-[var(--color-primary)] text-black font-semibold hover:opacity-90 transition"
          >
            Log in with Spotify
          </a>
        </div>
      </div>
    );
  }

  return <CurateClient displayName={session.displayName} />;
}
```

- [ ] **Step 3: Create `app/curate/SeedTray.tsx`**

```tsx
'use client';

import type { TrackHit } from './types';

export default function SeedTray({
  seeds,
  onRemove,
  onGenerate,
  generating,
}: {
  seeds: TrackHit[];
  onRemove: (trackId: string) => void;
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap py-3 border-y border-white/10">
      <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
        Seeds
      </span>
      {seeds.length === 0 && (
        <span className="text-sm text-[var(--color-text-secondary)]">
          add tracks from below to anchor the set
        </span>
      )}
      {seeds.map((s) => (
        <button
          key={s.trackId}
          onClick={() => onRemove(s.trackId)}
          className="group flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition text-sm"
          title="Remove seed"
        >
          {s.albumImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.albumImageUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
          )}
          <span className="max-w-48 truncate">{s.trackName}</span>
          <span className="text-white/40 group-hover:text-white/80">✕</span>
        </button>
      ))}
      <button
        onClick={onGenerate}
        disabled={seeds.length === 0 || generating}
        className="ml-auto px-5 py-2 rounded-full font-semibold bg-[var(--color-vibrant-safe)] text-black disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
        title={seeds.length === 0 ? 'Pick at least one seed first' : 'Generate the set'}
      >
        {generating ? 'Generating…' : 'Generate'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/curate/SearchTab.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { TrackHit } from './types';

export default function SearchTab({
  onAddSeed,
  seedIds,
}: {
  onAddSeed: (t: TrackHit) => void;
  seedIds: Set<string>;
}) {
  const [q, setQ] = useState('');
  const [shelf, setShelf] = useState<'most-played' | 'recent'>('most-played');
  const [hits, setHits] = useState<TrackHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = q.trim()
          ? `/api/curation/tracks?q=${encodeURIComponent(q.trim())}`
          : `/api/curation/tracks?shelf=${shelf}`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (data.success) setHits(data.tracks);
      } catch {
        /* aborted or network error — keep previous hits */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q, shelf]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 5,180 tracks or artists…"
          className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[var(--color-primary)] outline-none text-sm"
        />
        {(['most-played', 'recent'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setQ('');
              setShelf(s);
            }}
            className={`px-3 py-2 rounded-lg text-xs uppercase tracking-wide transition ${
              !q && shelf === s ? 'bg-[var(--color-primary)] text-black' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {s === 'most-played' ? 'Most played' : 'Recent'}
          </button>
        ))}
      </div>
      {loading && hits.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
      )}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
        {hits.map((t) => (
          <li key={t.trackId}>
            <button
              onClick={() => onAddSeed(t)}
              disabled={seedIds.has(t.trackId)}
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 transition text-left"
            >
              {t.albumImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.albumImageUrl} alt="" className="w-9 h-9 rounded object-cover" />
              ) : (
                <div className="w-9 h-9 rounded bg-white/10" />
              )}
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm">{t.trackName}</span>
                <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                  {t.artistNames.join(', ')} · {t.plays} plays
                </span>
              </span>
              <span className="text-[var(--color-vibrant-safe)] text-lg leading-none">⊕</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Create `app/curate/CurateClient.tsx`**

```tsx
'use client';

import { useCallback, useState } from 'react';
import { energyFromTags } from '@/lib/curation/energy';
import type { Filters, SetTrack, TrackHit } from './types';
import { DEFAULT_FILTERS } from './types';
import SeedTray from './SeedTray';
import SearchTab from './SearchTab';

type Tab = 'search' | 'vibes' | 'sessions' | 'shape';

export default function CurateClient({ displayName }: { displayName: string }) {
  const [tab, setTab] = useState<Tab>('search');
  const [seeds, setSeeds] = useState<TrackHit[]>([]);
  const [set, setSet] = useState<SetTrack[]>([]);
  const [alternates, setAlternates] = useState<SetTrack[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSeed = useCallback((t: TrackHit) => {
    setSeeds((prev) => (prev.some((s) => s.trackId === t.trackId) ? prev : [...prev, t]));
  }, []);

  const removeSeed = useCallback((trackId: string) => {
    setSeeds((prev) => prev.filter((s) => s.trackId !== trackId));
  }, []);

  const generate = useCallback(async () => {
    if (seeds.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/curation/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedTrackIds: seeds.map((s) => s.trackId),
          durationTargetMs: [
            filters.durationMinMinutes * 60_000,
            filters.durationMaxMinutes * 60_000,
          ],
          popularityRange: [filters.popularityMin, filters.popularityMax],
          ...(filters.genreAllow.length ? { genreAllow: filters.genreAllow } : {}),
          ...(filters.genreDeny.length ? { genreDeny: filters.genreDeny } : {}),
          excludeTrackIds: excluded,
          alternatesCount: 15,
        }),
      });
      if (res.status === 401) {
        window.location.href = '/api/auth/login';
        return;
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Generation failed');
      const withEnergy = (t: Omit<SetTrack, 'energy'>): SetTrack => ({
        ...t,
        energy: energyFromTags(t.tags),
      });
      setSet(data.tracks.map(withEnergy));
      setAlternates(data.alternates.map(withEnergy));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }, [seeds, filters, excluded]);

  return (
    <div className="min-h-screen text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <header className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Curate<span className="text-[var(--color-vibrant-safe)]">.</span>
          </h1>
          <span className="text-xs text-[var(--color-text-secondary)]">{displayName}</span>
        </header>

        {/* The Set — timeline lands here in Task 13 */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 min-h-40">
          {set.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              The set will appear here. Pick seeds below and hit Generate.
            </p>
          ) : (
            <ul className="text-sm space-y-1">
              {set.map((t, i) => (
                <li key={t.trackId} className="truncate">
                  {i + 1}. {t.trackName} — {t.artistNames.join(', ')}
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </section>

        <SeedTray seeds={seeds} onRemove={removeSeed} onGenerate={generate} generating={generating} />

        <nav className="flex gap-1">
          {(['search', 'vibes', 'sessions', 'shape'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-t-lg text-sm capitalize transition ${
                tab === t ? 'bg-white/10 text-white' : 'text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <section className="rounded-2xl rounded-tl-none bg-white/5 border border-white/10 p-4 min-h-64">
          {tab === 'search' && (
            <SearchTab onAddSeed={addSeed} seedIds={new Set(seeds.map((s) => s.trackId))} />
          )}
          {tab !== 'search' && (
            <p className="text-sm text-[var(--color-text-secondary)]">Coming in the next task.</p>
          )}
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify in browser**

Preconditions: redirect URI registered in Spotify dashboard; `SESSION_SECRET` and `OWNER_SPOTIFY_USER_ID` in `.env.local`; dev server restarted.

1. Open `http://localhost:3000/curate` → login screen renders.
2. Click "Log in with Spotify" → OAuth → redirected back, page shows Search tab with "Most played" shelf populated.
3. Add 2-3 seeds → Generate → set list of track names appears.

Expected: full flow works; a second browser (incognito, different Spotify account) hitting login gets the "Kris's kitchen" denial.

- [ ] **Step 7: Run lint and commit**

Run: `npm run lint` — expected: no new errors.

```bash
git add app/curate
git commit -m "Add /curate shell: login gate, seed tray, search tab, generate"
```

---

### Task 12: Vibes, Sessions, and Shape tabs

**Files:**
- Create: `app/curate/VibesTab.tsx`
- Create: `app/curate/SessionsTab.tsx`
- Create: `app/curate/ShapeTab.tsx`
- Modify: `app/curate/CurateClient.tsx` (render the tabs)

**Interfaces:**
- Consumes: `GET /api/curation/vibes` (Task 7), `GET /api/curation/sessions` (Task 8), `GET /api/curation/tracks?tags=` (Task 6), `addSeed`, `filters`/`setFilters` from Task 11.
- Produces: fully working source tabs; `ShapeTab` edits the `Filters` object (Task 11 shape).

- [ ] **Step 1: Create `app/curate/VibesTab.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { TrackHit } from './types';

interface TagCount {
  tag: string;
  count: number;
}

export default function VibesTab({
  onAddSeed,
  seedIds,
}: {
  onAddSeed: (t: TrackHit) => void;
  seedIds: Set<string>;
}) {
  const [tags, setTags] = useState<TagCount[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [matches, setMatches] = useState<TrackHit[]>([]);

  useEffect(() => {
    fetch('/api/curation/vibes')
      .then((r) => r.json())
      .then((d) => d.success && setTags(d.tags));
  }, []);

  useEffect(() => {
    if (selected.length === 0) {
      setMatches([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/curation/tracks?tags=${encodeURIComponent(selected.join(','))}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => d.success && setMatches(d.tracks))
      .catch(() => {});
    return () => controller.abort();
  }, [selected]);

  const toggle = (tag: string) =>
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4 max-h-40 overflow-y-auto">
        {tags.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => toggle(tag)}
            className={`px-2.5 py-1 rounded-full text-xs transition ${
              selected.includes(tag)
                ? 'bg-[var(--color-vibrant-safe)] text-black'
                : 'bg-white/5 hover:bg-white/15'
            }`}
          >
            {tag} <span className="opacity-50">{count}</span>
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">
            Top tracks matching {selected.join(' + ')}
          </p>
          {matches.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)]">No tracks carry all selected tags.</p>
          )}
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {matches.map((t) => (
              <li key={t.trackId}>
                <button
                  onClick={() => onAddSeed(t)}
                  disabled={seedIds.has(t.trackId)}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 transition text-left"
                >
                  {t.albumImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.albumImageUrl} alt="" className="w-9 h-9 rounded object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-white/10" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm">{t.trackName}</span>
                    <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                      {t.artistNames.join(', ')}
                    </span>
                  </span>
                  <span className="text-[var(--color-vibrant-safe)] text-lg leading-none">⊕</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/curate/SessionsTab.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import type { TrackHit } from './types';

interface SessionSummary {
  id: string;
  startedAt: string;
  trackCount: number;
  hourOfDay: number;
  dayOfWeek: number;
  sampleTracks: { trackId: string; trackName: string }[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SessionsTab({
  onSeedFromSession,
}: {
  onSeedFromSession: (trackIds: string[]) => void;
}) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    fetch('/api/curation/sessions')
      .then((r) => r.json())
      .then((d) => d.success && setSessions(d.sessions));
  }, []);

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
      {sessions.map((s) => {
        const date = new Date(s.startedAt);
        return (
          <li key={s.id} className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-semibold">
                {DAYS[s.dayOfWeek]} {date.toLocaleDateString()} · {s.hourOfDay}:00
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">{s.trackCount} tracks</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] truncate mb-2">
              {s.sampleTracks.map((t) => t.trackName).join(' · ')}
            </p>
            <button
              onClick={() => onSeedFromSession(s.sampleTracks.map((t) => t.trackId))}
              className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition"
            >
              Use as seeds ⊕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: Create `app/curate/ShapeTab.tsx`**

```tsx
'use client';

import type { Filters } from './types';

function ChipInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">{label}</span>
      <input
        defaultValue={values.join(', ')}
        onBlur={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
          )
        }
        placeholder="comma-separated, e.g. downtempo, trip hop"
        className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[var(--color-primary)] outline-none text-sm"
      />
    </label>
  );
}

export default function ShapeTab({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const num =
    (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...filters, [key]: Number(e.target.value) });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
      <div className="flex gap-3 items-end">
        <label className="block flex-1">
          <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
            Duration (min)
          </span>
          <input
            type="number"
            min={10}
            max={filters.durationMaxMinutes}
            value={filters.durationMinMinutes}
            onChange={num('durationMinMinutes')}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
          />
        </label>
        <span className="pb-2 text-[var(--color-text-secondary)]">to</span>
        <label className="block flex-1">
          <span className="text-xs uppercase tracking-widest text-transparent select-none">max</span>
          <input
            type="number"
            min={filters.durationMinMinutes}
            max={240}
            value={filters.durationMaxMinutes}
            onChange={num('durationMaxMinutes')}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
          />
        </label>
      </div>
      <div className="flex gap-3 items-end">
        <label className="block flex-1">
          <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
            Popularity
          </span>
          <input
            type="number"
            min={0}
            max={filters.popularityMax}
            value={filters.popularityMin}
            onChange={num('popularityMin')}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
          />
        </label>
        <span className="pb-2 text-[var(--color-text-secondary)]">to</span>
        <label className="block flex-1">
          <span className="text-xs uppercase tracking-widest text-transparent select-none">max</span>
          <input
            type="number"
            min={filters.popularityMin}
            max={100}
            value={filters.popularityMax}
            onChange={num('popularityMax')}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
          />
        </label>
      </div>
      <ChipInput
        label="Only these genres"
        values={filters.genreAllow}
        onChange={(genreAllow) => onChange({ ...filters, genreAllow })}
      />
      <ChipInput
        label="Never these genres"
        values={filters.genreDeny}
        onChange={(genreDeny) => onChange({ ...filters, genreDeny })}
      />
    </div>
  );
}
```

- [ ] **Step 4: Wire the tabs into `CurateClient.tsx`**

Add imports:

```tsx
import VibesTab from './VibesTab';
import SessionsTab from './SessionsTab';
import ShapeTab from './ShapeTab';
```

Add a session-seeding callback after `removeSeed`:

```tsx
  const seedFromSession = useCallback(async (trackIds: string[]) => {
    // Sessions give us ids+names only; fetch full TrackHit rows via the shelf
    // endpoint would over-fetch, so hydrate from the tracks we already have or
    // fall back to a minimal hit.
    const res = await fetch(`/api/curation/tracks?shelf=most-played`);
    const data = await res.json();
    const byId = new Map<string, TrackHit>(
      (data.success ? (data.tracks as TrackHit[]) : []).map((t) => [t.trackId, t])
    );
    setSeeds((prev) => {
      const next = [...prev];
      for (const id of trackIds) {
        if (next.some((s) => s.trackId === id)) continue;
        const hit = byId.get(id);
        next.push(
          hit ?? {
            trackId: id,
            spotifyTrackId: '',
            trackName: 'From session',
            artistNames: [],
            durationMs: 0,
            albumImageUrl: null,
            popularity: null,
            plays: 0,
          }
        );
      }
      return next;
    });
  }, []);
```

Replace the `{tab !== 'search' && (...)}` placeholder block with:

```tsx
          {tab === 'vibes' && (
            <VibesTab onAddSeed={addSeed} seedIds={new Set(seeds.map((s) => s.trackId))} />
          )}
          {tab === 'sessions' && <SessionsTab onSeedFromSession={seedFromSession} />}
          {tab === 'shape' && <ShapeTab filters={filters} onChange={setFilters} />}
```

- [ ] **Step 5: Verify in browser**

1. Vibes tab: chips load with counts; selecting `dancefloor` + `euphoric` lists matching tracks; ⊕ adds seeds.
2. Sessions tab: sessions listed newest-first; "Use as seeds" fills the tray.
3. Shape tab: change duration to 30–40, regenerate → set duration honors the new target.

- [ ] **Step 6: Run lint and commit**

Run: `npm run lint` — expected: no new errors.

```bash
git add app/curate
git commit -m "Add vibes/sessions/shape source tabs"
```

---

### Task 13: Set timeline — energy arc, drag reorder, slot actions, smooth toggle

**Files:**
- Create: `app/curate/SetTimeline.tsx`
- Modify: `app/curate/CurateClient.tsx` (replace the placeholder set list; add set-mutation callbacks)

**Interfaces:**
- Consumes: `SetTrack` (Task 11), `smoothTransitions` (Task 2).
- Produces: `SetTimeline` props:

```ts
{
  set: SetTrack[];
  alternates: SetTrack[];
  smoothed: boolean;
  onToggleSmoothed: () => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onSwap: (index: number, replacement: SetTrack) => void;
  onPush: () => void;      // opens push flow (Task 14 fills in)
  pushDisabled: boolean;
}
```

- [ ] **Step 1: Create `app/curate/SetTimeline.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { SetTrack } from './types';

function fmtDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  return `${m} min`;
}

export default function SetTimeline({
  set,
  alternates,
  smoothed,
  onToggleSmoothed,
  onReorder,
  onRemove,
  onSwap,
  onPush,
  pushDisabled,
}: {
  set: SetTrack[];
  alternates: SetTrack[];
  smoothed: boolean;
  onToggleSmoothed: () => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onSwap: (index: number, replacement: SetTrack) => void;
  onPush: () => void;
  pushDisabled: boolean;
}) {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const totalMs = set.reduce((s, t) => s + t.durationMs, 0);
  const usedIds = new Set(set.map((t) => t.trackId));
  const freeAlternates = alternates.filter((a) => !usedIds.has(a.trackId));

  if (set.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        The set will appear here. Pick seeds below and hit Generate.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
          The set · {fmtDuration(totalMs)} · {set.length} tracks
        </span>
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input type="checkbox" checked={smoothed} onChange={onToggleSmoothed} />
          smooth transitions
        </label>
        <button
          onClick={onPush}
          disabled={pushDisabled}
          className="ml-auto px-4 py-1.5 rounded-full text-sm font-semibold bg-[var(--color-primary)] text-black disabled:opacity-40 hover:opacity-90 transition"
        >
          Push to Spotify
        </button>
      </div>

      {/* Energy arc timeline */}
      <div className="flex items-end gap-1 h-36 mb-2">
        {set.map((t, i) => (
          <button
            key={t.trackId}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== i) onReorder(dragIndex, i);
              setDragIndex(null);
            }}
            onClick={() => {
              setOpenSlot(openSlot === i ? null : i);
              setSwapping(false);
            }}
            className={`flex-1 min-w-0 rounded-t-lg border transition relative overflow-hidden ${
              openSlot === i
                ? 'border-[var(--color-vibrant-safe)]'
                : 'border-white/10 hover:border-white/40'
            }`}
            style={{
              height: `${25 + t.energy * 75}%`,
              backgroundColor: `color-mix(in srgb, var(--color-primary) ${Math.round(
                15 + t.energy * 60
              )}%, transparent)`,
            }}
            title={`${t.trackName} — ${t.artistNames.join(', ')}`}
          >
            {t.albumImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.albumImageUrl}
                alt=""
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-7 rounded object-cover opacity-90"
              />
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[var(--color-text-secondary)] mb-3">
        bar height = energy · drag bars to reorder · click a bar for actions
      </p>

      {/* Slot detail panel */}
      {openSlot !== null && set[openSlot] && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm">
          <div className="flex items-center gap-3 mb-2">
            {set[openSlot].albumImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={set[openSlot].albumImageUrl!} alt="" className="w-10 h-10 rounded object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold">
                {openSlot + 1}. {set[openSlot].trackName}
              </p>
              <p className="truncate text-xs text-[var(--color-text-secondary)]">
                {set[openSlot].artistNames.join(', ')} · energy {set[openSlot].energy.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => setSwapping(!swapping)}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs transition"
            >
              swap ⇄
            </button>
            <button
              onClick={() => {
                onRemove(openSlot);
                setOpenSlot(null);
              }}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-red-500/40 text-xs transition"
            >
              remove ✕
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            why: {set[openSlot].reasons.join('; ') || 'seed-adjacent pick'}
          </p>
          {swapping && (
            <ul className="mt-3 space-y-1 border-t border-white/10 pt-2">
              {freeAlternates.slice(0, 5).map((a) => (
                <li key={a.trackId}>
                  <button
                    onClick={() => {
                      onSwap(openSlot, a);
                      setSwapping(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 text-left"
                  >
                    <span className="flex-1 min-w-0 truncate text-xs">
                      {a.trackName} — {a.artistNames.join(', ')}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      score {a.score.toFixed(2)} · energy {a.energy.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
              {freeAlternates.length === 0 && (
                <li className="text-xs text-[var(--color-text-secondary)]">no alternates left — regenerate</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire into `CurateClient.tsx`**

Add imports:

```tsx
import { smoothTransitions } from '@/lib/curation/smoothTransitions';
import SetTimeline from './SetTimeline';
```

Add state + callbacks after the `generate` callback:

```tsx
  const [smoothed, setSmoothed] = useState(false);
  const [baseOrder, setBaseOrder] = useState<SetTrack[]>([]);

  const toggleSmoothed = useCallback(() => {
    setSmoothed((prev) => {
      const next = !prev;
      if (next) {
        setBaseOrder(set);
        setSet(smoothTransitions(set));
      } else {
        setSet(baseOrder.filter((t) => set.some((s) => s.trackId === t.trackId)));
      }
      return next;
    });
  }, [set, baseOrder]);

  const reorder = useCallback((from: number, to: number) => {
    setSet((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const removeFromSet = useCallback((index: number) => {
    setSet((prev) => {
      const removed = prev[index];
      setExcluded((ex) => [...ex, removed.trackId]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const swapInSet = useCallback((index: number, replacement: SetTrack) => {
    setSet((prev) => prev.map((t, i) => (i === index ? replacement : t)));
  }, []);
```

In `generate`'s success path, after `setAlternates(...)`, add:

```tsx
      setSmoothed(false);
      setBaseOrder([]);
```

Replace the whole "The Set" placeholder `<section>` body (the `set.length === 0 ? ... : <ul>...`) with:

```tsx
          <SetTimeline
            set={set}
            alternates={alternates}
            smoothed={smoothed}
            onToggleSmoothed={toggleSmoothed}
            onReorder={reorder}
            onRemove={removeFromSet}
            onSwap={swapInSet}
            onPush={() => setPushOpen(true)}
            pushDisabled={set.length === 0}
          />
```

And add a temporary state stub so it compiles until Task 14:

```tsx
  const [pushOpen, setPushOpen] = useState(false);
```

- [ ] **Step 3: Verify in browser**

1. Generate a set → bars render with varying heights/tints; artwork thumbnails at bar bases.
2. Drag a tall bar elsewhere → order changes, arc updates.
3. Click a bar → detail panel shows reasons; remove drops the track (and excluded grows — regenerate won't bring it back); swap lists ≤5 alternates with score+energy, clicking replaces in place.
4. Toggle smooth transitions on → middle reorders toward monotonic energy steps; off → original order restored.

- [ ] **Step 4: Run tests + lint, commit**

Run: `npm test && npm run lint` — expected: PASS / no new errors.

```bash
git add app/curate
git commit -m "Add energy-arc set timeline with reorder/remove/swap and smoothing"
```

---

### Task 14: Push flow + final verification

**Files:**
- Create: `app/curate/PushDialog.tsx`
- Modify: `app/curate/CurateClient.tsx` (render dialog)

**Interfaces:**
- Consumes: `POST /api/curation/playlist/push` (Task 10), `pushOpen`/`setPushOpen` (Task 13), `set: SetTrack[]`.

- [ ] **Step 1: Create `app/curate/PushDialog.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { SetTrack } from './types';

export default function PushDialog({
  set,
  onClose,
}: {
  set: SetTrack[];
  onClose: () => void;
}) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const [name, setName] = useState(`oldski set — ${today}`);
  const [state, setState] = useState<'idle' | 'pushing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<string>('');

  const push = async () => {
    setState('pushing');
    try {
      const res = await fetch('/api/curation/playlist/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: 'Curated with oldski unwrapped',
          spotifyTrackIds: set.map((t) => t.spotifyTrackId),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'push failed');
      setResult(data.playlistUrl);
      setState('done');
    } catch (e: any) {
      setResult(e.message);
      setState('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Push to Spotify</h2>
        {state === 'done' ? (
          <div className="text-center">
            <p className="mb-4 text-sm">
              Playlist created with {set.length} tracks.
            </p>
            <a
              href={result}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-5 py-2 rounded-full bg-[var(--color-vibrant-safe)] text-black font-semibold hover:opacity-90 transition"
            >
              Open in Spotify ↗
            </a>
          </div>
        ) : (
          <>
            <label className="block mb-4">
              <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
                Playlist name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[var(--color-primary)] outline-none text-sm"
              />
            </label>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              {set.length} tracks · private playlist on your account
            </p>
            {state === 'error' && (
              <p className="text-sm text-red-400 mb-3">Failed: {result}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={push}
                disabled={state === 'pushing' || !name.trim()}
                className="px-5 py-2 rounded-full bg-[var(--color-primary)] text-black font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition"
              >
                {state === 'pushing' ? 'Pushing…' : state === 'error' ? 'Retry' : 'Create playlist'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render it in `CurateClient.tsx`**

Add import:

```tsx
import PushDialog from './PushDialog';
```

At the end of the returned JSX, just before the closing `</div>` of the outer container, add:

```tsx
        {pushOpen && <PushDialog set={set} onClose={() => setPushOpen(false)} />}
```

- [ ] **Step 3: End-to-end verification (the whole feature)**

1. `npm test` → all pass. `npm run lint` → no new errors. `npm run build` → compiles.
2. In the browser: log in → seed from a session → tweak Shape to 30–40 min → Generate → smooth-toggle → drag one track → swap one → remove one → Push to Spotify → "Open in Spotify" plays the set, in order, as a private playlist.
3. Incognito/other account: `/curate` shows login; after OAuth with a non-owner account → denial screen; POST routes return 401.

- [ ] **Step 4: Commit**

```bash
git add app/curate
git commit -m "Add push-to-Spotify dialog completing the curate flow"
```

---

## Self-Review Notes

- **Spec coverage:** Deck layout (T11/13), three seed entry points + vibe seeding (T11/12), Shape filters (T12), energy arc + smoothing (T1/2/13), reorder/remove/swap + reasons (T13), overfetched alternates (T9), push with session token (T10/14), Spotify-login owner gating (T3/4/5), errors/empty states (inline in T11/13/14), vitest for pure logic only (T1/2/3). Read-only GETs unauthenticated per spec (T6/7/8).
- **Deferred per spec:** saved playlists, BPM/key enrichment, mobile polish, multi-user.
- **Type consistency check:** `TrackHit`/`SetTrack`/`Filters` defined once in `app/curate/types.ts`; `CandidateTrack` extended in T9 matches `SetTrack` minus `energy` (added client-side via `energyFromTags`); `SESSION_COOKIE` referenced only from `lib/auth/session.ts`.
