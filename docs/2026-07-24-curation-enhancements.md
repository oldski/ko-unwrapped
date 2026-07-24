# Curation Enhancements — July 24, 2026

Workup of everything delivered on the `curation-ui` branch, merged to `main`
in `ab7a1df`. This turned the WIP curation pipeline (`2863eb1`) into a
complete, verified feature: an authenticated playlist-builder at `/curate`
backed by fully enriched listening data, ending in real playlists pushed to
Spotify.

Design and implementation history live alongside this doc:

- Spec: `docs/superpowers/specs/2026-07-24-curation-ui-design.md`
- Implementation plan (14 tasks): `docs/superpowers/plans/2026-07-24-curation-ui.md`

---

## 1. Database & pipeline enrichment

The schema for the pipeline (`artist_genres`, `listening_sessions`,
`session_tracks`, `vibe_tags`) shipped in migration
`drizzle/0001_brown_felicia_hardy.sql` and was applied today.

**Migration history baseline (one-time fix).** The original schema had been
created with `drizzle-kit push`, so `drizzle.__drizzle_migrations` was empty
and `db:migrate` tried to replay the baseline migration into existing
tables. Migration `0000`'s hash was recorded as already-applied, after which
`0001` applied cleanly. `npm run db:migrate` now works normally for all
future migrations.

**Enrichment runs (full corpus):**

| Stage | Result |
|---|---|
| Session extraction | 1,185 listening sessions from play history; 12,584 track links; avg ~10.6 tracks/session (longest 110) |
| Artist genre enrichment (Spotify) | 2,767 artists, ~3,250 genre entries; transient 503s retried, idempotent |
| LLM vibe tagging (`claude-haiku-4-5`) | 5,180/5,180 tracks tagged; 23,614 tags; **$0.29 total API cost**; closed 96-tag vocabulary enforced by prompt + JSON-schema enum + post-filter |

## 2. Candidate scorer additions (`lib/curation/candidateScorer.ts`)

- `CandidateTrack` now carries `albumImageUrl` and `tags` (vibe tags), so
  the UI gets artwork and can derive energy client-side.
- New `alternatesCount` input / `alternates` output: the next-best scored
  tracks *not* chosen for the set, score-descending — powers instant
  swap in the UI without a second scoring round-trip.
- Scoring weights unchanged: genre overlap 0.30, tag overlap 0.30,
  co-session 0.25, time-of-day affinity 0.10, popularity proximity 0.05.
  With tagging now complete, tag overlap contributes for every track.

## 3. Mix-awareness v1 (energy model + smoothing)

Spotify's audio-features/analysis APIs are deprecated, so v1 mixability is
derived from vibe tags, with a clean seam for future BPM/key enrichment:

- `lib/curation/energy.ts` — `energyFromTags(tags): number` maps ~52 tags
  to a 0–1 energy estimate (e.g. `high-energy` 0.95, `dancefloor` 0.85,
  `mid-tempo` 0.5, `ambient` 0.1); unmapped tags ignored; default 0.5.
- `lib/curation/smoothTransitions.ts` — greedy nearest-neighbor reorder of
  a set's middle to minimize adjacent energy jumps; opener and outro stay
  pinned. Drives the UI's "smooth transitions" toggle.

## 4. Authentication: Log in with Spotify

`/curate` is a logged-in area; only the owner's Spotify account is
authorized.

- **OAuth routes** `app/api/auth/{login,callback,logout}` — authorization
  code flow with `playlist-modify-private playlist-modify-public` scopes,
  CSRF `state` cookie, and owner check against `OWNER_SPOTIFY_USER_ID`.
  Non-owner logins get a friendly denial screen.
- **Session** — AES-256-GCM sealed httpOnly cookie
  (`lib/auth/session.ts`), key derived from `SESSION_SECRET`; tampered
  tokens read as logged-out; a missing secret fails loudly. 30-day cookie.
  Holds the user's Spotify refresh token, so playlist pushes act as the
  logged-in user (multi-user-ready by design).
- **Trusted origin derivation** (`lib/auth/requestOrigin.ts`) — Spotify no
  longer accepts `localhost` redirect URIs, so OAuth URLs derive from the
  request host, allowlisted to `127.0.0.1:3000` / `localhost:3000` /
  `NEXT_PUBLIC_HOST`, failing closed (verified against a spoofed-Host
  probe; closes the open-redirect class).
