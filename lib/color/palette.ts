/**
 * Build a legible dark-theme palette from album artwork.
 *
 * The governing rule: **the artwork chooses hue and chroma, the system
 * chooses lightness.** Album colours arrive in any lightness at all, from
 * near-black sleeves to blown-out white ones, so lightness cannot be trusted
 * to come from the image. It is pinned to a fixed ladder instead, and only
 * hue and chroma survive from the artwork. Legibility stops being luck.
 *
 * Tokens are split into two families whose names cannot be confused:
 *   ink*     — only ever a foreground. Verified against the surface it sits on.
 *   surface* — only ever a background. Verified to hold `inkOnSignal`.
 *
 * The previous system had one set of tokens serving both roles, contrast-
 * checked against white rather than against the real page background, which
 * is how `--color-vibrant-safe` ended up at #040747 on a black page and still
 * called "safe".
 */

import { contrast, hexToOklch, oklchToHex, type Oklch } from './oklch';

export interface Palette {
  /** Page substrate. Always dark, faintly tinted by the artwork. */
  surfaceBase: string;
  /** Card fill, one step up from the substrate. */
  surfacePanel: string;
  /** Raised elements: inputs, chips, hovered rows. */
  surfaceRaised: string;
  /** Saturated fill for selected and primary elements. Holds `inkOnSignal`. */
  surfaceSignal: string;
  /** Hairlines and card borders. Not held to text contrast. */
  line: string;

  /** Body and heading text. */
  inkPrimary: string;
  /** Secondary text, captions, axis labels. */
  inkMuted: string;
  /** Album-coloured text and icons. Legible on base and panel alike. */
  inkSignal: string;
  /** Text placed on top of `surfaceSignal`. */
  inkOnSignal: string;

  /** Hue taken from the artwork, in degrees. Exposed for the visualisers. */
  hue: number;
  /** Chroma taken from the artwork. */
  chroma: number;
}

/** Minimum WCAG ratio for normal-size body text. */
export const TEXT_CONTRAST_TARGET = 4.5;

/**
 * Lightness ladder. These are the only lightness values in the system, which
 * is what keeps every album on the same footing.
 */
const L = {
  base: 0.17,
  panel: 0.23,
  raised: 0.29,
  line: 0.36,
  signalFill: 0.55,
  inkMuted: 0.76,
  inkSignal: 0.82,
  inkPrimary: 0.96,
} as const;

/** Chroma ceilings, so a vivid sleeve cannot produce a garish interface. */
const C = {
  base: 0.018,
  panel: 0.026,
  raised: 0.032,
  line: 0.04,
  signalFill: 0.16,
  inkMuted: 0.02,
  inkSignal: 0.15,
  inkPrimary: 0.01,
} as const;

const DEFAULT_HUE = 264;
const DEFAULT_CHROMA = 0.13;

/**
 * Choose the hue that best represents the artwork.
 *
 * Picks the most chromatic swatch rather than the most common one. Dominant
 * colours in album art are very often near-neutral blacks and whites, whose
 * hue angle is meaningless noise; the colour a person would actually name as
 * "the colour of this sleeve" is the saturated one.
 */
export function pickArtworkHue(swatches: string[]): { hue: number; chroma: number } {
  let best: Oklch | null = null;

  for (const swatch of swatches) {
    const colour = hexToOklch(swatch);
    if (!colour) continue;
    // Ignore near-blacks and near-whites: their hue is unstable.
    if (colour.l < 0.12 || colour.l > 0.95) continue;
    if (!best || colour.c > best.c) best = colour;
  }

  if (!best || best.c < 0.02) {
    return { hue: DEFAULT_HUE, chroma: DEFAULT_CHROMA };
  }

  return { hue: best.h, chroma: best.c };
}

/**
 * Raise a foreground's lightness until it clears `target` against `surface`.
 * Only lightness moves, so the colour keeps the album's hue.
 */
function ensureLegible(
  colour: Oklch,
  surface: string,
  target = TEXT_CONTRAST_TARGET,
): string {
  let candidate = oklchToHex(colour);
  if (contrast(candidate, surface) >= target) return candidate;

  for (let l = colour.l; l <= 1; l += 0.02) {
    candidate = oklchToHex({ ...colour, l });
    if (contrast(candidate, surface) >= target) return candidate;
  }

  return '#ffffff';
}

export function buildPalette(swatches: string[]): Palette {
  const { hue, chroma } = pickArtworkHue(swatches);

  // Chroma from the artwork, but never beyond each role's ceiling. A muted
  // sleeve yields a muted interface; a vivid one cannot blow past the cap.
  const at = (l: number, ceiling: number) =>
    oklchToHex({ l, c: Math.min(chroma, ceiling), h: hue });

  const surfaceBase = at(L.base, C.base);
  const surfacePanel = at(L.panel, C.panel);
  const surfaceRaised = at(L.raised, C.raised);
  const surfaceSignal = at(L.signalFill, C.signalFill);
  const line = at(L.line, C.line);

  // Inks are verified against surfacePanel, the lighter of the two surfaces
  // they sit on, so they clear the target on the base as well.
  const inkPrimary = ensureLegible(
    { l: L.inkPrimary, c: Math.min(chroma, C.inkPrimary), h: hue },
    surfacePanel,
  );
  const inkMuted = ensureLegible(
    { l: L.inkMuted, c: Math.min(chroma, C.inkMuted), h: hue },
    surfacePanel,
  );
  const inkSignal = ensureLegible(
    { l: L.inkSignal, c: Math.min(chroma, C.inkSignal), h: hue },
    surfacePanel,
  );

  // Text on the signal fill goes dark or light, whichever clears by more.
  const darkOnSignal = oklchToHex({ l: 0.16, c: Math.min(chroma, 0.04), h: hue });
  const inkOnSignal =
    contrast(darkOnSignal, surfaceSignal) >= contrast('#ffffff', surfaceSignal)
      ? darkOnSignal
      : '#ffffff';

  return {
    surfaceBase,
    surfacePanel,
    surfaceRaised,
    surfaceSignal,
    line,
    inkPrimary,
    inkMuted,
    inkSignal,
    inkOnSignal,
    hue,
    chroma,
  };
}

/** Palette used before any artwork has loaded. */
export const FALLBACK_PALETTE: Palette = buildPalette([]);
