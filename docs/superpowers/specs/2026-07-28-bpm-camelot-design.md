# BPM + Camelot Enrichment & Harmonic Sequencing (Phase 2) — Design

**Date:** 2026-07-28
**Status:** Approved by Kris (brainstorming session 2026-07-28)
**Prior art:** Phase 1 curation agent (docs/superpowers/plans/2026-07-27-curation-agent.md), merged to main at f444f29.

## Goal

Make generated sets mix-ready: adjacent tracks should be BPM-compatible (±6%, counting double/half-time) and harmonically compatible on the Camelot wheel, so Spotify's auto-mix sounds intentional. BPM also becomes queryable per track for future visualization work.

## Decisions (from brainstorming)

1. **Enrichment strategy:** batch sweep of the whole library up front, via the existing authed enrich-route pattern. Discovered tracks get enriched by later sweeps, not at resolve time.
2. **Sources:** GetSongBPM (primary — BPM + musical key) → Deezer (fallback — BPM only). No AcousticBrainz/Essentia in this phase.
3. **Sequencing:** both paths — the director LLM gets mix data + harmonic craft rules, and the deterministic `smoothTransitions` upgrades behind its existing signature (also covers the fallback path).
4. **UI:** slot panel shows `BPM · Camelot`; transitions get a client-computed compatibility chip. Timeline bars unchanged.
5. **Storage:** new nullable columns on `tracks` (not the legacy `audio_features` table, which stays untouched) so curation queries and future viz need no join.

## Data model (migration 0003)

New nullable columns on `tracks`:

| column | type | meaning |
|---|---|---|
| `bpm` | `real` | beats per minute from the source |
| `camelot_key` | `varchar(3)` | Camelot code (`1A`–`12B`); null if only BPM found |
| `mix_source` | `varchar(20)` | `getsongbpm` \| `deezer` |
| `mix_checked_at` | `timestamp` | stamped when a lookup *completes* (found or not-found) |

`mix_checked_at IS NULL` = never tried (or last try errored) → selected by the next sweep. Stamped-but-null-bpm = tried, no data → not retried.

## Enrichment pipeline

- `lib/curation/enrichMixData.ts` — `enrichMixData(limit)`:
  1. Select `limit` tracks with `mix_checked_at IS NULL`, joined to primary artist name.
  2. Per track: GetSongBPM search by artist+title → a match counts only when the result's artist name equals ours case-insensitively (after diacritic folding); take BPM + key → Camelot. If GetSongBPM yields no BPM, fall back to Deezer track search for BPM alone (same artist-match rule; Deezer `bpm: 0` counts as no data).
  3. Write results, stamp `mix_checked_at`. Throttle ~1.5 req/s.
- `POST /api/curation/enrich/mix` — authed route, `{ limit }` body, `maxDuration 300`, same shape as `enrich/tags`. Full library ≈ 15 runs of `limit: 350`.
- Env: `GETSONGBPM_API_KEY`. Attribution: visible "BPM data by GetSongBPM" link in the `/curate` footer (API terms requirement).

### Validation & error handling

- BPM sanity range 40–220; keys must map to a valid Camelot code; anything else stored as null.
- Per-track network failure: log, leave `mix_checked_at` null (retryable). Successful "no match": stamp it (don't re-hammer misses).
- HTTP 429 from either source: abort the batch early, return progress so far.

## Mix module (`lib/curation/mix/`)

- `types.ts` — `MixInfo { bpm: number | null; camelotKey: string | null }`.
- `camelot.ts` — `toCamelot(key, mode?) : string | null`. Pure lookup table mapping musical keys (with enharmonics, e.g. A♭m/G#m → 1A) onto the Camelot wheel.
- `compat.ts` — `harmonicCompat(a: MixInfo, b: MixInfo)` returning:
  - `bpmDelta: number | null` — percent change, using half/double time when that's closer
  - `keyRelation: 'same' | 'adjacent' | 'energy-boost' | 'clash' | null` — same code; ±1 number same letter (12↔1 wraps); same number other letter; else clash
  - `score: number` — 0–1 blended mixability
  - Missing data contributes nothing — it never penalizes a pairing.

All pure functions; the phase's TDD effort concentrates here.

## Sequencing integration

**Director (`lib/curation/agent/`):** pool lines gain ` | bpm:122 | key:8A` when present. One craft rule added to the system prompt: prefer adjacent tracks within ±6% BPM (double/half-time counts) and Camelot-compatible keys; call out deliberate breaks in the transition note. Output schema unchanged.

**Deterministic (`lib/curation/smoothTransitions.ts`):** signature unchanged; items gain optional `bpm`/`camelotKey`. Greedy nearest-neighbor cost becomes an equal-weight blend of energy distance and `1 - harmonicCompat().score`; when a pair has no mix data the cost is energy distance alone, so with an unenriched library the ordering is exactly today's energy-only behavior (regression-tested).

**Plumbing:** `PoolTrack` (agent types) and `SetTrack` (`app/curate/types.ts`) gain nullable `bpm`/`camelotKey`; `buildPool` selects the new columns; the generate route passes them through.

## UI

- **Slot panel metadata line:** `Röyksopp · energy 0.33 · 122 BPM · 8A` (mix segments only when present).
- **Transition chip:** beside the "↪ transition in" note, computed client-side from the two adjacent tracks via `harmonicCompat`: `⚡ 8A→9A · +2.4%`, colored by relation (harmonic green / energy-boost amber / clash red), omitted when either side lacks data. Client-side computation keeps it correct through drags and swaps.
- **Footer:** GetSongBPM attribution link on `/curate`.
- Timeline bars unchanged. Stats/viz pages can use `tracks.bpm` later — out of scope here.

## Testing

- `tests/curation/camelot.test.ts` — key→Camelot incl. enharmonics and mode handling.
- `tests/curation/compat.test.ts` — ±6% window, double/half-time, wheel wraparound (12A↔1A), energy-boost (nA↔nB), clash, null-handling.
- `tests/curation/smoothTransitions.test.ts` — extended: harmonic blend ordering; regression: energy-only behavior when mix data absent.
- Source-response parsing (GetSongBPM/Deezer → MixInfo) unit-tested with fixture JSON.
- Live-API verification once during implementation (as the Last.fm client was).

## Out of scope

- AcousticBrainz / Essentia self-analysis (add later only if coverage is poor).
- Resolve-time enrichment of discovered tracks.
- BPM in stats/visualization pages (enabled by the column, built later).
- Spotify Mix-toggle/transition automation (no public API — platform wall).
