import { useEffect, RefObject, useState, useCallback } from 'react';

interface UseMouseShadowOptions {
  /**
   * CSS variable name for the shadow color (e.g., '--color-primary', '--color-bg-3')
   * @default '--color-primary'
   */
  colorVar?: string;

  /**
   * Intensity multiplier for shadow offset (higher = more dramatic effect)
   * @default 20
   */
  intensity?: number;

  /**
   * Enable/disable the effect
   * @default true
   */
  enabled?: boolean;

  /**
   * BPM for pulsing animation (beats per minute)
   * When provided, shadows will pulse at this rate
   * @default undefined (no pulsing)
   */
  bpm?: number;
}

/**
 * Custom hook for mouse-driven layered shadow effect
 *
 * Creates a dynamic parallax shadow that follows the mouse cursor,
 * giving cards a 3D floating effect.
 *
 * @example
 * ```tsx
 * const cardRef = useRef<HTMLDivElement>(null);
 * useMouseShadow(cardRef, { colorVar: '--color-vibrant', intensity: 15 });
 *
 * return <div ref={cardRef}>...</div>
 * ```
 */
export default function useMouseShadow<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseMouseShadowOptions = {}
) {
  const {
    colorVar = '--color-primary',
    intensity = 20,
    enabled = true,
    bpm,
  } = options;

  // Track if element is mounted to trigger effect
  const [isMounted, setIsMounted] = useState(false);
  // Track if mouse is actively hovering (to pause BPM animation)
  const [isMouseActive, setIsMouseActive] = useState(false);
  // Track if device supports hover (desktop vs mobile/tablet)
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Check if element exists on every render
  useEffect(() => {
    if (ref.current && !isMounted) {
      setIsMounted(true);
    }
  });

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(hover: none)').matches
      );
    };
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  // Helper to generate shadow string
  const generateShadow = useCallback((shadowX: number, shadowY: number, shadowColor: string, scale: number = 1) => {
    return `
      ${5 + shadowX}px ${5 + shadowY}px 0 0 color-mix(in srgb, ${shadowColor} ${40 * scale}%, transparent),
      ${10 + shadowX * 1.5}px ${10 + shadowY * 1.5}px 0 0 color-mix(in srgb, ${shadowColor} ${30 * scale}%, transparent),
      ${15 + shadowX * 2}px ${15 + shadowY * 2}px 0 0 color-mix(in srgb, ${shadowColor} ${20 * scale}%, transparent),
      ${20 + shadowX * 2.5}px ${20 + shadowY * 2.5}px 0 0 color-mix(in srgb, ${shadowColor} ${10 * scale}%, transparent),
      ${25 + shadowX * 3}px ${25 + shadowY * 3}px 0 0 color-mix(in srgb, ${shadowColor} ${5 * scale}%, transparent)
    `;
  }, []);

  // BPM-based pulsing animation effect
  useEffect(() => {
    if (!enabled || !isMounted || !bpm || isMouseActive) return;

    const element = ref.current;
    if (!element) return;

    const beatDuration = 60000 / bpm; // Duration of one beat in milliseconds
    let animationFrame: number;
    let startTime: number | null = null;

    // Get shadow color
    let shadowColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();

    // Update color periodically
    const colorUpdateInterval = setInterval(() => {
      shadowColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    }, 2000);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Create a smooth sine wave based on BPM
      // Complete one full cycle per beat
      const progress = (elapsed % beatDuration) / beatDuration;
      const pulse = Math.sin(progress * Math.PI * 2);

      // Offset varies between -intensity/3 and intensity/3
      const offsetRange = intensity / 3;
      const shadowX = pulse * offsetRange;
      const shadowY = pulse * offsetRange * 0.5; // Less vertical movement

      // Scale opacity between 0.6 and 1.0 for breathing effect
      const scale = 0.7 + (Math.sin(progress * Math.PI * 2) + 1) * 0.15;

      element.style.boxShadow = generateShadow(shadowX, shadowY, shadowColor, scale);

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(colorUpdateInterval);
    };
  }, [enabled, isMounted, bpm, isMouseActive, colorVar, intensity, generateShadow, ref]);

  // Mouse interaction effect (desktop only)
  useEffect(() => {
    if (!enabled || !isMounted || isTouchDevice) return;

    const element = ref.current;
    if (!element) return;

    // Disable the global box-shadow transition for instant updates
    element.style.transition = 'color 2s ease-in-out, background-color 2s ease-in-out, border-color 2s ease-in-out, fill 2s ease-in-out, stroke 2s ease-in-out';

    // Cache rect and update it occasionally instead of on every mousemove
    let rect = element.getBoundingClientRect();
    const updateRect = () => {
      rect = element.getBoundingClientRect();
    };
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    // Cache the color value and update it less frequently for performance
    let shadowColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();

    // Update color occasionally (when it might change due to song change)
    const colorUpdateInterval = setInterval(() => {
      shadowColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    }, 2000);

    const handleMouseEnter = () => {
      setIsMouseActive(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Normalize values between -1 and 1
      const normalizedX = x / (rect.width / 2);
      const normalizedY = y / (rect.height / 2);

      // Calculate shadow offset (inverted for realistic effect)
      const shadowX = -normalizedX * intensity;
      const shadowY = -normalizedY * intensity;

      element.style.boxShadow = generateShadow(shadowX, shadowY, shadowColor, 1);
    };

    const handleMouseLeave = () => {
      setIsMouseActive(false);
      // If no BPM pulsing, fade out shadow
      if (!bpm) {
        element.style.transition = 'all 0.4s ease-out';
        element.style.boxShadow = 'none';
        setTimeout(() => {
          element.style.transition = 'color 2s ease-in-out, background-color 2s ease-in-out, border-color 2s ease-in-out, fill 2s ease-in-out, stroke 2s ease-in-out';
        }, 400);
      }
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearInterval(colorUpdateInterval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [colorVar, intensity, enabled, isMounted, isTouchDevice, bpm, generateShadow, ref]);

  // Touch interaction effect (mobile/tablet)
  useEffect(() => {
    if (!enabled || !isMounted || !isTouchDevice) return;

    const element = ref.current;
    if (!element) return;

    let rect = element.getBoundingClientRect();
    const updateRect = () => {
      rect = element.getBoundingClientRect();
    };
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    let shadowColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    const colorUpdateInterval = setInterval(() => {
      shadowColor = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    }, 2000);

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;

      const touch = e.touches[0];
      const x = touch.clientX - rect.left - rect.width / 2;
      const y = touch.clientY - rect.top - rect.height / 2;

      const normalizedX = Math.max(-1, Math.min(1, x / (rect.width / 2)));
      const normalizedY = Math.max(-1, Math.min(1, y / (rect.height / 2)));

      const shadowX = -normalizedX * intensity;
      const shadowY = -normalizedY * intensity;

      setIsMouseActive(true);
      element.style.boxShadow = generateShadow(shadowX, shadowY, shadowColor, 1);
    };

    const handleTouchEnd = () => {
      setIsMouseActive(false);
    };

    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      clearInterval(colorUpdateInterval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [colorVar, intensity, enabled, isMounted, isTouchDevice, generateShadow, ref]);
}