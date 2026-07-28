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

describe('harmonic blend', () => {
  const t = (id: string, energy: number, bpm: number | null, camelotKey: string | null) => ({
    id, energy, bpm, camelotKey,
  });

  it('prefers the harmonic neighbor over an equal-energy clash', () => {
    // both b and c are equidistant in energy from the opener; only b is key-compatible
    const opener = t('open', 0.5, 120, '8A');
    const clash = t('clash', 0.6, 121, '3A');
    const harmonic = t('harm', 0.4, 122, '9A');
    const outro = t('out', 0.2, 100, '5A');
    const out = smoothTransitions([opener, clash, harmonic, outro]).map((x) => x.id);
    expect(out).toEqual(['open', 'harm', 'clash', 'out']);
  });

  it('regression: identical to energy-only ordering when no mix data', () => {
    const bare = (id: string, energy: number) => ({ id, energy });
    const items = [bare('a', 0.5), bare('b', 0.9), bare('c', 0.55), bare('d', 0.2)];
    const withNulls = items.map((x) => ({ ...x, bpm: null, camelotKey: null }));
    expect(smoothTransitions(withNulls).map((x) => x.id)).toEqual(
      smoothTransitions(items).map((x) => x.id)
    );
  });
});
