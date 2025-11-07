'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { Suspense, ReactNode } from 'react';
import LoadingPlaceholder from './LoadingPlaceholder';

interface SceneProps {
  children: ReactNode;
  enableControls?: boolean;
  cameraPosition?: [number, number, number];
  className?: string;
}

/**
 * Base 3D Scene component wrapper
 * Provides canvas, camera, lighting, and optional orbit controls
 */
export default function Scene({
  children,
  enableControls = true,
  cameraPosition = [0, 0, 5],
  className = 'w-full h-full'
}: SceneProps) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]} // Device pixel ratio for retina displays
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        <PerspectiveCamera makeDefault position={cameraPosition} fov={75} />

        {/* Orbit controls for mouse interaction */}
        {enableControls && (
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            maxPolarAngle={Math.PI / 1.5}
            minPolarAngle={Math.PI / 4}
            autoRotate={false}
            autoRotateSpeed={0.5}
          />
        )}

        {/* Environment lighting preset */}
        <Environment preset="city" />

        {/* Additional lighting */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />

        {/* Suspense wrapper for async 3D assets */}
        <Suspense fallback={<LoadingPlaceholder />}>
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}
