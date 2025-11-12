'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useVisualizer } from '@/contexts/VisualizerContext';

interface PageTransitionProps {
  children: ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const { activeVisualizer, bpm, energy } = useVisualizer();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [transitionKey, setTransitionKey] = useState(0);

  // Trigger transition overlay on route change
  useEffect(() => {
    // Hide content immediately on route change
    setShowContent(false);
    setIsTransitioning(true);
    setTransitionKey(prev => prev + 1);

    // Show content after transition completes
    const showTimer = setTimeout(() => {
      setShowContent(true);
    }, 1200);

    // Hide transition overlay
    const hideTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, 1400);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [pathname]);

  return (
    <>
      {/* Transition Overlay - Shows during route changes */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key={transitionKey}
            className="fixed inset-0 z-[100] pointer-events-none bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <TransitionOverlay visualizer={activeVisualizer} bpm={bpm} energy={energy} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content */}
      <AnimatePresence mode="wait">
        {showContent && (
          <motion.div
            key={pathname}
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.5 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Separate transition overlay component that animates on route changes
function TransitionOverlay({ visualizer, bpm, energy }: { visualizer: string; bpm: number; energy: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;
    let progress = 0;

    const animate = () => {
      progress += 0.015; // Slowed down from 0.03 to 0.015
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Visualizer-specific animations
      switch (visualizer) {
        case 'retro':
          renderRetroTransition(ctx, canvas, progress);
          break;
        case 'waveform':
          renderWaveformTransition(ctx, canvas, progress, bpm);
          break;
        case 'radar':
          renderRadarTransition(ctx, canvas, progress);
          break;
        case 'matrix':
          renderMatrixTransition(ctx, canvas, progress);
          break;
        case 'tunnel':
          renderTunnelTransition(ctx, canvas, progress);
          break;
        case 'orbs':
          renderOrbsTransition(ctx, canvas, progress, energy);
          break;
      }

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [visualizer, bpm, energy]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
    />
  );
}

// Helper to get current CSS variable color
function getCSSColor(variable: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variable) || '#8b5cf6';
}

// Retro: Simple pixelated wipe
function renderRetroTransition(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number) {
  const blockSize = 40;
  const primary = getCSSColor('--color-primary');

  // Simple left-to-right wipe with blocks
  const wipeX = canvas.width * progress;

  for (let y = 0; y < canvas.height; y += blockSize) {
    for (let x = 0; x < wipeX; x += blockSize) {
      const dist = Math.abs(x - wipeX);
      const alpha = Math.max(0, 0.6 - (dist / 200));

      ctx.fillStyle = primary.startsWith('#')
        ? `${primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
        : primary;
      ctx.fillRect(x, y, blockSize - 4, blockSize - 4);
    }
  }
}

// Waveform: Simple sine wave sweep
function renderWaveformTransition(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number, bpm: number) {
  const accent = getCSSColor('--color-accent');

  ctx.beginPath();
  ctx.strokeStyle = accent.startsWith('#')
    ? `${accent}${Math.floor((1 - progress) * 180).toString(16).padStart(2, '0')}`
    : accent;
  ctx.lineWidth = 6;

  for (let x = 0; x < canvas.width; x += 4) {
    const y = canvas.height / 2 + Math.sin(x * 0.02 + progress * 8) * 60;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// Radar: Simple expanding circle
function renderRadarTransition(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number) {
  const secondary = getCSSColor('--color-secondary');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const maxRadius = Math.max(canvas.width, canvas.height);
  const radius = maxRadius * progress;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = secondary.startsWith('#')
    ? `${secondary}${Math.floor((1 - progress) * 180).toString(16).padStart(2, '0')}`
    : secondary;
  ctx.lineWidth = 4;
  ctx.stroke();
}

// Matrix: Simplified vertical lines
function renderMatrixTransition(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number) {
  const primary = getCSSColor('--color-primary');
  const spacing = 30;

  for (let x = 0; x < canvas.width; x += spacing) {
    const height = canvas.height * progress + Math.sin(x * 0.1) * 100;
    ctx.strokeStyle = primary.startsWith('#')
      ? `${primary}${Math.floor((1 - progress) * 180).toString(16).padStart(2, '0')}`
      : primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

// Tunnel: Simple zoom effect
function renderTunnelTransition(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number) {
  const accent = getCSSColor('--color-accent');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Draw expanding rectangles
  for (let i = 0; i < 5; i++) {
    const scale = (1 + progress * 2) - i * 0.3;
    const size = 200 * scale;

    ctx.strokeStyle = accent.startsWith('#')
      ? `${accent}${Math.floor((1 - progress) * 150).toString(16).padStart(2, '0')}`
      : accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(centerX - size/2, centerY - size/2, size, size);
  }
}

// Orbs: Simple radial burst
function renderOrbsTransition(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, progress: number, energy: number) {
  const secondary = getCSSColor('--color-secondary');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const orbCount = 12;

  for (let i = 0; i < orbCount; i++) {
    const angle = (i / orbCount) * Math.PI * 2;
    const distance = progress * 400;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    const radius = 20 * (1 - progress);

    if (radius > 0) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = secondary.startsWith('#')
        ? `${secondary}${Math.floor((1 - progress) * 200).toString(16).padStart(2, '0')}`
        : secondary;
      ctx.fill();
    }
  }
}
