'use client';
import { useRef, useLayoutEffect, ReactNode } from 'react';
import { gsap } from '@/lib/gsap';

interface ScrollRevealProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale';
  delay?: number;
  duration?: number;
  scrub?: boolean;
  className?: string;
}

export default function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 1,
  scrub = false,
  className = '',
}: ScrollRevealProps) {
  const elementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;

    // Define initial and final states based on direction
    let fromVars: gsap.TweenVars = { opacity: 0 };
    let toVars: gsap.TweenVars = { opacity: 1 };

    switch (direction) {
      case 'up':
        fromVars = { opacity: 0, y: 100 };
        toVars = { opacity: 1, y: 0 };
        break;
      case 'down':
        fromVars = { opacity: 0, y: -100 };
        toVars = { opacity: 1, y: 0 };
        break;
      case 'left':
        fromVars = { opacity: 0, x: 100 };
        toVars = { opacity: 1, x: 0 };
        break;
      case 'right':
        fromVars = { opacity: 0, x: -100 };
        toVars = { opacity: 1, x: 0 };
        break;
      case 'scale':
        fromVars = { opacity: 0, scale: 0.8 };
        toVars = { opacity: 1, scale: 1 };
        break;
      case 'fade':
        fromVars = { opacity: 0 };
        toVars = { opacity: 1 };
        break;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        element,
        fromVars,
        {
          ...toVars,
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 85%',
            end: scrub ? 'top 20%' : undefined,
            scrub: scrub ? 1 : false,
            toggleActions: scrub ? undefined : 'play none none reverse',
          },
        }
      );
    });

    return () => ctx.revert();
  }, [direction, delay, duration, scrub]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}
