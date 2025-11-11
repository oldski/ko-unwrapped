'use client';
import { useEffect, useRef } from 'react';

interface RadarCircularProps {
  bpm?: number;
  energy?: number;
  danceability?: number;
  isPlaying: boolean;
}

export default function RadarCircular({
  bpm = 120,
  energy = 0.5,
  danceability = 0.5,
  isPlaying
}: RadarCircularProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const rotationRef = useRef(0);
  const barsRef = useRef<number[]>([]);

  const NUM_BARS = 128; // More bars for dense, artistic look

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Oversized canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth * 1.3;
      canvas.height = window.innerHeight * 1.3;
      canvas.style.left = '-15%';
      canvas.style.top = '-15%';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize bars
    if (barsRef.current.length === 0) {
      barsRef.current = Array(NUM_BARS).fill(0);
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) * 0.6;

        rotationRef.current += (bpm / 120) * 0.01;

        const time = Date.now() / 1000;
        const beatDuration = 60 / bpm;
        const beatProgress = (time % beatDuration) / beatDuration;

        // Get colors
        const primaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-primary') || '#06b6d4';
        const secondaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-secondary') || '#8b5cf6';
        const accentColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-accent') || '#ec4899';

        // Update bars with wave patterns
        barsRef.current = barsRef.current.map((_, i) => {
          const angle = (i / NUM_BARS) * Math.PI * 2;

          // Multiple wave frequencies for complexity
          let amplitude = 0;
          amplitude += Math.sin(angle * 3 + time * 2) * energy;
          amplitude += Math.sin(angle * 7 + time * 3) * danceability * 0.5;
          amplitude += Math.sin(beatProgress * Math.PI * 2) * 0.3;

          // Add randomness for organic feel
          amplitude += (Math.random() - 0.5) * 0.1;

          return Math.max(0, Math.min(1, amplitude + 0.2));
        });

        // Draw concentric circles (radar grid)
        ctx.strokeStyle = primaryColor + '22';
        ctx.lineWidth = 2;
        for (let r = 0; r < maxRadius; r += maxRadius / 8) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw radial lines (radar spokes)
        for (let i = 0; i < NUM_BARS; i += 8) {
          const angle = (i / NUM_BARS) * Math.PI * 2 + rotationRef.current;
          const x2 = centerX + Math.cos(angle) * maxRadius;
          const y2 = centerY + Math.sin(angle) * maxRadius;

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = primaryColor + '11';
          ctx.stroke();
        }

        // Draw bars radiating outward
        barsRef.current.forEach((amplitude, i) => {
          const angle = (i / NUM_BARS) * Math.PI * 2 + rotationRef.current;
          const innerRadius = maxRadius * 0.15;
          const barHeight = amplitude * maxRadius * 0.7;

          const x1 = centerX + Math.cos(angle) * innerRadius;
          const y1 = centerY + Math.sin(angle) * innerRadius;
          const x2 = centerX + Math.cos(angle) * (innerRadius + barHeight);
          const y2 = centerY + Math.sin(angle) * (innerRadius + barHeight);

          // Color based on amplitude and position
          let color = primaryColor;
          if (amplitude > 0.7) color = accentColor;
          else if (amplitude > 0.4) color = secondaryColor;

          // Draw bar
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.lineWidth = 4;
          ctx.strokeStyle = color;
          ctx.shadowBlur = 15;
          ctx.shadowColor = color;
          ctx.stroke();

          // Draw glow cap
          ctx.beginPath();
          ctx.arc(x2, y2, 3, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.shadowBlur = 20;
          ctx.fill();
        });

        // Draw rotating sweeper (radar arm)
        const sweeperAngle = rotationRef.current * 4;
        const gradient = ctx.createLinearGradient(
          centerX,
          centerY,
          centerX + Math.cos(sweeperAngle) * maxRadius,
          centerY + Math.sin(sweeperAngle) * maxRadius
        );
        gradient.addColorStop(0, accentColor + 'AA');
        gradient.addColorStop(0.5, accentColor + '44');
        gradient.addColorStop(1, accentColor + '00');

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, maxRadius, sweeperAngle - 0.3, sweeperAngle + 0.3);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 30;
        ctx.shadowColor = accentColor;
        ctx.fill();

        // Center glow
        ctx.beginPath();
        ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
        const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
        centerGradient.addColorStop(0, accentColor);
        centerGradient.addColorStop(1, accentColor + '00');
        ctx.fillStyle = centerGradient;
        ctx.shadowBlur = 40;
        ctx.shadowColor = accentColor;
        ctx.fill();
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
        opacity: isPlaying ? 0.5 : 0,
        transition: 'opacity 1s ease',
      }}
    />
  );
}
