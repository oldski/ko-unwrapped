'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
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

/**
 * How far the most popular covers lean out of the wall.
 *
 * Deep on purpose. Under a perspective camera, panning moves near covers
 * across the view faster than far ones, and that parallax is the strongest
 * depth cue here — far more than shading. A shallow wall panned like a flat
 * image.
 */
const MAX_DEPTH = 4.6;

interface Track {
  id: string;
  name: string;
  popularity: number;
  album: { name: string; images: { url: string }[] };
  artists: { name: string }[];
}

/**
 * A stable pseudo-random value per track, in 0..1.
 *
 * Derived from the track id rather than Math.random so a cover keeps the same
 * offset, tilt and drift phase across re-renders. Random per render would make
 * the wall twitch whenever React updated.
 */
function hashUnit(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
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
  reduceMotion,
  onSelect,
}: {
  track: Track;
  position: [number, number, number];
  fraction: number;
  rank: number;
  reduceMotion: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Each cover gets its own tilt and drift phase, so the wall reads as
  // something hung by hand rather than a spreadsheet of images.
  const tilt = (hashUnit(track.id, 3) - 0.5) * 0.14;
  const yaw = (hashUnit(track.id, 17) - 0.5) * 0.22;
  const driftPhase = hashUnit(track.id, 5) * Math.PI * 2;
  const driftSpeed = 0.25 + hashUnit(track.id, 7) * 0.3;

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

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const time = state.clock.elapsedTime;

    /*
     * No entrance animation here.
     *
     * A staggered scale-in left covers stuck small: it gated scale behind a
     * per-cover progress value, and whenever that value did not advance the
     * cover simply stayed tiny. Scale carries meaning on this wall — it is how
     * popularity reads — so nothing else gets to multiply it.
     */
    // Hover pulls a cover clear of its neighbours rather than just enlarging
    // it, so the one under the pointer is unambiguous on a dense wall.
    const targetScale = hovered ? scale * 1.18 : scale;
    const drift = reduceMotion ? 0 : Math.sin(time * driftSpeed + driftPhase) * (0.12 + fraction * 0.1);
    const targetZ = (hovered ? depth + 1.1 : depth) + drift;

    const ease = 1 - Math.pow(0.0001, delta);
    mesh.scale.x += (targetScale - mesh.scale.x) * ease;
    mesh.scale.y += (targetScale - mesh.scale.y) * ease;
    mesh.scale.z += (targetScale - mesh.scale.z) * ease;
    mesh.position.z += (targetZ - mesh.position.z) * ease;

    // A little sway, weighted so the covers that lean out move most.
    if (!reduceMotion) {
      mesh.rotation.z = tilt + Math.sin(time * driftSpeed * 0.7 + driftPhase) * 0.02;
      mesh.rotation.y = yaw + Math.sin(time * driftSpeed * 0.4 + driftPhase) * 0.03;
      mesh.position.y = Math.sin(time * driftSpeed * 0.55 + driftPhase) * (0.08 + fraction * 0.12);
    } else {
      mesh.rotation.z = tilt;
      mesh.rotation.y = yaw;
    }
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
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
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
  const panVelocity = useRef(0);
  const gl = useThree((state) => state.gl);
  const fractionOf = usePopularityScale(tracks);
  const reduceMotion = !!useReducedMotion();

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
      // Feed velocity rather than setting position directly, so a flick
      // carries and a slow scroll creeps.
      panVelocity.current -= delta * 0.004;
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [gl, panLimit]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    // Momentum with friction, then a soft clamp at the wall's edges.
    panVelocity.current *= 0.92;
    panTarget.current = THREE.MathUtils.clamp(
      panTarget.current + panVelocity.current,
      -panLimit,
      panLimit,
    );
    if (panTarget.current === -panLimit || panTarget.current === panLimit) {
      panVelocity.current = 0;
    }
    group.position.x += (panTarget.current - group.position.x) * 0.12;


    // Pointer tilt, kept small: enough to feel like a surface with depth,
    // not enough to lose the grid. A slow independent sway underneath it means
    // the wall is never completely still, even with the pointer parked.
    const breath = reduceMotion ? 0 : state.clock.elapsedTime * 0.12;
    const targetRotY = state.pointer.x * 0.16 + (reduceMotion ? 0 : Math.sin(breath) * 0.035);
    const targetRotX = -state.pointer.y * 0.1 + (reduceMotion ? 0 : Math.cos(breath * 0.8) * 0.022);
    group.rotation.y += (targetRotY - group.rotation.y) * 0.06;
    group.rotation.x += (targetRotX - group.rotation.x) * 0.06;
  });

  return (
    // Dropped below centre so the top row clears the fixed header overlay.
    <group ref={groupRef} position={[0, -1.4, 0]}>
      {tracks.map((track, index) => {
        const column = Math.floor(index / ROWS);
        const row = index % ROWS;

        // Nudge each cover off its grid slot. An exact lattice is what made
        // the wall read as a contact sheet rather than a record wall.
        const jitterX = (hashUnit(track.id, 11) - 0.5) * COLUMN_SPACING * 0.28;
        const jitterY = (hashUnit(track.id, 13) - 0.5) * ROW_SPACING * 0.24;

        const x = (column - (columns - 1) / 2) * COLUMN_SPACING + jitterX;
        const y = ((ROWS - 1) / 2 - row) * ROW_SPACING + jitterY;

        return (
          <Cover
            key={track.id}
            track={track}
            position={[x, y, 0]}
            fraction={fractionOf(track.popularity ?? 0)}
            rank={index + 1}
            reduceMotion={reduceMotion}
            onSelect={() => onSelect(track)}
          />
        );
      })}
    </group>
  );
}
