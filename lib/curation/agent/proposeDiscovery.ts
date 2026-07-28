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
