'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import useColorThief from 'use-color-thief';
import { motion, AnimatePresence } from 'framer-motion';

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

interface ColorScheme {
  color1: string;
  color2: string;
  color3: string;
  primary: string;
  secondary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}

const DynamicBackground = () => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [gradientType, setGradientType] = useState<string>('linear');
  const [gradientDirection, setGradientDirection] = useState<string>('to bottom right');
  const [currentColors, setCurrentColors] = useState<ColorScheme | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousTrackRef = useRef<string>('');

  const { data, error } = useSWR<NowPlayingData>(
    `${process.env.NEXT_PUBLIC_HOST}/api/now-playing`,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Extract colors from album artwork
  const { color: primaryColor, palette: colors } = useColorThief(imgSrc, {
    format: 'hex',
    quality: 10,
    colorCount: 6,
  });

  // Update image source when track changes
  useEffect(() => {
    if (data?.isPlaying && data.albumImageUrl) {
      // Only update if it's a different track
      if (data.albumImageUrl !== previousTrackRef.current) {
        setIsTransitioning(true);
        previousTrackRef.current = data.albumImageUrl;

        setImgSrc(data.albumImageUrl);

        // Randomize gradient on song change
        const types = ['linear', 'radial', 'conic'];
        const directions = [
          'to top',
          'to bottom',
          'to left',
          'to right',
          'to top right',
          'to top left',
          'to bottom right',
          'to bottom left',
        ];

        setGradientType(types[Math.floor(Math.random() * types.length)]);
        setGradientDirection(directions[Math.floor(Math.random() * directions.length)]);

        // End transition after 2 seconds
        setTimeout(() => setIsTransitioning(false), 2000);
      }
    }
  }, [data?.albumImageUrl]);

  // Helper functions for color manipulation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  };

  const adjustBrightness = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const adjust = (val: number) => Math.min(255, Math.max(0, val + (val * percent / 100)));

    const r = Math.round(adjust(rgb.r)).toString(16).padStart(2, '0');
    const g = Math.round(adjust(rgb.g)).toString(16).padStart(2, '0');
    const b = Math.round(adjust(rgb.b)).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
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

  // Generate color variants (lighter and darker)
  const colorPalette = useMemo(() => {
    if (!colors || colors.length < 3) {
      return {
        color1: '#0f172a',
        color2: '#1e293b',
        color3: '#334155',
        primary: '#06b6d4',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        textPrimary: '#ffffff',
        textSecondary: '#d1d5db',
        border: '#374151',
      };
    }

    const color1 = adjustBrightness(colors[0] as string, -30); // Darker
    const color2 = colors[1] as string; // Original
    const color3 = adjustBrightness(colors[2] as string, 20); // Lighter

    // Determine text colors based on luminance
    const primaryLuminance = getLuminance(color2);
    const textPrimary = primaryLuminance > 0.5 ? '#000000' : '#ffffff';
    const textSecondary = primaryLuminance > 0.5 ? '#374151' : '#d1d5db';

    return {
      color1,
      color2,
      color3,
      primary: color2,
      secondary: color3,
      accent: adjustBrightness(colors[3] as string || color2, 30),
      textPrimary,
      textSecondary,
      border: adjustBrightness(color2, primaryLuminance > 0.5 ? -20 : 20),
    };
  }, [colors]);

  // Update CSS variables when colors change
  useEffect(() => {
    const root = document.documentElement;

    if (data?.isPlaying && colorPalette) {
      setCurrentColors(colorPalette);

      // Set CSS variables on root for smooth transitions
      root.style.setProperty('--color-primary', colorPalette.primary);
      root.style.setProperty('--color-secondary', colorPalette.secondary);
      root.style.setProperty('--color-accent', colorPalette.accent);
      root.style.setProperty('--color-text-primary', colorPalette.textPrimary);
      root.style.setProperty('--color-text-secondary', colorPalette.textSecondary);
      root.style.setProperty('--color-border', colorPalette.border);
      root.style.setProperty('--color-bg-1', colorPalette.color1);
      root.style.setProperty('--color-bg-2', colorPalette.color2);
      root.style.setProperty('--color-bg-3', colorPalette.color3);
    } else {
      // Reset to default when not playing
      root.style.setProperty('--color-primary', '#06b6d4');
      root.style.setProperty('--color-secondary', '#8b5cf6');
      root.style.setProperty('--color-accent', '#ec4899');
      root.style.setProperty('--color-text-primary', '#ffffff');
      root.style.setProperty('--color-text-secondary', '#d1d5db');
      root.style.setProperty('--color-border', '#374151');
      root.style.setProperty('--color-bg-1', '#0f172a');
      root.style.setProperty('--color-bg-2', '#1e293b');
      root.style.setProperty('--color-bg-3', '#334155');
    }
  }, [colorPalette, data?.isPlaying]);

  // Audio-driven animation parameters
  const animationParams = useMemo(() => {
    const audioFeatures = data?.audioFeatures;

    if (!audioFeatures) {
      return {
        duration: 8, // Default slow pulse
        intensity: 0.3,
        shift: 20,
      };
    }

    return {
      duration: (60 / audioFeatures.tempo) * 4, // Slower than tempo for ambient feel
      intensity: audioFeatures.energy, // 0-1 scale
      shift: audioFeatures.danceability * 30, // 0-30% movement
    };
  }, [data?.audioFeatures]);

  // Build gradient string
  const gradientStyle = useMemo(() => {
    const { color1, color2, color3 } = colorPalette;

    if (gradientType === 'radial') {
      return `radial-gradient(circle at 50% 50%, ${color1}, ${color2}, ${color3})`;
    } else if (gradientType === 'conic') {
      return `conic-gradient(from 0deg at 50% 50%, ${color1}, ${color2}, ${color3}, ${color1})`;
    } else {
      return `linear-gradient(${gradientDirection}, ${color1}, ${color2}, ${color3})`;
    }
  }, [colorPalette, gradientType, gradientDirection]);

  return (
    <div className="fixed inset-0 -z-10">
      <AnimatePresence mode="wait">
        {data?.isPlaying ? (
          // Animated gradient background when playing
          <motion.div
            key={`gradient-${previousTrackRef.current}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            {/* Animated gradient layer */}
            <motion.div
              className="absolute inset-0"
              style={{
                backgroundImage: gradientStyle,
                backgroundSize: '200% 200%',
              }}
              animate={{
                backgroundPosition: [
                  '0% 0%',
                  `${animationParams.shift}% ${animationParams.shift}%`,
                  '0% 0%',
                ],
              }}
              transition={{
                duration: animationParams.duration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Semi-transparent overlay for readability */}
            <div className="absolute inset-0 bg-black/50" />
          </motion.div>
        ) : (
          // Video background when not playing
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0"
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/video/not-playing.mov" type="video/mp4" />
            </video>

            {/* Overlay for video background */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicBackground;
