/**
 * sRGB <-> OKLCH conversion.
 *
 * OKLCH is perceptually uniform in lightness, which is the whole point here:
 * "set this colour to L 0.78" produces the same apparent brightness whatever
 * the hue. The previous palette code scaled RGB channels directly, which is
 * not perceptual and breaks down entirely near black, where multiplying a
 * channel by any factor leaves it black.
 */

export interface Oklch {
  /** Perceptual lightness, 0 (black) to 1 (white). */
  l: number;
  /** Chroma, 0 (grey) upward. Roughly 0.37 is the sRGB maximum. */
  c: number;
  /** Hue angle in degrees, 0-360. */
  h: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function hexToRgb(hex: string): [number, number, number] | null {
  const normalised = hex.trim().replace(/^#/, '');
  const expanded =
    normalised.length === 3
      ? normalised.split('').map((ch) => ch + ch).join('')
      : normalised;

  if (!/^[0-9a-f]{6}$/i.test(expanded)) return null;

  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const channel = (v: number) =>
    Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

const toLinear = (v: number) =>
  v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

const toGamma = (v: number) =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;

export function hexToOklch(hex: string): Oklch | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const [r, g, b] = rgb.map((v) => toLinear(v / 255));

  const lms = [
    0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b,
    0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b,
    0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b,
  ].map(Math.cbrt);

  const [l_, m_, s_] = lms;
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const hue = (Math.atan2(bb, a) * 180) / Math.PI;

  return {
    l: L,
    c: Math.sqrt(a * a + bb * bb),
    h: hue < 0 ? hue + 360 : hue,
  };
}

/** Raw conversion, which may fall outside the sRGB gamut. */
function oklchToLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: number[]) =>
  rgb.every((v) => v >= -0.0001 && v <= 1.0001);

/**
 * Convert to a hex colour, reducing chroma until the result fits in sRGB.
 * Lightness is preserved exactly, because lightness is what carries
 * legibility; saturation is the part we can afford to give up.
 */
export function oklchToHex(colour: Oklch): string {
  let { c } = colour;
  const { l, h } = colour;

  if (inGamut(oklchToLinearRgb(colour))) {
    const [r, g, b] = oklchToLinearRgb(colour).map(toGamma);
    return rgbToHex(r, g, b);
  }

  // Binary search the largest in-gamut chroma at this lightness and hue.
  let low = 0;
  let high = c;
  for (let i = 0; i < 20; i++) {
    c = (low + high) / 2;
    if (inGamut(oklchToLinearRgb({ l, c, h }))) low = c;
    else high = c;
  }

  const [r, g, b] = oklchToLinearRgb({ l, c: low, h }).map(toGamma);
  return rgbToHex(r, g, b);
}

/** WCAG 2.1 relative luminance. */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => toLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
