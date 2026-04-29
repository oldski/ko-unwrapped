'use client';

import { usePathname } from 'next/navigation';

export default function VisualizerBlurOverlay() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none z-[1] backdrop-blur-md bg-black/30"
    />
  );
}
