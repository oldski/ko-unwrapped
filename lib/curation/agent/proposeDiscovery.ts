import Anthropic from '@anthropic-ai/sdk';
import type { PoolTrack } from './types';
import type { ProposedTrack } from './resolveTracks';

const MODEL = 'claude-sonnet-5-5';

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const SYSTEM = `You are a music-discovery specialist for a personal DJ-set builder. Given seed tracks the listener loves (with their vibe tags and genres), propose real, existing tracks in the same sonic/mood neighborhood that a fan of the seeds likely hasn't worn out. Favor: adjacent artists, notable remixes, deeper cuts from adjacent scenes, and era-consistent picks. Every proposal must be a real released track — never invent titles.`;

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
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            proposals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  artist_name: { type: 'string' },
                  track_name: { type: 'string' },
                  reason: { type: 'string', description: 'One line: why this fits the seed vibe.' },
                },
                required: ['artist_name', 'track_name', 'reason'],
                additionalProperties: false,
              },
            },
          },
          required: ['proposals'],
          additionalProperties: false,
        },
      },
    },
  });

  if (response.stop_reason !== 'end_turn') {
    throw new Error(`discovery stopped early: ${response.stop_reason}`);
  }
  const text = response.content.find((b) => b.type === 'text');
  if (text && text.type === 'text') {
    const input = JSON.parse(text.text) as { proposals: { artist_name: string; track_name: string; reason: string }[] };
    return input.proposals
      .filter((p) => p.artist_name && p.track_name)
      .map((p) => ({ artistName: p.artist_name, trackName: p.track_name, reason: p.reason ?? '' }));
  }
  return [];
}
