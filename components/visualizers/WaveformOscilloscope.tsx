'use client';
import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';

interface WaveformOscilloscopeProps {
  bpm?: number;
  energy?: number;
  valence?: number;
  isPlaying: boolean;
}

export default function WaveformOscilloscope({
  bpm = 120,
  energy = 0.5,
  valence = 0.5,
  isPlaying
}: WaveformOscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);

  const NUM_POINTS = 200;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Oversized canvas for artistic effect
    const resizeCanvas = () => {
      canvas.width = window.innerWidth * 1.2;
      canvas.height = window.innerHeight * 1.2;
      canvas.style.left = '-10%';
      canvas.style.top = '-10%';
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        timeRef.current += 0.016; // ~60fps

        const beatDuration = 60 / bpm;
        const beatProgress = (timeRef.current % beatDuration) / beatDuration;

        // Get colors
        const primaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-primary') || '#06b6d4';
        const secondaryColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-secondary') || '#8b5cf6';
        const accentColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--color-accent') || '#ec4899';

        // Draw multiple overlapping waveforms for artistic depth
        const numWaves = 5;

        for (let wave = 0; wave < numWaves; wave++) {
          ctx.beginPath();

          const waveOffset = wave * 0.3;
          const amplitude = (canvas.height / 4) * energy * (1 + wave * 0.2);
          const frequency = 3 + wave * 0.5;
          const phase = timeRef.current * (1 + wave * 0.3);

          // Color varies per wave
          let color = primaryColor;
          if (wave % 3 === 1) color = secondaryColor;
          if (wave % 3 === 2) color = accentColor;

          // Alpha decreases for depth
          const alpha = 0.8 - (wave * 0.15);

          for (let i = 0; i <= NUM_POINTS; i++) {
            const x = (i / NUM_POINTS) * canvas.width;
            const normalizedX = i / NUM_POINTS;

            // Complex wave equation for artistic shape
            let y = canvas.height / 2;

            // Base sine wave
            y += Math.sin((normalizedX * frequency + phase) * Math.PI * 2) * amplitude;

            // Add harmonics for complexity
            y += Math.sin((normalizedX * frequency * 2 + phase * 1.5) * Math.PI * 2) * (amplitude * 0.3);
            y += Math.sin((normalizedX * frequency * 0.5 + phase * 0.7) * Math.PI * 2) * (amplitude * 0.5);

            // Pulse with beat
            const beatInfluence = Math.sin(beatProgress * Math.PI * 2) * amplitude * 0.3;
            y += beatInfluence;

            // Valence affects wave shape (happier = more chaotic)
            if (valence > 0.6) {
              y += Math.sin((normalizedX * 10 + phase * 2) * Math.PI) * (amplitude * 0.2 * valence);
            }

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          // Stroke style
          ctx.strokeStyle = color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = 3 + wave * 2;
          ctx.shadowBlur = 20 + wave * 10;
          ctx.shadowColor = color;
          ctx.stroke();
        }

        // Add CRT scanlines for retro effect
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = primaryColor;
        for (let y = 0; y < canvas.height; y += 4) {
          ctx.fillRect(0, y, canvas.width, 2);
        }

        // Add border glow
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 30;
        ctx.shadowColor = primaryColor;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
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
        opacity: isPlaying ? 0.6 : 0,
        transition: 'opacity 1s ease',
      }}
    />
  );
}
