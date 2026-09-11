import { describe, it, expect } from 'vitest';
import {
  buildChartPalette,
  buildSequentialRamp,
  CHART_SURFACE,
  SERIES_HUE_OFFSETS,
} from '@/lib/color/chartPalette';
import { contrast, hexToOklch, oklchToHex } from '@/lib/color/oklch';

/**
 * The six checks from the dataviz method, reimplemented here so they run in CI
 * rather than only at design time. Thresholds and the CVD simulation model
 * (Machado-Oliveira-Fernandes 2009 at severity 1.0) match that standard.
 */

// Upper edge widened: sRGB cannot hold the chroma floor at every hue much
// below L 0.79 for the lighter slot. See chartPalette.ts for why the nominal
// ~0.67 band gives way to the chroma and contrast floors.
const LIGHTNESS_BAND_DARK = { min: 0.48, max: 0.80 };
const CHROMA_FLOOR = 0.1;
const CVD_TARGET = 8;
const NORMAL_VISION_FLOOR = 15;
const MARK_CONTRAST_MIN = 3;

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)!;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Machado 2009 severity-1.0 matrices. */
const CVD_MATRICES: Record<string, number[][]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

function oklab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function simulate(hex: string, kind: keyof typeof CVD_MATRICES): string {
  const rgb = hexToRgb(hex).map((v) => v / 255);
  const m = CVD_MATRICES[kind];
  const out = m.map((row) => row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]);
  return (
    '#' +
    out
      .map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Euclidean distance in OKLab, x100 — the method's ΔE. */
function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = oklab(a);
  const [l2, a2, b2] = oklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100;
}

const ALBUM_HUES = Array.from({ length: 180 }, (_, i) => i * 2);

describe('chart palette', () => {
  it('offers exactly two categorical slots', () => {
    // The ceiling is measured, not stylistic: no three-slot arrangement clears
    // the CVD threshold at every album hue. A third series becomes a facet.
    expect(SERIES_HUE_OFFSETS).toHaveLength(2);
  });

  describe.each([0, 47, 120, 199, 264, 311])('album hue %i', (hue) => {
    const { series, grid, axis } = buildChartPalette(hue);

    it('keeps every slot inside the dark lightness band', () => {
      for (const colour of series) {
        const { l } = hexToOklch(colour)!;
        expect(l).toBeGreaterThanOrEqual(LIGHTNESS_BAND_DARK.min - 0.001);
        expect(l).toBeLessThanOrEqual(LIGHTNESS_BAND_DARK.max + 0.001);
      }
    });

    it('keeps every slot above the chroma floor', () => {
      for (const colour of series) {
        expect(hexToOklch(colour)!.c).toBeGreaterThanOrEqual(CHROMA_FLOOR);
      }
    });

    it('clears 3:1 against the chart surface', () => {
      for (const colour of series) {
        expect(contrast(colour, CHART_SURFACE)).toBeGreaterThanOrEqual(MARK_CONTRAST_MIN);
      }
    });

    it('keeps grid and axis recessive rather than competing with marks', () => {
      // The grid must not out-contrast the marks it sits behind.
      const weakestMark = Math.min(...series.map((c) => contrast(c, CHART_SURFACE)));
      expect(contrast(grid, CHART_SURFACE)).toBeLessThan(weakestMark);
      expect(contrast(axis, CHART_SURFACE)).toBeGreaterThanOrEqual(MARK_CONTRAST_MIN);
    });
  });

  it('separates slots under protanopia and deuteranopia at every album hue', () => {
    let worstCvd = Infinity;
    let worstHue = -1;

    for (const hue of ALBUM_HUES) {
      const [a, b] = buildChartPalette(hue).series;
      for (const kind of ['protan', 'deutan'] as const) {
        const d = deltaE(simulate(a, kind), simulate(b, kind));
        if (d < worstCvd) {
          worstCvd = d;
          worstHue = hue;
        }
      }
    }

    expect(worstCvd, `worst CVD ΔE ${worstCvd.toFixed(1)} at album hue ${worstHue}`)
      .toBeGreaterThanOrEqual(CVD_TARGET);
  });

  it('clears the normal-vision floor at every album hue', () => {
    let worst = Infinity;
    for (const hue of ALBUM_HUES) {
      const [a, b] = buildChartPalette(hue).series;
      worst = Math.min(worst, deltaE(a, b));
    }
    expect(worst, `worst normal-vision ΔE ${worst.toFixed(1)}`)
      .toBeGreaterThanOrEqual(NORMAL_VISION_FLOOR);
  });
});

describe('sequential ramp', () => {
  it('rises monotonically in lightness so magnitude reads as magnitude', () => {
    for (const hue of [0, 90, 180, 270]) {
      const ramp = buildSequentialRamp(hue, 5);
      const lightness = ramp.map((c) => hexToOklch(c)!.l);
      for (let i = 1; i < lightness.length; i++) {
        expect(lightness[i]).toBeGreaterThan(lightness[i - 1]);
      }
    }
  });

  it('separates its lowest step from an empty calendar cell', () => {
    // An empty day is painted --surface-raised. If the ramp starts too near
    // it, "one play" and "no plays" look the same: measured at 1.11:1 before
    // the floor was raised.
    for (let hue = 0; hue < 360; hue += 10) {
      const emptyCell = oklchToHex({ l: 0.29, c: 0.032, h: hue });
      const lowest = buildSequentialRamp(hue, 5)[0];
      expect(contrast(lowest, emptyCell), `album hue ${hue}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps the brightest step legible against the surface', () => {
    for (const hue of [0, 90, 180, 270]) {
      const ramp = buildSequentialRamp(hue, 5);
      expect(contrast(ramp.at(-1)!, CHART_SURFACE)).toBeGreaterThanOrEqual(MARK_CONTRAST_MIN);
    }
  });
});
