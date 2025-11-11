'use client';
import { useEffect, useRef } from 'react';

interface RetroPixelatedProps {
  bpm?: number;
  energy?: number;
  danceability?: number;
  isPlaying: boolean;
}

export default function RetroPixelated({
  bpm = 120,
  energy = 0.5,
  danceability = 0.5,
  isPlaying
}: RetroPixelatedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const barsRef = useRef<Array<{ height: number; targetHeight: number; velocity: number }>>([]);

  const NUM_BARS = 32; // Fewer bars for more pixelated, chunky look
  const BAR_WIDTH = 40; // Much wider bars
  const BAR_GAP = 8; // Larger gaps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Full screen, slightly oversized
    const resizeCanvas = () => {
      canvas.width = window.innerWidth * 1.2;
      canvas.height = window.innerHeight * 1.2;
      canvas.style.left = '-10%';
      canvas.style.top = '-10%';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize bars
    if (barsRef.current.length === 0) {
      barsRef.current = Array.from({ length: NUM_BARS }, () => ({
        height: 0,
        targetHeight: 0,
        velocity: 0,
      }));
    }

    // Generate mock frequency data based on audio features
    const generateFrequencyData = () => {
      const beatDuration = (60 / bpm) * 1000;
      const time = Date.now();
      const beatProgress = (time % beatDuration) / beatDuration;

      return barsRef.current.map((bar, i) => {
        const normalizedIndex = i / NUM_BARS;

        // Different frequency ranges
        const isLowFreq = i < NUM_BARS * 0.25;
        const isMidFreq = i >= NUM_BARS * 0.25 && i < NUM_BARS * 0.7;
        const isHighFreq = i >= NUM_BARS * 0.7;

        let amplitude = 0;

        if (isLowFreq) {
          // Bass hits hard on the beat
          amplitude = Math.sin(beatProgress * Math.PI * 2) * energy * 1.5;
        } else if (isMidFreq) {
          // Mids follow danceability
          amplitude = Math.sin((normalizedIndex * 6 + beatProgress) * Math.PI * 2) * danceability * 1.2;
        } else {
          // Highs are more sporadic
          amplitude = Math.sin((normalizedIndex * 12 + beatProgress * 3) * Math.PI * 2) * 0.4;
        }

        // Add some randomness
        amplitude += (Math.random() - 0.5) * 0.15;

        // Scale to canvas height
        const maxHeight = canvas.height * 0.8;
        return Math.max(0, Math.min(1, amplitude + 0.15)) * maxHeight;
      });
    };

    const animate = () => {
      // Clear with slight fade for retro CRT persistence
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        // Generate new frequency data
        const frequencyData = generateFrequencyData();

        // Update bars with spring physics
        barsRef.current.forEach((bar, i) => {
          bar.targetHeight = frequencyData[i];

          const spring = 0.15;
          const damping = 0.75;

          const force = (bar.targetHeight - bar.height) * spring;
          bar.velocity += force;
          bar.velocity *= damping;
          bar.height += bar.velocity;
        });

        // Get colors
        const primaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-primary') || '#06b6d4';
        const secondaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-secondary') || '#8b5cf6';
        const accentColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-accent') || '#ec4899';

        const totalWidth = NUM_BARS * (BAR_WIDTH + BAR_GAP);
        const startX = (canvas.width - totalWidth) / 2;
        const centerY = canvas.height / 2;

        // Draw chunky pixelated bars
        barsRef.current.forEach((bar, i) => {
          const x = startX + i * (BAR_WIDTH + BAR_GAP);
          const height = bar.height;

          // Frequency-based coloring
          const isLowFreq = i < NUM_BARS * 0.25;
          const isMidFreq = i >= NUM_BARS * 0.25 && i < NUM_BARS * 0.7;

          let color = accentColor;
          if (isLowFreq) color = primaryColor;
          else if (isMidFreq) color = secondaryColor;

          // Draw bar (centered vertically)
          const barY = centerY - height / 2;

          // Main bar with pixelated effect
          ctx.fillStyle = color;
          ctx.fillRect(x, barY, BAR_WIDTH, height);

          // Add darker outline for pixelated look
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, barY, BAR_WIDTH, height);

          // Add highlight on top edge for 3D effect
          if (height > 20) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x, barY, BAR_WIDTH, 4);
          }

          // Add shadow on bottom for depth
          if (height > 20) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(x, barY + height - 4, BAR_WIDTH, 4);
          }

          // Glow effect on tall bars
          if (height > canvas.height * 0.5) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = color;
            ctx.fillStyle = color + 'AA';
            ctx.fillRect(x, barY, BAR_WIDTH, height);
            ctx.shadowBlur = 0;
          }

          // Draw pixelated segments within bar
          const segments = Math.floor(height / 20);
          for (let s = 0; s < segments; s++) {
            const segY = barY + s * 20;
            if (s % 2 === 0) {
              ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
              ctx.fillRect(x, segY, BAR_WIDTH, 2);
            }
          }
        });

        // Add retro scanlines
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = primaryColor;
        for (let y = 0; y < canvas.height; y += 6) {
          ctx.fillRect(0, y, canvas.width, 2);
        }
        ctx.globalAlpha = 1;

        // Add vertical grid lines for retro aesthetic
        ctx.strokeStyle = primaryColor + '11';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 100) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        // Add horizontal centerline
        ctx.strokeStyle = primaryColor + '33';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();

      } else {
        // Fade out when not playing
        barsRef.current.forEach(bar => {
          bar.height *= 0.92;
          bar.targetHeight = 0;
          bar.velocity *= 0.9;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [bpm, energy, danceability, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed pointer-events-none"
      style={{
        mixBlendMode: 'screen',
        opacity: isPlaying ? 0.7 : 0,
        transition: 'opacity 1s ease',
        imageRendering: 'pixelated', // Force pixelated rendering
      }}
    />
  );
}
