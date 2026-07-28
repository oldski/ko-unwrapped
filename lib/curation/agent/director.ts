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
