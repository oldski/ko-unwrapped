import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { tracks, artists, trackArtists, vibeTags } from '@/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { VIBE_TAGS, isVibeTag } from './vibeVocabulary';

const MODEL = 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 25;
// Haiku 4.5 input ~$0.80/MTok, output ~$4/MTok. Each batch ~500 in / ~250 out.
// Roughly: 0.0004 + 0.001 ≈ $0.0014 per batch → ~$0.06 per 1000 tracks.
const COST_PER_BATCH_USD = 0.0014;

interface TrackInput {
  id: string;
  name: string;
  album: string | null;
  artistNames: string[];
}

export interface TagWithLLMResult {
  tracksConsidered: number;
  tracksTagged: number;
  totalTagsApplied: number;
  estimatedCostUsd: number;
  errors: string[];
}

const SYSTEM_PROMPT = `You are a music curator tagging tracks with vibe descriptors for a personal playlist-building system. You will be given a batch of tracks (each with track id, track name, artist names, album name). For each track, choose 3-6 tags from the provided closed vocabulary that best describe the track's mood, setting, energy, sonic palette, era, and genre.

Rules:
- Tags MUST come from the closed vocabulary. Never invent tags.
- Pick tags that are mutually reinforcing (consistent vibe), not contradictory.
- Prefer specificity over genericity (e.g. 'shoegaze' over 'indie-rock' when accurate).
- If you genuinely don't know a track, infer from the artist's known body of work.
- Return tags via the apply_tags tool.

Closed vocabulary:
${VIBE_TAGS.join(', ')}`;

/**
 * Lazily instantiates the Anthropic client so importing this module
 * doesn't crash when ANTHROPIC_API_KEY isn't set (e.g. during build).
 */
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function fetchUntaggedTracks(limit: number): Promise<TrackInput[]> {
  // Tracks lacking any 'llm'-source vibe_tag row.
  const rows = await db
    .select({
      id: tracks.id,
      name: tracks.trackName,
      album: tracks.albumName,
    })
    .from(tracks)
    .where(sql`NOT EXISTS (SELECT 1 FROM ${vibeTags} WHERE ${vibeTags.trackId} = ${tracks.id} AND ${vibeTags.source} = 'llm')`)
    .limit(limit);

  if (!rows.length) return [];

  // Fetch artist names per track.
  const trackIds = rows.map((r) => r.id);
  const artistRows = await db
    .select({
      trackId: trackArtists.trackId,
      artistName: artists.artistName,
    })
    .from(trackArtists)
    .innerJoin(artists, eq(artists.id, trackArtists.artistId))
    .where(inArray(trackArtists.trackId, trackIds));

  const byTrack = new Map<string, string[]>();
  for (const row of artistRows) {
    const list = byTrack.get(row.trackId) ?? [];
    list.push(row.artistName);
    byTrack.set(row.trackId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    album: r.album,
    artistNames: byTrack.get(r.id) ?? [],
  }));
}

function formatTrackForPrompt(t: TrackInput): string {
  const artistList = t.artistNames.join(', ') || 'unknown';
  const album = t.album ? ` (album: ${t.album})` : '';
  return `- id: ${t.id} | "${t.name}" by ${artistList}${album}`;
}

async function tagBatch(client: Anthropic, batch: TrackInput[]): Promise<{ trackId: string; tags: string[] }[]> {
  const userMessage = `Tag these ${batch.length} tracks:\n\n${batch.map(formatTrackForPrompt).join('\n')}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
    tools: [
      {
        name: 'apply_tags',
        description: 'Submit the vibe tags for each track in the batch.',
        input_schema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  track_id: { type: 'string', description: 'The track id from the input.' },
                  tags: {
                    type: 'array',
                    items: { type: 'string', enum: VIBE_TAGS as unknown as string[] },
                    minItems: 1,
                    maxItems: 8,
                  },
                },
                required: ['track_id', 'tags'],
              },
            },
          },
          required: ['results'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'apply_tags' },
  });

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'apply_tags') {
      const input = block.input as { results: { track_id: string; tags: string[] }[] };
      return input.results.map((r) => ({
        trackId: r.track_id,
        tags: r.tags.filter(isVibeTag),
      }));
    }
  }

  return [];
}

/**
 * Tags untagged tracks with LLM-inferred vibe descriptors.
 * Idempotent: only tags tracks that have no 'llm'-source vibe_tag row.
 */
export async function tagWithLLM(limit = 250): Promise<TagWithLLMResult> {
  const candidates = await fetchUntaggedTracks(limit);

  if (!candidates.length) {
    return { tracksConsidered: 0, tracksTagged: 0, totalTagsApplied: 0, estimatedCostUsd: 0, errors: [] };
  }

  console.log(`🤖 LLM-tagging ${candidates.length} tracks in batches of ${BATCH_SIZE}...`);

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
      const msg = `Batch ${batchCount} failed: ${err?.message ?? String(err)}`;
      console.error(`❌ ${msg}`);
      errors.push(msg);
    }
  }

  const estimatedCostUsd = batchCount * COST_PER_BATCH_USD;

  console.log(`✅ LLM tagging: ${tracksTagged}/${candidates.length} tracks, ${totalTagsApplied} tags applied, ~$${estimatedCostUsd.toFixed(3)}`);

  return {
    tracksConsidered: candidates.length,
    tracksTagged,
    totalTagsApplied,
    estimatedCostUsd,
    errors,
  };
}

