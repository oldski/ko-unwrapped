'use client';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StaggerListProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale';
}

export default function StaggerList({
  children,
  className = '',
  staggerDelay = 0.1,
  direction = 'up',
}: StaggerListProps) {
  // Define animation variants based on direction
  const getVariants = () => {
    const hidden: any = { opacity: 0 };
    const visible: any = { opacity: 1 };

    switch (direction) {
      case 'up':
        hidden.y = 50;
        visible.y = 0;
        break;
      case 'down':
        hidden.y = -50;
        visible.y = 0;
        break;
      case 'left':
        hidden.x = 50;
        visible.x = 0;
        break;
      case 'right':
        hidden.x = -50;
        visible.x = 0;
        break;
      case 'scale':
        hidden.scale = 0.8;
        visible.scale = 1;
        break;
      case 'fade':
        // Already have opacity
        break;
    }

    return {
      hidden,
      visible,
    };
  };

  const variants = getVariants();

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: variants.hidden,
    visible: {
      ...variants.visible,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={item}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
