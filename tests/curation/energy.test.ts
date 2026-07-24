import { describe, it, expect } from 'vitest';
import { energyFromTags, DEFAULT_ENERGY } from '@/lib/curation/energy';

describe('energyFromTags', () => {
  it('returns DEFAULT_ENERGY for no tags', () => {
    expect(energyFromTags([])).toBe(DEFAULT_ENERGY);
  });

  it('returns DEFAULT_ENERGY when no tag is energy-mapped', () => {
    expect(energyFromTags(['summer', 'retro-80s'])).toBe(DEFAULT_ENERGY);
  });

  it('rates high-energy tags high', () => {
    expect(energyFromTags(['high-energy', 'dancefloor'])).toBeGreaterThan(0.7);
  });

  it('rates ambient/low tags low', () => {
    expect(energyFromTags(['ambient', 'low-energy'])).toBeLessThan(0.3);
  });

  it('averages mapped tags and ignores unmapped ones', () => {
    const withNoise = energyFromTags(['high-energy', 'ambient', 'summer']);
    const withoutNoise = energyFromTags(['high-energy', 'ambient']);
    expect(withNoise).toBeCloseTo(withoutNoise, 5);
  });

  it('is clamped to [0, 1]', () => {
    const v = energyFromTags(['frenetic', 'high-energy', 'workout']);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });
});
