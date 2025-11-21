'use client';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useAmbientTheme } from '@/components/ColorThemeProvider';

interface AmbientLayerProps {
  variant?: 1 | 2 | 3 | 4 | 5 | 6;
}

export default function AmbientLayer({ variant: variantProp }: AmbientLayerProps) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  // Get variant and isPlaying from context
  const { variant: contextVariant, isPlaying } = useAmbientTheme();

  // Use prop variant if provided, otherwise use context variant
  const variant = variantProp ?? contextVariant;

  if (!isPlaying) return null;

  // Variant 1: Gradient Vignette with Blur
  // Radial gradient that's darker at the edges, lighter in center
  const variant1 = (
    <motion.div
      className="h-screen w-screen fixed top-0 left-0 duration-300 transition-all pointer-events-none z-[-5]"
      style={{
        background: isHomePage
          ? `radial-gradient(ellipse at center, transparent 0%, var(--color-6)/60 100%)`
          : `radial-gradient(ellipse at center, transparent 0%, var(--color-3)/70 100%)`,
        backdropFilter: isHomePage ? 'blur(8px)' : 'blur(24px)',
      }}
    />
  );

  // Variant 2: Frosted Glass Overlay
  // Blur + saturate with multiply blend mode for depth
  const variant2 = (
    <motion.div
      className="h-screen w-screen fixed top-0 left-0 duration-300 transition-all pointer-events-none z-[-5]"
      style={{
        backgroundColor: isHomePage ? 'var(--color-6)/40' : 'var(--color-3)/50',
        backdropFilter: isHomePage ? 'blur(12px) saturate(1.3)' : 'blur(32px) saturate(1.5)',
        mixBlendMode: 'multiply',
      }}
    />
  );

  // Variant 3: Noise Texture + Blur
  // Cinematic film grain effect with subtle blur
  const variant3 = (
    <motion.div
      className="h-screen w-screen fixed top-0 left-0 duration-300 transition-all pointer-events-none z-[-5]"
      style={{
        backgroundColor: isHomePage ? 'var(--color-6)/30' : 'var(--color-3)/40',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E")`,
        backdropFilter: isHomePage ? 'blur(6px)' : 'blur(20px)',
      }}
    />
  );

  // Variant 4: Dual-Tone Gradient
  // Different gradient intensities for homepage vs other pages
  const variant4 = (
    <motion.div
      className="h-screen w-screen fixed top-0 left-0 duration-300 transition-all pointer-events-none z-[-5]"
      style={{
        background: isHomePage
          ? `linear-gradient(135deg, var(--color-6)/20 0%, transparent 50%, var(--color-accent)/20 100%)`
          : `linear-gradient(135deg, var(--color-3)/40 0%, var(--color-primary)/30 50%, var(--color-accent)/40 100%)`,
        backdropFilter: isHomePage ? 'blur(10px)' : 'blur(28px)',
      }}
    />
  );

  // Variant 5: Layered Blur (Three separate layers)
  // Multiple layers with blur, color tint, and dot pattern
  const variant5 = (
    <div className="h-screen w-screen fixed top-0 left-0 duration-300 transition-all pointer-events-none z-[-5]">
      {/* Layer 1: Base blur */}
      <motion.div
        className="absolute inset-0"
        style={{
          backdropFilter: isHomePage ? 'blur(5px)' : 'blur(15px)',
        }}
      />
      {/* Layer 2: Color tint */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundColor: isHomePage ? 'var(--color-6)/25' : 'var(--color-3)/35',
          mixBlendMode: 'soft-light',
        }}
      />
      {/* Layer 3: Dot pattern */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: isHomePage
            ? `radial-gradient(transparent 1px, var(--color-6) 1px)`
            : `radial-gradient(transparent 1px, var(--color-3) 1px)`,
          backgroundSize: '4px 4px',
          opacity: 0.3,
        }}
      />
    </div>
  );

  // Variant 6: Minimal Overlay
  // Simple dark overlay with very subtle blur
  const variant6 = (
    <motion.div
      className="h-screen w-screen fixed top-0 left-0 duration-300 transition-all pointer-events-none z-[-5]"
      style={{
        backgroundColor: isHomePage ? 'var(--color-6)/15' : 'var(--color-3)/25',
        backdropFilter: isHomePage ? 'blur(3px)' : 'blur(12px)',
      }}
    />
  );

  // Return the selected variant
  const variants = {
    1: variant1,
    2: variant2,
    3: variant3,
    4: variant4,
    5: variant5,
    6: variant6,
  };

  return variants[variant];
}
