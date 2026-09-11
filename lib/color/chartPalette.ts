/**
 * Chart series colours derived from the album hue.
 *
 * The artwork gives one hue, but categorical series need hues a reader can
 * tell apart, including under colour-vision deficiency. Deriving every series
 * from the single album hue would make them indistinguishable.
 *
 * So the palette is a **fixed rotation**: each slot sits at a constant hue
 * offset from the album's hue, at a lightness and chroma pinned to the dark
 * chart band. Relative hue distances never change, so separation between
 * slots is a property of the offsets rather than of the artwork, and holds for
 * every album. The whole set rotates with the sleeve.
 *
 * Offsets and steps are validated across the hue circle by
 * tests/color/chartPalette.test.ts, which runs the same six checks the
 * dataviz validator applies (lightness band, chroma floor, CVD separation
 * under protanopia and deuteranopia, a normal-vision floor, and contrast
 * against the chart surface).
 */

import { contrast, hexToOklch, oklchToHex } from './oklch';

/**
 * Hue offsets in degrees from the album hue, plus the lightness each slot sits
 * at. **Two slots, and the limit is a measured one, not a stylistic choice.**
 *
 * Protanopia and deuteranopia collapse the red–green axis, so hue separation
 * alone survives only for some rotations. A sweep of three-slot candidates
 * across the hue circle found none that clears the CVD threshold at every
 * album hue: the best scored ΔE 2.6 against a target of 8. Most of the
 * separation here therefore comes from **lightness**, which CVD leaves intact,
 * with hue adding to it.
 *
 * Verified over 180 album hues under all-pairs testing: worst CVD ΔE 18.6,
 * worst normal-vision ΔE 20.2, minimum contrast 3.73:1 against the panel.
 * See tests/color/chartPalette.test.ts.
 *
 * The upper slot sits above the nominal ~0.67 dark band. That is forced, not
 * chosen: sRGB cannot hold the chroma floor at every hue much below L 0.79 for
 * the lighter slot, and no in-band pair clears contrast, chroma and CVD
 * together at every album hue. The band edge is approximate; contrast and
 * chroma are hard reader-facing floors, so the band gives way.
 *
 * A third series is never a generated hue. It becomes a small multiple, where
 * each facet carries one series and the categorical constraint does not apply.
 */
export const SERIES_HUE_OFFSETS = [0, 15] as const;

/** Lightness per slot. Spread wide inside the dark band to survive CVD. */
const SERIES_LIGHTNESS = [0.59, 0.79] as const;

/** Chroma per slot, above the 0.10 floor where hue stops reading as identity. */
const SERIES_CHROMA = [0.15, 0.15] as const;

/** Chart surface the palette is validated against: the panel fill. */
export const CHART_SURFACE = '#1d1d28';

export type ChartPalette = {
  /** Categorical series, in fixed order. Assign in sequence, never cycled. */
  series: [string, string];
  /** Grid lines and axis rules. Recessive by design. */
  grid: string;
  /** Axis tick labels. */
  axis: string;
  /** Tooltip surface. */
  tooltipBg: string;
  /** Tooltip border. */
  tooltipBorder: string;
};

/** Build the chart palette for a given album hue. */
export function buildChartPalette(albumHue: number): ChartPalette {
  const series = SERIES_HUE_OFFSETS.map((offset, i) =>
    oklchToHex({
      l: SERIES_LIGHTNESS[i],
      c: SERIES_CHROMA[i],
      h: (albumHue + offset) % 360,
    }),
  ) as [string, string];

  return {
    series,
    // Grid and axis carry no identity, so they stay near-neutral: a tinted
    // grid competes with the marks for the reader's attention.
    grid: oklchToHex({ l: 0.32, c: 0.012, h: albumHue }),
    axis: oklchToHex({ l: 0.68, c: 0.015, h: albumHue }),
    tooltipBg: oklchToHex({ l: 0.22, c: 0.02, h: albumHue }),
    tooltipBorder: oklchToHex({ l: 0.36, c: 0.03, h: albumHue }),
  };
}

/**
 * A single-hue ramp for magnitude, light to dark reversed for a dark surface:
 * low values sit close to the substrate, high values read brightest.
 */
export function buildSequentialRamp(albumHue: number, steps = 5): string[] {
  const from = 0.32;
  const to = 0.78;
  return Array.from({ length: steps }, (_, i) => {
    const t = steps === 1 ? 1 : i / (steps - 1);
    return oklchToHex({ l: from + (to - from) * t, c: 0.06 + 0.1 * t, h: albumHue });
  });
}

/** Read the album hue the theme provider published, with a sane fallback. */
export function readAlbumHue(fallback = 264): number {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--album-hue')
    .trim();
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Contrast of a series colour against the chart surface. Used by tests. */
export function seriesContrast(colour: string, surface: string): number {
  return contrast(colour, surface);
}

export { hexToOklch };
