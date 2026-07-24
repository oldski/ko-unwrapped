# Curation UI — Design Spec

Date: 2026-07-24
Status: Approved pending user review

## Purpose

A playlist-builder page (`/curate`) on top of the existing curation pipeline
(listening sessions, artist genres, LLM vibe tags, candidate scorer). The user
picks seed tracks, shapes filters, generates a sequenced set, refines it by
hand, and pushes it to their Spotify account as a real playlist.

Long-term ambition: sets that mix like a continuous DJ set. Spotify's
tempo/key APIs are deprecated and no BPM/key data exists yet, so v1 is
**mix-aware** (energy-arc visualization and transition-smoothing from vibe
tags) with clean seams for real BPM/key enrichment as a follow-up project.

## Layout: "Deck"

The set is the hero; sources feed it from below.

```
┌────────────────────────────────────────────────────┐
│ THE SET — 51 min · downtempo/trip hop · [Push]     │
│ ▂ ▄ ▆ █ ▆ ▄ ▂   ← slots sized/tinted by energy     │
│ drag to reorder · click slot: remove/swap/why      │
├────────────────────────────────────────────────────┤
│ seed tray: [Waking Up…✕] [We Enter…✕] [+ Generate] │
├────────────────────────────────────────────────────┤
│ Search │ Vibes │ Sessions │ Shape                  │
│ (tabbed source browser)                            │
└────────────────────────────────────────────────────┘
```

- **The Set (top)**: horizontal slot timeline. Each slot: artwork, track name,
  artist, duration; slot height/tint driven by energy score (0–1). Header
  shows total duration, dominant genres/tags, Push to Spotify button.
- **Seed tray (middle)**: current seeds as removable chips + Generate button.
- **Sources (bottom, tabs)**:
  - **Search**: debounced text search over all tracks; quick-pick shelves
    "Most played" and "Recent favorites". Each row has ⊕ add-as-seed.
  - **Vibes**: vibe-tag and genre chips with counts. Selecting chips shows
    matching tracks; "seed from this vibe" picks representative tracks
    (top-played matches).
  - **Sessions**: listening-session list (date, hour, track count, sample
    tracks). One click seeds from a session's tracks.
  - **Shape**: duration target (min/max), genre allow/deny, popularity range,
    smooth-transitions toggle.

## Page & state

- New route `app/curate/page.tsx`, client component, Tailwind +
  `--color-*` CSS variables, existing components (SkeletonLoader, Drawer,
  Button) where they fit.
- All builder state client-side: seeds, filters, generated set, alternates
  pool, excluded track IDs, owner key. No new DB tables in v1 (saved
  playlists deferred).

## Data flow & API

Existing:
- `POST /api/curation/candidates` — gains an overfetch param so the response
  includes ~15 ranked alternates beyond the chosen set (for instant swap).

New routes (thin handlers over `lib/curation/*`):
- `GET /api/curation/tracks?q=&shelf=` — search + quick-pick shelves.
- `GET /api/curation/vibes` — tags and genres with track counts.
- `GET /api/curation/sessions` — sessions with representative tracks.
- `POST /api/curation/playlist/push` — `{ name, description,
  spotifyTrackIds }` → creates a **private** playlist via the Spotify API
  (refresh token), adds tracks in order, returns playlist URL.

Generate = one POST to candidates. Edits (reorder/remove/swap) are pure
client mutations. Regenerate passes `excludeTrackIds` for removed tracks.

## Energy model (mix-awareness v1)

- `lib/curation/energy.ts`: pure function `energyFromTags(tags: string[]):
  number` mapping vibe tags to 0–1 (e.g. `high-energy`/`dancefloor`/
  `euphoric` high; `mid-tempo` middle; `low-energy`/`ambient`/`tender` low;
  averaged over present tags with a sensible default when tags are absent).
- Drives the slot arc visualization.
- **Smooth transitions toggle**: greedy nearest-neighbor reorder of the
  middle of the set to minimize adjacent energy deltas; opener and outro
  stay pinned. Off = scorer order. Pure function
  `smoothTransitions(tracks): tracks`.
- Future BPM/key enrichment replaces/augments `energyFromTags` behind the
  same interface; no UI rewrite.

## Set editing

- **Reorder**: native HTML5 drag-and-drop (no new dependency); arc re-renders
  live.
- **Remove**: slot action; track joins `excludeTrackIds`.
- **Swap**: slot action opens top-5 alternates ranked by score, each with
  reasons + energy; click replaces in place.
- **Why this track**: slot action showing the scorer's `reasons`.

## Push to Spotify

- Playlist created only after all track URIs resolve (no partial cleanup
  path needed). Success state shows "open in Spotify" link.
- Uses the logged-in session's Spotify token (see Access control), which
  always carries playlist scopes — no dependency on the static env refresh
  token.

## Access control: Log in with Spotify

The site deploys publicly; curation endpoints mutate the DB, spend paid API
quota, and can write to the user's Spotify account. `/curate` is a
logged-in area gated by Spotify OAuth.

- **Routes**: `GET /api/auth/login` (redirect to Spotify authorize with
  `playlist-modify-private playlist-modify-public` scopes),
  `GET /api/auth/callback` (exchange code, fetch `/me`), `POST
  /api/auth/logout`.
- **Authorization**: only the Spotify user ID matching
  `OWNER_SPOTIFY_USER_ID` (env) is authorized in v1. Anyone else who logs
  in sees a friendly not-authorized screen. (Future multi-user/social use
  extends this check to an allowlist or user table — the session shape
  doesn't change.)
- **Session**: encrypted httpOnly cookie (HMAC-signed, `SESSION_SECRET`
  env; no DB) holding the Spotify user ID and their refresh token.
- **Playlist push uses the session's token**, not the static env refresh
  token — so push acts as the logged-in owner, the scope problem
  disappears (login always grants playlist scopes), and multi-user later
  means each user pushes to their own account for free.
- All **mutating** curation routes (`enrich/*`, `candidates`,
  `playlist/push`) require a valid authorized session; 401 → the UI shows
  the login screen.
- Read-only GETs (tracks/vibes/sessions) stay open — same exposure as
  existing stats pages.

## Errors & empty states

- Generate disabled with hint until ≥1 seed.
- Thin scorer results → banner suggesting more seeds / looser filters.
- Spotify 5xx on push → retry button.
- Panels use existing skeleton loading components.
- Enrichment coverage is complete (5,180/5,180 tracks tagged), so no
  "untagged library" states needed in v1.

## Testing

- Add **vitest** (first test infra in repo) with `npm test`, scoped to pure
  logic: `energyFromTags`, `smoothTransitions`, set assembly/exclusion state
  transitions.
- API routes and UI verified against the live dev server (matches existing
  project practice).

## Out of scope (v1)

- BPM/key enrichment (immediate next project; seams left in energy module).
- Saved playlists / recipes in DB.
- Mobile-optimized layout (desktop-first; should degrade acceptably).
- Multi-user access, shared playlists, taste-matching between users — the
  long-term direction. The Spotify-login session design is chosen so this
  extends (allowlist/user table + per-user tokens) without rework.
