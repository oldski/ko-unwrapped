'use client';
import { useRef, ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ParallaxHeroProps {
  children: ReactNode;
  className?: string;
  speed?: number; // Parallax speed multiplier (0-1)
}

export default function ParallaxHero({
  children,
  className = '',
  speed = 0.5,
}: ParallaxHeroProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  // Parallax effect - moves at a fraction of scroll speed
  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.5, 0]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        style={{ y, opacity }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
