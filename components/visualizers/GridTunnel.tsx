'use client';
import { useEffect, useRef } from 'react';

interface GridTunnelProps {
  bpm?: number;
  energy?: number;
  danceability?: number;
  isPlaying: boolean;
}

export default function GridTunnel({
  bpm = 120,
  energy = 0.5,
  danceability = 0.5,
  isPlaying
}: GridTunnelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const zOffsetRef = useRef(0);
  const pulseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Oversized canvas for immersive tunnel effect
    const resizeCanvas = () => {
      canvas.width = window.innerWidth * 1.3;
      canvas.height = window.innerHeight * 1.3;
      canvas.style.left = '-15%';
      canvas.style.top = '-15%';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const gridSize = 50;
    const depth = 20;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Speed based on BPM and energy
        const speed = (bpm / 120) * energy * 0.5;
        zOffsetRef.current += speed;

        // Pulse based on beat
        const beatDuration = 60 / bpm;
        const time = Date.now() / 1000;
        const beatProgress = (time % beatDuration) / beatDuration;
        pulseRef.current = Math.sin(beatProgress * Math.PI * 2) * 0.3 + 1;

        // Get colors
        const primaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-primary') || '#06b6d4';
        const secondaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-secondary') || '#8b5cf6';
        const accentColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-accent') || '#ec4899';

        // Draw tunnel grid
        for (let z = 0; z < depth; z++) {
          const zPos = z - (zOffsetRef.current % 1);
          if (zPos <= 0) continue;

          const scale = 1 / zPos;
          const alpha = Math.min(1, (depth - z) / depth);

          // Size increases with danceability for more dynamic tunnel
          const tunnelSize = 300 + danceability * 200;

          // Draw horizontal lines
          for (let y = -10; y <= 10; y++) {
            const yPos = y * gridSize * scale * pulseRef.current;

            ctx.beginPath();
            ctx.moveTo(
              centerX - tunnelSize * scale,
              centerY + yPos
            );
            ctx.lineTo(
              centerX + tunnelSize * scale,
              centerY + yPos
            );

            // Color varies by depth
            let color = primaryColor;
            if (z % 3 === 1) color = secondaryColor;
            if (z % 3 === 2) color = accentColor;

            ctx.strokeStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = 2 * scale;
            ctx.shadowBlur = z < 5 ? 10 * scale : 0;
            ctx.shadowColor = color;
            ctx.stroke();
          }

          // Draw vertical lines
          for (let x = -10; x <= 10; x++) {
            const xPos = x * gridSize * scale * pulseRef.current;

            ctx.beginPath();
            ctx.moveTo(
              centerX + xPos,
              centerY - tunnelSize * scale
            );
            ctx.lineTo(
              centerX + xPos,
              centerY + tunnelSize * scale
            );

            let color = primaryColor;
            if (x % 3 === 1) color = secondaryColor;
            if (x % 3 === 2) color = accentColor;

            ctx.strokeStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = 2 * scale;
            ctx.shadowBlur = z < 5 ? 10 * scale : 0;
            ctx.shadowColor = color;
            ctx.stroke();
          }

          // Draw perspective lines from corners
          if (z % 2 === 0) {
            const corners = [
              [-tunnelSize * scale, -tunnelSize * scale],
              [tunnelSize * scale, -tunnelSize * scale],
              [-tunnelSize * scale, tunnelSize * scale],
              [tunnelSize * scale, tunnelSize * scale],
            ];

            corners.forEach(([x, y]) => {
              ctx.beginPath();
              ctx.moveTo(centerX, centerY);
              ctx.lineTo(centerX + x, centerY + y);
              ctx.strokeStyle = accentColor + '33';
              ctx.lineWidth = 1;
              ctx.stroke();
            });
          }
        }

        // Draw center vortex
        const vortexRadius = 50 * pulseRef.current;
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, vortexRadius
        );
        gradient.addColorStop(0, accentColor + 'FF');
        gradient.addColorStop(0.5, primaryColor + '88');
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(centerX, centerY, vortexRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 40;
        ctx.shadowColor = accentColor;
        ctx.fill();

        // Add scan lines for retro effect
        ctx.globalAlpha = 0.1;
        for (let y = 0; y < canvas.height; y += 8) {
          ctx.fillStyle = primaryColor;
          ctx.fillRect(0, y, canvas.width, 2);
        }
        ctx.globalAlpha = 1;
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
        opacity: isPlaying ? 0.6 : 0,
        transition: 'opacity 1s ease',
      }}
    />
  );
}
