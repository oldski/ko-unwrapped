# Curation Agent (Phase 1) — Design Spec

Date: 2026-07-27
Status: Approved pending user review
Builds on: `docs/superpowers/specs/2026-07-24-curation-ui-design.md` (shipped)

## Purpose

Replace deterministic set assembly with an LLM **set-director** and add a
**discovery lane** that brings in music related to the seeds but absent
from the library. The deterministic scorer remains the retrieval layer;
the model owns taste: which tracks make the set, in what order, and why.

Decisions locked during brainstorming:
- One spec, both lanes (director + discovery); plan builds director first.
- Discovery amount controlled by three presets: **Familiar** (library
  only), **Balanced** (~30% discovered), **Adventurous** (~60%).
- Director/proposer model: **claude-sonnet-5**. Tagging stays on the
  existing Haiku pipeline.
- Discovery grounding: model knowledge + **Last.fm** similarity APIs;
  every suggestion verified via Spotify search before use.
- The agent **replaces** Generate; deterministic sequencing survives only
  as an automatic fallback (with a UI notice).
- Seeds become candidates the director may place anywhere (or omit) —
  supersedes the old always-exclude behavior.

## Architecture: two-call pipeline

Chosen over a tool-using agent loop (slower, costlier, less predictable)
and a single mega-call (can't filter hallucinated tracks before
sequencing). Deterministic code gathers and verifies; the model reasons
twice, at the two points where judgment lives.

`POST /api/curation/agent/generate` (owner-gated):

1. **Library candidates** — `rankCandidates` overfetch (~50 scored
   tracks). Seed tracks are added to the pool as first-class candidates.
2. **Discovery proposals** (skip when preset = Familiar) — Sonnet call 1:
   seeds + seed vibe profile → 15–25 proposed tracks/artists from model
   knowledge, one-line vibe justification each.
3. **Grounding (pure code)** —
   - Last.fm `artist.getSimilar` / `track.getSimilar` on seeds → more
     candidates.
   - Every proposal (model's and Last.fm's) resolved via Spotify search;
     unresolvable suggestions silently dropped.
   - Tracks already in the library fold back to their library rows.
   - Results cached (`discovery_cache`, 30-day TTL).
4. **Enrichment** — resolved foreign tracks inserted into
   `tracks`/`artists`/`track_artists` (zero play_history marks them
   unlistened) and vibe-tagged through the existing `tagWithLLM`
   machinery (one batch, same closed vocabulary) → tags → energy.
5. **Director** — Sonnet call 2: seeds, preset, duration target, and the
   full labeled pool (library + discovered; tags, energy, duration,
   popularity, score) → ordered set honoring the preset's discovery
   ratio, with per-track placement rationale and per-transition notes.
   Structured output (JSON schema). Output validated in code: only
   pool track IDs accepted; duration overshoot repaired; ratio drift
   tolerated but reported.
6. **Fallback** — any total failure of a model call degrades to current
   deterministic sequencing, flagged in the response; the UI shows a
   dismissible "agent unavailable — classic sequencing used" banner.
   Partial failures (one lane down) just shrink the pool and continue.

## Response shape

Extends the current candidates response:

```ts
{
  success: true,
  mode: 'agent' | 'fallback',
  tracks: (CandidateTrack & {
    source: 'library' | 'discovery';
    placementNote: string;      // director's rationale (fallback: scorer reasons)
  })[],
  transitions: { fromIndex: number; note: string }[],
  narrative: string,            // one-paragraph set description
  totalDurationMs: number,
  meta: { ...existing, discoveredCount: number, poolSize: number }
}
```

## New modules

- `lib/curation/agent/proposeDiscovery.ts` — Sonnet call 1 + prompt.
- `lib/curation/agent/lastfm.ts` — similar-artist/track client (keyed by
  `LASTFM_API_KEY`), cache-aware.
- `lib/curation/agent/resolveTracks.ts` — Spotify search resolution +
  library fold-back + insertion of new tracks.
- `lib/curation/agent/director.ts` — Sonnet call 2 + schema + output
  validation/repair (pure validation logic separately testable).
- `lib/curation/agent/buildPool.ts` — merge/dedup of library, seed, and
  discovery candidates (pure; testable).
- `app/api/curation/agent/generate/route.ts` — orchestrating route.
- Schema: new `discovery_cache` table only; existing tables untouched.

## UI changes (existing `/curate` components)

- **Preset chips** Familiar / Balanced / Adventurous in the seed tray,
  default Balanced.
- **Discovery badges** — "new" marker on discovered tracks' bars and slot
  panels; slot panel shows `placementNote`.
- **Transition notes** — surfaced in the slot panel for the join into the
  selected track; Phase 2's BPM/Camelot data will reuse this surface.
- **Narrative** — under the timeline header; pre-fills PushDialog's
  playlist description.
- **Fallback banner** — dismissible; only on `mode: 'fallback'`.
- **Staged progress** on Generate ("finding candidates → discovering →
  sequencing") since generation now takes ~10–18s cold.
- Push flow unchanged (discovered tracks have real Spotify IDs).

## Cost & latency budget

- Familiar: 1 Sonnet call; ~1–2¢; ~5–8s.
- Balanced/Adventurous cold: 2 Sonnet calls + 1 Haiku tagging batch +
  API fan-out; ~3–5¢; ~10–18s. Warm (cache hits): closer to Familiar.

## Failure containment & security

- Each external lane (proposals, Last.fm, Spotify search) fails
  independently; only director failure triggers fallback.
- All new endpoints owner-gated (same `getSession` guard).
- Director cannot introduce tracks outside the verified pool
  (structural hallucination guard).
- Last.fm/Spotify errors logged server-side; generic client errors.

## Env

- `LASTFM_API_KEY` — user registers free key at last.fm/api during
  implementation (plan stops and asks).
- Model IDs as constants: `claude-sonnet-5` (proposer/director);
  tagging unchanged (`claude-haiku-4-5`).

## Testing

- vitest (pure logic): pool merge/dedup incl. library fold-back; preset
  ratio targets passed to the director; director-output validation
  (foreign IDs rejected, duration repair, ratio drift reporting);
  fallback selection logic.
- Live dev-server verification for routes; browser E2E for the full
  generate → badge → push flow.

## Out of scope (later phases)

- Natural-language brief box.
- BPM/Camelot enrichment and harmonic sequencing (Phase 2; transition
  notes and energy interface are its seams).
- Saved recipes, multi-user/taste sharing.
- Spotify Mix toggle / authored transitions (no public API).
