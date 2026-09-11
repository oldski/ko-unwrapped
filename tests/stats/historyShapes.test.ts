import { describe, it, expect, beforeAll } from 'vitest';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * Guards the `fields` shapes on /api/stats/history.
 *
 * The endpoint serves five consumers; four of them read a small subset. These
 * assert each shape carries what its callers use and nothing heavier, so a
 * future change cannot quietly re-inflate the payload.
 */
const maybe = process.env.DATABASE_URL ? describe : describe.skip;

maybe('GET /api/stats/history shapes', () => {
  let GET: (req: Request) => Promise<Response>;
  const url = (qs: string) => new Request(`http://test/api/stats/history?${qs}`);

  beforeAll(async () => {
    ({ GET } = await import('@/app/api/stats/history/route'));
  });

  it('fields=count returns a total and no rows', async () => {
    const body = await (await GET(url('fields=count'))).json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
    expect(body.count).toBeGreaterThan(0);
  }, 120_000);

  it('fields=count is not capped by limit', async () => {
    // The FAB reads this as "total plays". Before, it was the row count and so
    // silently capped at whatever limit was passed.
    const [small, large] = await Promise.all([
      (await GET(url('fields=count&limit=5'))).json(),
      (await GET(url('fields=count&limit=10000'))).json(),
    ]);
    expect(small.count).toBe(large.count);
  }, 120_000);

  it('fields=minimal carries playedAt, popularity and duration only', async () => {
    const body = await (await GET(url('fields=minimal&limit=5'))).json();
    expect(body.data.length).toBeGreaterThan(0);

    const [row] = body.data;
    expect(Object.keys(row).sort()).toEqual(['playedAt', 'track']);
    expect(Object.keys(row.track).sort()).toEqual(['durationMs', 'popularity']);
  }, 120_000);

  it('is materially smaller than the full shape', async () => {
    const size = async (qs: string) =>
      JSON.stringify(await (await GET(url(qs))).json()).length;

    const [full, minimal, countOnly] = await Promise.all([
      size('limit=300'),
      size('limit=300&fields=minimal'),
      size('fields=count'),
    ]);

    expect(minimal).toBeLessThan(full / 3);
    expect(countOnly).toBeLessThan(200);
  }, 180_000);

  it('defaults to the full shape so existing callers are unaffected', async () => {
    const body = await (await GET(url('limit=3'))).json();
    const [row] = body.data;
    expect(row.track).toHaveProperty('artists');
    expect(row.track).toHaveProperty('name');
    expect(row).toHaveProperty('audioFeatures');
  }, 120_000);
});
