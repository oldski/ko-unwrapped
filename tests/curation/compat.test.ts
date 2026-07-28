import { describe, it, expect } from 'vitest';
import { harmonicCompat } from '@/lib/curation/mix/compat';

const mix = (bpm: number | null, camelotKey: string | null) => ({ bpm, camelotKey });

describe('harmonicCompat', () => {
  it('computes straight bpm delta as a percentage', () => {
    const c = harmonicCompat(mix(120, null), mix(126, null));
    expect(c.bpmDelta).toBeCloseTo(5, 1);
    expect(c.keyRelation).toBeNull();
  });

  it('uses double/half time when closer', () => {
    expect(harmonicCompat(mix(70, null), mix(140, null)).bpmDelta).toBeCloseTo(0, 1);
    expect(harmonicCompat(mix(140, null), mix(72, null)).bpmDelta).toBeCloseTo(2.9, 1);
  });

  it('classifies key relations on the wheel', () => {
    expect(harmonicCompat(mix(null, '8A'), mix(null, '8A')).keyRelation).toBe('same');
    expect(harmonicCompat(mix(null, '8A'), mix(null, '9A')).keyRelation).toBe('adjacent');
    expect(harmonicCompat(mix(null, '8A'), mix(null, '8B')).keyRelation).toBe('energy-boost');
    expect(harmonicCompat(mix(null, '8A'), mix(null, '3A')).keyRelation).toBe('clash');
  });

  it('wraps the wheel: 12 and 1 are adjacent', () => {
    expect(harmonicCompat(mix(null, '12A'), mix(null, '1A')).keyRelation).toBe('adjacent');
    expect(harmonicCompat(mix(null, '1B'), mix(null, '12B')).keyRelation).toBe('adjacent');
  });

  it('scores perfect pairings 1 and clashes low', () => {
    expect(harmonicCompat(mix(120, '8A'), mix(120, '8A')).score).toBe(1);
    expect(harmonicCompat(mix(120, '8A'), mix(150, '3A')).score).toBeLessThan(0.25);
  });

  it('missing data is neutral, never a penalty', () => {
    const none = harmonicCompat(mix(null, null), mix(null, null));
    expect(none.bpmDelta).toBeNull();
    expect(none.keyRelation).toBeNull();
    expect(none.score).toBe(0.5);
    // one-sided data: only the available component counts
    expect(harmonicCompat(mix(120, null), mix(120, null)).score).toBe(1);
  });
});
