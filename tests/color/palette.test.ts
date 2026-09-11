import { describe, it, expect } from 'vitest';
import { buildPalette, pickArtworkHue, TEXT_CONTRAST_TARGET } from '@/lib/color/palette';
import { contrast, hexToOklch, oklchToHex } from '@/lib/color/oklch';

/** Artwork shapes that broke the previous channel-scaling palette. */
const ARTWORK_CASES: Record<string, string[]> = {
  'near-black sleeve': ['#050505', '#0a0a0c', '#111014', '#1a1a1f'],
  'blown-out white sleeve': ['#ffffff', '#f7f7f5', '#eeeeea', '#e4e4e0'],
  'pure greyscale': ['#000000', '#404040', '#808080', '#bfbfbf', '#ffffff'],
  'single flat colour': ['#3b2f7a', '#3b2f7a', '#3b2f7a'],
  'vivid neon': ['#00ff9c', '#ff00e6', '#faff00'],
  'muted earth': ['#6b5c4a', '#8a7a63', '#4a4034'],
  'deep navy (the reported failure)': ['#040747', '#171834', '#43476c', '#5076a0'],
};

describe('oklch round-trip', () => {
  it('preserves colour through hex -> oklch -> hex', () => {
    for (const hex of ['#ff0000', '#00ff00', '#0000ff', '#3b2f7a', '#808080', '#000000', '#ffffff']) {
      const oklch = hexToOklch(hex);
      expect(oklch).not.toBeNull();
      expect(oklchToHex(oklch!)).toBe(hex);
    }
  });

  it('keeps lightness when clamping an out-of-gamut chroma', () => {
    // Chroma far beyond sRGB at a mid lightness must not darken the result.
    const clamped = oklchToHex({ l: 0.7, c: 0.9, h: 150 });
    expect(hexToOklch(clamped)!.l).toBeCloseTo(0.7, 1);
  });
});

describe('pickArtworkHue', () => {
  it('ignores near-black and near-white swatches whose hue is noise', () => {
    const { chroma } = pickArtworkHue(['#000000', '#ffffff', '#050505']);
    // Falls back rather than taking a hue from an almost-neutral pixel.
    expect(chroma).toBeGreaterThan(0);
  });

  it('prefers the most chromatic swatch over the most common one', () => {
    // Three near-neutrals and one vivid orange: the orange is the album's colour.
    const { hue } = pickArtworkHue(['#111111', '#1a1a1a', '#222222', '#ff6b00']);
    const orange = hexToOklch('#ff6b00')!;
    expect(Math.abs(hue - orange.h)).toBeLessThan(1);
  });
});

describe('buildPalette contrast guarantees', () => {
  for (const [name, swatches] of Object.entries(ARTWORK_CASES)) {
    describe(name, () => {
      const palette = buildPalette(swatches);

      it('keeps the substrate dark regardless of artwork lightness', () => {
        // The app is dark-themed; a white sleeve must not produce a light page.
        expect(hexToOklch(palette.surfaceBase)!.l).toBeLessThan(0.3);
      });

      it('orders surfaces from base to raised', () => {
        const l = (hex: string) => hexToOklch(hex)!.l;
        expect(l(palette.surfaceBase)).toBeLessThan(l(palette.surfacePanel));
        expect(l(palette.surfacePanel)).toBeLessThan(l(palette.surfaceRaised));
      });

      it.each(['inkPrimary', 'inkMuted', 'inkSignal'] as const)(
        '%s clears 4.5:1 on both surfaces',
        (token) => {
          expect(contrast(palette[token], palette.surfaceBase)).toBeGreaterThanOrEqual(TEXT_CONTRAST_TARGET);
          expect(contrast(palette[token], palette.surfacePanel)).toBeGreaterThanOrEqual(TEXT_CONTRAST_TARGET);
        },
      );

      it('inkOnSignal clears 4.5:1 on the signal fill', () => {
        expect(contrast(palette.inkOnSignal, palette.surfaceSignal)).toBeGreaterThanOrEqual(TEXT_CONTRAST_TARGET);
      });

      it('keeps borders visible without pretending to be text', () => {
        expect(contrast(palette.line, palette.surfaceBase)).toBeGreaterThan(1.2);
      });
    });
  }

  it('holds for arbitrary artwork', () => {
    // Sweep the hue circle at several chroma and lightness levels rather than
    // trusting a handful of hand-picked sleeves.
    for (let hue = 0; hue < 360; hue += 7) {
      for (const l of [0.1, 0.35, 0.6, 0.85]) {
        for (const c of [0.02, 0.1, 0.25]) {
          const swatch = oklchToHex({ l, c, h: hue });
          const palette = buildPalette([swatch]);

          for (const token of ['inkPrimary', 'inkMuted', 'inkSignal'] as const) {
            const ratio = contrast(palette[token], palette.surfacePanel);
            expect(
              ratio,
              `${token} on ${swatch} (h=${hue} l=${l} c=${c}) was ${ratio.toFixed(2)}`,
            ).toBeGreaterThanOrEqual(TEXT_CONTRAST_TARGET);
          }

          expect(hexToOklch(palette.surfaceBase)!.l).toBeLessThan(0.3);
        }
      }
    }
  });
});
