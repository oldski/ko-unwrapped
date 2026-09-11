'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * A wall of album covers where position means something.
 *
 * The previous arrangement was a spiral: pretty, but the order of the tracks
 * was the only thing it encoded, and a spiral makes rank harder to read rather
 * than easier. Here popularity drives both how large a cover is and how far it
 * leans out of the wall, so the most played records are the ones that reach
 * toward you.
 *
 * Scroll pans along the wall; moving the pointer tilts it. Orbit controls are
 * off — letting the camera fly anywhere made it easy to end up behind the
 * wall looking at nothing.
 */

const ROWS = 5;
const COLUMN_SPACING = 3.4;
const ROW_SPACING = 3.4;

/** Cover size at the least and most popular ends. */
const MIN_SCALE = 0.62;
const MAX_SCALE = 1.55;

/** How far the most popular covers lean out of the wall. */
const MAX_DEPTH = 2.4;

interface Track {
  id: string;
  name: string;
  popularity: number;
  album: { name: string; images: { url: string }[] };
  artists: { name: string }[];
}

/** Normalise popularity across this set, so differences show even when the
 *  whole set sits in a narrow band. */
function usePopularityScale(tracks: Track[]) {
  return useMemo(() => {
    const values = tracks.map((t) => t.popularity ?? 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, 1);
    return (popularity: number) => (Math.max(popularity, min) - min) / span;
  }, [tracks]);
}

function Cover({
  track,
  position,
  fraction,
  rank,
  onSelect,
}: {
  track: Track;
  position: [number, number, number];
  fraction: number;
  rank: number;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const texture = useLoader(
    THREE.TextureLoader,
    track.album.images[1]?.url || track.album.images[0]?.url,
  ) as THREE.Texture;

  // Without this the artwork renders washed out: three treats the texture as
  // linear unless told it is sRGB.
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
  }, [texture]);

  const scale = MIN_SCALE + fraction * (MAX_SCALE - MIN_SCALE);
  const depth = fraction * MAX_DEPTH;

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Hover pulls a cover clear of its neighbours rather than just enlarging
    // it, so the one under the pointer is unambiguous on a dense wall.
    const targetScale = hovered ? scale * 1.18 : scale;
    const targetZ = hovered ? depth + 1.1 : depth;

    mesh.scale.x += (targetScale - mesh.scale.x) * 0.14;
    mesh.scale.y += (targetScale - mesh.scale.y) * 0.14;
    mesh.scale.z += (targetScale - mesh.scale.z) * 0.14;
    mesh.position.z += (targetZ - mesh.position.z) * 0.14;
  });

  return (
    <group position={position}>
      <RoundedBox
        ref={meshRef}
        args={[2, 2, 0.12]}
        radius={0.06}
        smoothness={3}
        position={[0, 0, depth]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {/*
          Basic rather than standard: album art is the content, not a surface
          to be lit. Under a lit material the covers rendered dim and
          muddy — scene lighting was dictating how the artwork looked.
          `toneMapped` off keeps the colours true to the source image.
        */}
        <meshBasicMaterial map={texture} toneMapped={false} />
      </RoundedBox>

      {hovered && (
        <Html position={[0, -(scale * 1.25), depth + 1.2]} center distanceFactor={14}>
          <div className="pointer-events-none w-52 rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 shadow-xl">
            <p className="mb-0.5 text-xs text-[var(--ink-muted)]">#{rank}</p>
            <p className="line-clamp-1 text-sm text-[var(--ink-primary)]">{track.name}</p>
            <p className="line-clamp-1 text-xs text-[var(--ink-muted)]">
              {track.artists.map((a) => a.name).join(', ')}
            </p>
            <p className="mt-1 text-xs text-[var(--ink-signal)]">
              {track.popularity} popularity
            </p>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function TrackWall({
  tracks,
  onSelect,
}: {
  tracks: Track[];
  onSelect: (track: Track) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const panTarget = useRef(0);
  const gl = useThree((state) => state.gl);
  const fractionOf = usePopularityScale(tracks);

  const columns = Math.ceil(tracks.length / ROWS);
  // Half the wall's width, so panning can be clamped to its actual extent
  // rather than letting the viewer scroll off into empty space.
  const panLimit = Math.max((columns - 1) * COLUMN_SPACING * 0.5, 0);

  useEffect(() => {
    const canvas = gl.domElement;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      // Trackpads send horizontal deltas; wheels only vertical. Take whichever
      // is larger so both gestures pan.
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      panTarget.current = THREE.MathUtils.clamp(
        panTarget.current - delta * 0.01,
        -panLimit,
        panLimit,
      );
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [gl, panLimit]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    group.position.x += (panTarget.current - group.position.x) * 0.08;


    // Pointer tilt, kept small: enough to feel like a surface with depth,
    // not enough to lose the grid.
    const targetRotY = state.pointer.x * 0.16;
    const targetRotX = -state.pointer.y * 0.1;
    group.rotation.y += (targetRotY - group.rotation.y) * 0.06;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.06;
  });

  return (
    // Dropped below centre so the top row clears the fixed header overlay.
    <group ref={groupRef} position={[0, -1.4, 0]}>
      {tracks.map((track, index) => {
        const column = Math.floor(index / ROWS);
        const row = index % ROWS;

        const x = (column - (columns - 1) / 2) * COLUMN_SPACING;
        const y = ((ROWS - 1) / 2 - row) * ROW_SPACING;

        return (
          <Cover
            key={track.id}
            track={track}
            position={[x, y, 0]}
            fraction={fractionOf(track.popularity ?? 0)}
            rank={index + 1}
            onSelect={() => onSelect(track)}
          />
        );
      })}
    </group>
  );
}