- **Route guards** — all mutating curation routes (`enrich/*`,
  `candidates`, `playlist/push`) return 401 without a valid owner session.
  Read-only GETs remain public, matching the existing stats pages.

## 5. New API routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/curation/tracks?q=\|shelf=\|tags=` | public | Library search, most-played/recent shelves, AND-matched tag lookup (parameterized `sql.join`, injection-probe verified) |
| `GET /api/curation/vibes` | public | Vibe-tag counts + top-40 genre counts |
| `GET /api/curation/sessions` | public | Recent sessions with up to 3 sample tracks (distinct-rank ordering; UTC-designated ISO timestamps) |
| `POST /api/curation/candidates` | owner | Existing scorer route + `alternatesCount` passthrough (capped 30) |
| `POST /api/curation/playlist/push` | owner | Creates a private playlist via the session token, adds tracks in order, returns the playlist URL |

Public GETs return generic error bodies (no `error.message` leakage).

## 6. The `/curate` UI (Deck layout)

New route `app/curate/` — server-gated page + client components:

- **The Set (top)** — `SetTimeline.tsx`: horizontal energy-arc timeline;
  bar height/tint = energy; artwork thumbs; drag to reorder; click a slot
  for actions — *why this track* (scorer reasons), *swap* (top-5 ranked
  alternates with score + energy), *remove* (excluded on regenerate);
  smooth-transitions toggle; Push to Spotify.
- **Seed tray (middle)** — removable seed chips + Generate.
- **Sources (bottom tabs)**:
  - `SearchTab` — debounced search over 5,180 tracks + most-played/recent shelves
  - `VibesTab` — tag chips with counts; multi-select AND-matching; seed from results
  - `SessionsTab` — recent sessions, one-click "use as seeds"
  - `ShapeTab` — duration target, popularity range, genre allow/deny
- **PushDialog** — names the playlist (default `oldski set — {date}`),
  creates it private, success state links "Open in Spotify"; error state
  offers retry.

## 7. Testing & verification

- **First test infra in the repo**: vitest (`npm test`), 22 tests over the
  pure logic — energy mapping, transition smoothing, session sealing
  (incl. tamper + missing-secret), trusted-origin derivation.
- `npm run build` passes.
- **Live end-to-end verified in a real browser**: OAuth round-trip →
  seeds from all three sources → generate (coherent 10-track downtempo
  set) → swap/reorder/smooth → push → real 10-track private playlist on
  the owner's Spotify account.
- Every task went through an independent code review; notable bugs caught
  and fixed before merge: OAuth open-redirect hardening, session
  sample-track ranking, evening-session timezone display, swap-lost-on-
  unsmooth state bug, setState-updater purity.

## 8. Operational notes

- **Dev login: use `http://127.0.0.1:3000/curate`** — that host form is
  what Spotify's dashboard accepts as a redirect URI.
- **Production checklist**: register `https://<prod-host>/api/auth/callback`
  in the Spotify dashboard; `NEXT_PUBLIC_HOST` set to the exact prod origin
  (no trailing slash); env: `SESSION_SECRET`, `OWNER_SPOTIFY_USER_ID`, and
  `ANTHROPIC_API_KEY` only if enrichment runs in prod.
- `npm run lint` is broken repo-wide (Next 16 removed `next lint`; legacy
  `.eslintrc`) — pre-existing, tracked as a follow-up chore.

## 9. Known follow-ups (non-blocking)

- **BPM/key enrichment** — the real mixability data source
  (Deezer / GetSongBPM / AcousticBrainz); swaps in behind
  `energyFromTags`'s interface.
- Seeds are currently *excluded* from generated sets (by scorer design) —
  decide whether seeds should open the set.
- Genre chips in VibesTab (route already returns them).
- Chunked playlist push (Spotify caps 100 tracks per add call).
- Expiry claim inside the sealed session token.
- ESLint migration to `eslint.config.js`.
- Saved playlists / recipes, multi-user + taste sharing — the long-term
  direction the auth design already accommodates.
