'use client';

import { useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

interface TrackParticleProps {
  track: any;
  position: [number, number, number];
  index: number;
  onClick?: () => void;
}

/**
 * 3D floating album cover that reacts to mouse interaction
 * Features smooth animations and hover effects
 */
export default function TrackParticle({
  track,
  position,
  index,
  onClick
}: TrackParticleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Load album cover as texture
  const texture = useLoader(
    THREE.TextureLoader,
    track.album.images[1]?.url || track.album.images[0]?.url
  );

  // Animate the particle
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;

    // Floating motion based on index for variety
    const floatSpeed = 0.5 + (index % 3) * 0.2;
    const floatAmount = 0.3 + (index % 2) * 0.2;
    meshRef.current.position.y = position[1] + Math.sin(time * floatSpeed + index) * floatAmount;

    // Gentle rotation
    meshRef.current.rotation.y += 0.003;

    // Scale on hover
    const targetScale = hovered ? 1.3 : 1;
    meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.1;
    meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.1;
    meshRef.current.scale.z += (targetScale - meshRef.current.scale.z) * 0.1;
  });

  return (
    <group position={position}>
      <RoundedBox
        ref={meshRef}
        args={[2, 2, 0.2]}
        radius={0.1}
        smoothness={4}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onClick}
      >
        <meshStandardMaterial
          map={texture}
          emissive="#00ff88"
          emissiveIntensity={hovered ? 0.3 : 0}
          metalness={0.2}
          roughness={0.8}
        />
      </RoundedBox>

      {/* Track number badge */}
      <Html position={[0, 1.3, 0.2]} center>
        <div className="bg-cyan-500 text-black font-bold text-xs px-2 py-1 rounded-full">
          #{index + 1}
        </div>
      </Html>

      {/* Track info on hover */}
      {hovered && (
        <Html position={[0, -1.5, 0]} center>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/90 backdrop-blur-md px-4 py-3 rounded-lg border border-cyan-500/50 min-w-[200px]"
          >
            <p className="font-bold text-white text-sm mb-1 line-clamp-1">
              {track.name}
            </p>
            <p className="text-xs text-gray-300 line-clamp-1">
              {track.artists.map((a: any) => a.name).join(', ')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {track.album.name}
            </p>
          </motion.div>
        </Html>
      )}
    </group>
  );
}
