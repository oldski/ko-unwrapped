'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';

interface RotatingCubeProps {
  position?: [number, number, number];
  color?: string;
  size?: number;
}

/**
 * Simple rotating cube for testing 3D setup
 */
export default function RotatingCube({
  position = [0, 0, 0],
  color = '#00ff88',
  size = 1
}: RotatingCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate rotation on each frame
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.7;
    }
  });

  return (
    <Box ref={meshRef} position={position} args={[size, size, size]}>
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
    </Box>
  );
}
