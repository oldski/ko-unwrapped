'use client';
import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'grid' | 'heatmap' | 'stats';
  count?: number;
}

export default function SkeletonLoader({ variant = 'card', count = 1 }: SkeletonLoaderProps) {
  const shimmer = {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear' as const,
    },
  };

  const skeletonBase = 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%]';

  // Card variant (for track cards, artist cards, etc.)
  if (variant === 'card') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4">
              {/* Album art skeleton */}
              <motion.div
                className={`w-24 h-24 rounded-lg ${skeletonBase}`}
                animate={shimmer.animate}
                transition={shimmer.transition}
              />
              <div className="flex-1 space-y-3">
                {/* Title skeleton */}
                <motion.div
                  className={`h-6 rounded ${skeletonBase} w-3/4`}
                  animate={shimmer.animate}
                  transition={shimmer.transition}
                />
                {/* Artist skeleton */}
                <motion.div
                  className={`h-4 rounded ${skeletonBase} w-1/2`}
                  animate={shimmer.animate}
                  transition={shimmer.transition}
                />
                {/* Album skeleton */}
                <motion.div
                  className={`h-4 rounded ${skeletonBase} w-2/3`}
                  animate={shimmer.animate}
                  transition={shimmer.transition}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // List variant (for simple lists)
  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <motion.div
              className={`w-12 h-12 rounded-lg ${skeletonBase}`}
              animate={shimmer.animate}
              transition={shimmer.transition}
            />
            <div className="flex-1 space-y-2">
              <motion.div
                className={`h-4 rounded ${skeletonBase} w-3/4`}
                animate={shimmer.animate}
                transition={shimmer.transition}
              />
              <motion.div
                className={`h-3 rounded ${skeletonBase} w-1/2`}
                animate={shimmer.animate}
                transition={shimmer.transition}
              />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Grid variant (for album/artist grids)
  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="space-y-2"
          >
            <motion.div
              className={`aspect-square rounded-xl ${skeletonBase}`}
              animate={shimmer.animate}
              transition={shimmer.transition}
            />
            <motion.div
              className={`h-4 rounded ${skeletonBase} w-3/4`}
              animate={shimmer.animate}
              transition={shimmer.transition}
            />
            <motion.div
              className={`h-3 rounded ${skeletonBase} w-1/2`}
              animate={shimmer.animate}
              transition={shimmer.transition}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  // Heatmap variant (for calendar heatmap)
  if (variant === 'heatmap') {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
        <motion.div
          className={`h-8 rounded ${skeletonBase} w-48 mb-6`}
          animate={shimmer.animate}
          transition={shimmer.transition}
        />
        <div className="grid grid-cols-53 gap-1">
          {Array.from({ length: 365 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.001 }}
              className={`w-3 h-3 rounded-sm ${skeletonBase}`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Stats variant (for stat cards)
  if (variant === 'stats') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 space-y-4"
          >
            <motion.div
              className={`h-6 rounded ${skeletonBase} w-32`}
              animate={shimmer.animate}
              transition={shimmer.transition}
            />
            <motion.div
              className={`h-12 rounded ${skeletonBase} w-24`}
              animate={shimmer.animate}
              transition={shimmer.transition}
            />
            <motion.div
              className={`h-4 rounded ${skeletonBase} w-full`}
              animate={shimmer.animate}
              transition={shimmer.transition}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  return null;
}
