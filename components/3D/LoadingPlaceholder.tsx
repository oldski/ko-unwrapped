'use client';

import { Html, useProgress } from '@react-three/drei';

/**
 * Loading placeholder shown while 3D assets are loading
 * Displays within the 3D scene using HTML overlay
 */
export default function LoadingPlaceholder() {
  const { progress } = useProgress();

  return (
    <Html center>
      <div className="flex flex-col items-center gap-3 bg-black/50 backdrop-blur-sm px-6 py-4 rounded-lg border border-[var(--color-accent)]/30">
        <div className="relative w-16 h-16">
          {/* Spinning ring */}
          <div className="absolute inset-0 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />

          {/* Progress percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[var(--color-accent)] font-bold text-sm">
              {progress.toFixed(0)}%
            </span>
          </div>
        </div>

        <p className="text-[var(--color-text-primary)] text-sm font-medium">Loading 3D scene...</p>
      </div>
    </Html>
  );
}
