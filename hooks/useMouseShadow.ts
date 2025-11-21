import { useEffect, RefObject, useState } from 'react';

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
  } = options;

  // Track if element is mounted to trigger effect
  const [isMounted, setIsMounted] = useState(false);

  // Check if element exists on every render
  useEffect(() => {
    if (ref.current && !isMounted) {
      setIsMounted(true);
    }
  });

  useEffect(() => {
    if (!enabled || !isMounted) return;

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

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      // Normalize values between -1 and 1
      const normalizedX = x / (rect.width / 2);
      const normalizedY = y / (rect.height / 2);

      // Calculate shadow offset (inverted for realistic effect)
      const shadowX = -normalizedX * intensity;
      const shadowY = -normalizedY * intensity;

      // Create layered shadow with offset based on mouse position
      element.style.boxShadow = `
        ${5 + shadowX}px ${5 + shadowY}px 0 0 color-mix(in srgb, ${shadowColor} 40%, transparent),
        ${10 + shadowX * 1.5}px ${10 + shadowY * 1.5}px 0 0 color-mix(in srgb, ${shadowColor} 30%, transparent),
        ${15 + shadowX * 2}px ${15 + shadowY * 2}px 0 0 color-mix(in srgb, ${shadowColor} 20%, transparent),
        ${20 + shadowX * 2.5}px ${20 + shadowY * 2.5}px 0 0 color-mix(in srgb, ${shadowColor} 10%, transparent),
        ${25 + shadowX * 3}px ${25 + shadowY * 3}px 0 0 color-mix(in srgb, ${shadowColor} 5%, transparent)
      `;
    };

    const handleMouseLeave = () => {
      // Re-enable transition for smooth exit
      element.style.transition = 'all 0.4s ease-out';
      element.style.boxShadow = 'none';
      // Reset transition after animation completes
      setTimeout(() => {
        element.style.transition = 'color 2s ease-in-out, background-color 2s ease-in-out, border-color 2s ease-in-out, fill 2s ease-in-out, stroke 2s ease-in-out';
      }, 400);
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearInterval(colorUpdateInterval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [colorVar, intensity, enabled, isMounted]);
}