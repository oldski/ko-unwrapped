'use client';

import { useMemo } from 'react';
import { useAmbientTheme } from '@/components/ColorThemeProvider';
import { buildChartPalette, buildSequentialRamp, type ChartPalette } from '@/lib/color/chartPalette';

/**
 * Chart colours for the current album.
 *
 * Series colours are a fixed rotation from the album hue, so separation
 * between them is a property of the offsets and holds for every album. See
 * lib/color/chartPalette.ts.
 */
export function useChartPalette(): ChartPalette {
  const { albumHue } = useAmbientTheme();
  return useMemo(() => buildChartPalette(albumHue), [albumHue]);
}

/** Single-hue ramp for magnitude, in the album's hue. */
export function useSequentialRamp(steps = 5): string[] {
  const { albumHue } = useAmbientTheme();
  return useMemo(() => buildSequentialRamp(albumHue, steps), [albumHue, steps]);
}
