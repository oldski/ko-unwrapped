'use client';
import { useEffect, useRef } from 'react';

interface MatrixRainProps {
  bpm?: number;
  energy?: number;
  isPlaying: boolean;
}

interface Drop {
  x: number;
  y: number;
  speed: number;
  length: number;
  chars: string[];
}

export default function MatrixRain({
  bpm = 120,
  energy = 0.5,
  isPlaying
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const dropsRef = useRef<Drop[]>([]);

  // Safe ASCII symbols and geometric shapes
  const SYMBOLS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%^&*()_+-=[]{}|;:,.<>?/~`';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Oversized canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth * 1.2;
      canvas.height = window.innerHeight * 1.4;
      canvas.style.left = '-10%';
      canvas.style.top = '-20%';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const fontSize = 20;
    const columns = Math.floor(canvas.width / fontSize);

    // Initialize drops
    if (dropsRef.current.length === 0) {
      dropsRef.current = Array.from({ length: columns }, (_, i) => ({
        x: i * fontSize,
        y: Math.random() * -canvas.height,
        speed: 2 + Math.random() * 8,
        length: 10 + Math.floor(Math.random() * 30),
        chars: Array.from({ length: 40 }, () =>
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        ),
      }));
    }

    const animate = () => {
      // Fade effect for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        // Get colors
        const primaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-primary') || '#06b6d4';
        const secondaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-secondary') || '#8b5cf6';
        const accentColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-accent') || '#ec4899';

        // Speed multiplier based on BPM and energy
        const speedMultiplier = (bpm / 120) * (0.5 + energy);

        dropsRef.current.forEach((drop, index) => {
          // Update drop position
          drop.y += drop.speed * speedMultiplier;

          // Reset if off screen
          if (drop.y > canvas.height + fontSize * drop.length) {
            drop.y = Math.random() * -200;
            drop.speed = 2 + Math.random() * 8 * (1 + energy);
            drop.length = 10 + Math.floor(Math.random() * 30);
          }

          // Randomly change characters for dynamic effect
          if (Math.random() > 0.95) {
            const charIndex = Math.floor(Math.random() * drop.chars.length);
            drop.chars[charIndex] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          }

          // Draw trail
          for (let i = 0; i < drop.length; i++) {
            const y = drop.y - i * fontSize;

            if (y < 0 || y > canvas.height) continue;

            // Color gradient along the trail
            let color;
            const position = i / drop.length;

            if (position < 0.2) {
              color = accentColor; // Bright head
            } else if (position < 0.5) {
              color = primaryColor;
            } else {
              color = secondaryColor;
            }

            // Alpha decreases toward tail
            const alpha = Math.pow(1 - position, 2);

            ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.shadowBlur = i === 0 ? 20 : 0;
            ctx.shadowColor = i === 0 ? accentColor : 'transparent';

            // Draw character
            ctx.font = `bold ${fontSize}px monospace`;
            ctx.textAlign = 'center';

            const charIndex = Math.floor((y / fontSize + index) % drop.chars.length);
            ctx.fillText(drop.chars[charIndex], drop.x + fontSize / 2, y);
          }
        });

        // Add horizontal glitch lines occasionally
        if (Math.random() > 0.97) {
          const y = Math.random() * canvas.height;
          ctx.fillStyle = primaryColor + '22';
          ctx.fillRect(0, y, canvas.width, 2);
        }
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
  }, [bpm, energy, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed pointer-events-none"
      style={{
        mixBlendMode: 'screen',
        opacity: isPlaying ? 0.7 : 0,
        transition: 'opacity 1s ease',
      }}
    />
  );
}
