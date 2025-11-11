'use client';
import { useEffect, useRef } from 'react';

interface SpectrumOrbsProps {
  bpm?: number;
  energy?: number;
  valence?: number;
  isPlaying: boolean;
}

interface Orb {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  baseSize: number;
  vx: number;
  vy: number;
  hue: number;
  frequency: number;
}

export default function SpectrumOrbs({
  bpm = 120,
  energy = 0.5,
  valence = 0.5,
  isPlaying
}: SpectrumOrbsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const orbsRef = useRef<Orb[]>([]);

  const NUM_ORBS = 12;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Oversized canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth * 1.4;
      canvas.height = window.innerHeight * 1.4;
      canvas.style.left = '-20%';
      canvas.style.top = '-20%';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize orbs
    if (orbsRef.current.length === 0) {
      orbsRef.current = Array.from({ length: NUM_ORBS }, (_, i) => {
        const baseSize = 80 + Math.random() * 200;
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          targetX: Math.random() * canvas.width,
          targetY: Math.random() * canvas.height,
          size: baseSize,
          baseSize,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          hue: (i / NUM_ORBS) * 360,
          frequency: 0.5 + Math.random() * 2,
        };
      });
    }

    const animate = () => {
      // Fade effect for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
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

        const colors = [primaryColor, secondaryColor, accentColor];

        orbsRef.current.forEach((orb, index) => {
          // Update target position slowly
          if (Math.random() > 0.99) {
            orb.targetX = Math.random() * canvas.width;
            orb.targetY = Math.random() * canvas.height;
          }

          // Move towards target with easing
          const dx = orb.targetX - orb.x;
          const dy = orb.targetY - orb.y;
          orb.vx += dx * 0.001;
          orb.vy += dy * 0.001;

          // Add damping
          orb.vx *= 0.95;
          orb.vy *= 0.95;

          orb.x += orb.vx;
          orb.y += orb.vy;

          // Wrap around screen
          if (orb.x < -200) orb.x = canvas.width + 200;
          if (orb.x > canvas.width + 200) orb.x = -200;
          if (orb.y < -200) orb.y = canvas.height + 200;
          if (orb.y > canvas.height + 200) orb.y = -200;

          // Size pulses with frequency and beat
          const freqPulse = Math.sin(time * orb.frequency * Math.PI) * 0.3 + 1;
          const beatPulse = Math.sin(beatProgress * Math.PI * 2) * 0.2 + 1;
          orb.size = orb.baseSize * freqPulse * beatPulse * (1 + energy * 0.5);

          // Select color
          const color = colors[index % colors.length];

          // Draw large glowing orb
          const gradient = ctx.createRadialGradient(
            orb.x, orb.y, 0,
            orb.x, orb.y, orb.size
          );

          gradient.addColorStop(0, color + 'FF');
          gradient.addColorStop(0.3, color + 'CC');
          gradient.addColorStop(0.6, color + '66');
          gradient.addColorStop(1, color + '00');

          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.shadowBlur = 60;
          ctx.shadowColor = color;
          ctx.fill();

          // Draw core
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.size * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.shadowBlur = 40;
          ctx.fill();

          // Draw connecting lines between nearby orbs
          orbsRef.current.forEach((otherOrb, otherIndex) => {
            if (otherIndex <= index) return;

            const dist = Math.hypot(orb.x - otherOrb.x, orb.y - otherOrb.y);
            const maxDist = 400;

            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * 0.3;

              ctx.beginPath();
              ctx.moveTo(orb.x, orb.y);
              ctx.lineTo(otherOrb.x, otherOrb.y);
              ctx.strokeStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
              ctx.lineWidth = 2;
              ctx.shadowBlur = 10;
              ctx.shadowColor = color;
              ctx.stroke();
            }
          });

          // Draw orbital rings
          if (beatProgress > 0.9 || beatProgress < 0.1) {
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.size * 1.5, 0, Math.PI * 2);
            ctx.strokeStyle = color + '44';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
            ctx.stroke();
          }
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
  }, [bpm, energy, valence, isPlaying]);

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
