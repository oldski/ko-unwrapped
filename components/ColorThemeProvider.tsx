'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import useColorThief from 'use-color-thief';

interface AudioFeatures {
  tempo: number;
  energy: number;
  valence: number;
  danceability: number;
}

interface NowPlayingData {
  isPlaying: boolean;
  albumImageUrl: string;
  audioFeatures?: AudioFeatures;
  title?: string;
  artist?: string;
}

interface ColorPalette {
  // Original extracted colors
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
  color8: string;

  // Semantic colors
  primary: string;
  secondary: string;
  accent: string;

  // Variations
  vibrant: string;
  muted: string;
  light: string;
  dark: string;
  darker: string;
  lighter: string;

  // Backgrounds
  bg1: string;
  bg2: string;
  bg3: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  border: string;

  // Complementary colors
  complementary1: string;
  complementary2: string;
}

const ColorThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const previousTrackRef = useRef<string>('');

  const { data, error } = useSWR<NowPlayingData>(
    `${process.env.NEXT_PUBLIC_HOST}/api/now-playing`,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Extract colors from album artwork
  const { color: dominantColor, palette: colors } = useColorThief(imgSrc, {
    format: 'hex',
    quality: 10,
    colorCount: 8, // Extract 8 colors
  });

  // Update image source when track changes
  useEffect(() => {
    if (data?.isPlaying && data.albumImageUrl) {
      if (data.albumImageUrl !== previousTrackRef.current) {
        previousTrackRef.current = data.albumImageUrl;
        setImgSrc(data.albumImageUrl);
      }
    }
  }, [data?.albumImageUrl, data?.isPlaying]);

  // Helper functions for color manipulation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (n: number) => Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const adjustBrightness = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const adjust = (val: number) => val + (val * percent / 100);

    return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
  };

  const adjustSaturation = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    // Convert to HSL
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    // Adjust saturation
    s = Math.min(1, Math.max(0, s + (percent / 100)));

    // Convert back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let rOut, gOut, bOut;
    if (s === 0) {
      rOut = gOut = bOut = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      rOut = hue2rgb(p, q, h + 1/3);
      gOut = hue2rgb(p, q, h);
      bOut = hue2rgb(p, q, h - 1/3);
    }

    return rgbToHex(rOut * 255, gOut * 255, bOut * 255);
  };

  // Get complementary color (opposite on color wheel)
  const getComplementary = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    // Simple complementary: invert RGB values
    return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
  };

  // Calculate luminance for contrast checking
  const getLuminance = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;

    const a = [rgb.r, rgb.g, rgb.b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  // Generate rich color palette
  const colorPalette: ColorPalette = useMemo(() => {
    // Default palette
    const defaultPalette: ColorPalette = {
      color1: '#0f172a',
      color2: '#1e293b',
      color3: '#334155',
      color4: '#475569',
      color5: '#64748b',
      color6: '#94a3b8',
      color7: '#cbd5e1',
      color8: '#e2e8f0',
      primary: '#06b6d4',
      secondary: '#8b5cf6',
      accent: '#ec4899',
      vibrant: '#f59e0b',
      muted: '#6b7280',
      light: '#f3f4f6',
      dark: '#111827',
      darker: '#030712',
      lighter: '#f9fafb',
      bg1: '#0f172a',
      bg2: '#1e293b',
      bg3: '#334155',
      textPrimary: '#ffffff',
      textSecondary: '#d1d5db',
      border: '#374151',
      complementary1: '#fbbf24',
      complementary2: '#f97316',
    };

    if (!colors || colors.length < 3) {
      return defaultPalette;
    }

    // Use all 8 extracted colors
    const extractedColors = Array(8).fill(null).map((_, i) =>
      (colors[i] as string) || defaultPalette[`color${i + 1}` as keyof ColorPalette]
    );

    const [c1, c2, c3, c4, c5, c6, c7, c8] = extractedColors;

    // Create variations
    const vibrant = adjustSaturation(c2, 50);
    const muted = adjustSaturation(c3, -30);
    const light = adjustBrightness(c4, 60);
    const dark = adjustBrightness(c1, -40);
    const darker = adjustBrightness(c1, -60);
    const lighter = adjustBrightness(c6, 80);

    // Background colors (darker variants)
    const bg1 = adjustBrightness(c1, -30);
    const bg2 = c1;
    const bg3 = adjustBrightness(c2, 20);

    // Determine text colors based on overall palette luminance
    const avgLuminance = (getLuminance(c1) + getLuminance(c2) + getLuminance(c3)) / 3;
    const textPrimary = avgLuminance > 0.4 ? '#000000' : '#ffffff';
    const textSecondary = avgLuminance > 0.4 ? '#374151' : '#d1d5db';

    // Complementary colors
    const complementary1 = getComplementary(c2);
    const complementary2 = getComplementary(c4);

    return {
      color1: c1,
      color2: c2,
      color3: c3,
      color4: c4,
      color5: c5,
      color6: c6,
      color7: c7,
      color8: c8,
      primary: c2,
      secondary: c4,
      accent: c6,
      vibrant,
      muted,
      light,
      dark,
      darker,
      lighter,
      bg1,
      bg2,
      bg3,
      textPrimary,
      textSecondary,
      border: adjustBrightness(c2, avgLuminance > 0.4 ? -20 : 20),
      complementary1,
      complementary2,
    };
  }, [colors]);

  // Update CSS variables when colors change
  useEffect(() => {
    const root = document.documentElement;

    if (data?.isPlaying && colorPalette) {
      // Original colors
      root.style.setProperty('--color-1', colorPalette.color1);
      root.style.setProperty('--color-2', colorPalette.color2);
      root.style.setProperty('--color-3', colorPalette.color3);
      root.style.setProperty('--color-4', colorPalette.color4);
      root.style.setProperty('--color-5', colorPalette.color5);
      root.style.setProperty('--color-6', colorPalette.color6);
      root.style.setProperty('--color-7', colorPalette.color7);
      root.style.setProperty('--color-8', colorPalette.color8);

      // Semantic colors
      root.style.setProperty('--color-primary', colorPalette.primary);
      root.style.setProperty('--color-secondary', colorPalette.secondary);
      root.style.setProperty('--color-accent', colorPalette.accent);

      // Variations
      root.style.setProperty('--color-vibrant', colorPalette.vibrant);
      root.style.setProperty('--color-muted', colorPalette.muted);
      root.style.setProperty('--color-light', colorPalette.light);
      root.style.setProperty('--color-dark', colorPalette.dark);
      root.style.setProperty('--color-darker', colorPalette.darker);
      root.style.setProperty('--color-lighter', colorPalette.lighter);

      // Backgrounds
      root.style.setProperty('--color-bg-1', colorPalette.bg1);
      root.style.setProperty('--color-bg-2', colorPalette.bg2);
      root.style.setProperty('--color-bg-3', colorPalette.bg3);

      // Text
      root.style.setProperty('--color-text-primary', colorPalette.textPrimary);
      root.style.setProperty('--color-text-secondary', colorPalette.textSecondary);
      root.style.setProperty('--color-border', colorPalette.border);

      // Complementary
      root.style.setProperty('--color-complementary-1', colorPalette.complementary1);
      root.style.setProperty('--color-complementary-2', colorPalette.complementary2);
    } else {
      // Reset to defaults when not playing
      root.style.setProperty('--color-1', '#0f172a');
      root.style.setProperty('--color-2', '#1e293b');
      root.style.setProperty('--color-3', '#334155');
      root.style.setProperty('--color-4', '#475569');
      root.style.setProperty('--color-5', '#64748b');
      root.style.setProperty('--color-6', '#94a3b8');
      root.style.setProperty('--color-7', '#cbd5e1');
      root.style.setProperty('--color-8', '#e2e8f0');
      root.style.setProperty('--color-primary', '#06b6d4');
      root.style.setProperty('--color-secondary', '#8b5cf6');
      root.style.setProperty('--color-accent', '#ec4899');
      root.style.setProperty('--color-vibrant', '#f59e0b');
      root.style.setProperty('--color-muted', '#6b7280');
      root.style.setProperty('--color-light', '#f3f4f6');
      root.style.setProperty('--color-dark', '#111827');
      root.style.setProperty('--color-darker', '#030712');
      root.style.setProperty('--color-lighter', '#f9fafb');
      root.style.setProperty('--color-bg-1', '#0f172a');
      root.style.setProperty('--color-bg-2', '#1e293b');
      root.style.setProperty('--color-bg-3', '#334155');
      root.style.setProperty('--color-text-primary', '#ffffff');
      root.style.setProperty('--color-text-secondary', '#d1d5db');
      root.style.setProperty('--color-border', '#374151');
      root.style.setProperty('--color-complementary-1', '#fbbf24');
      root.style.setProperty('--color-complementary-2', '#f97316');
    }
  }, [colorPalette, data?.isPlaying]);

  return <>{children}</>;
};

export default ColorThemeProvider;
