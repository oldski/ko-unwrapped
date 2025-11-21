'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCard from '@/components/AnimatedCard';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

// Dynamically import 3D components to avoid SSR
const Scene = dynamic(() => import('@/components/3D/Scene'), { ssr: false });
const TrackParticle = dynamic(() => import('@/components/3D/TrackParticle'), { ssr: false });

export default function Tracks3DPage() {
  const [timeRange, setTimeRange] = useState<'short_term' | 'medium_term' | 'long_term'>('short_term');
  const [selectedTrack, setSelectedTrack] = useState<any>(null);

  // Fetch tracks
  const { data: tracksData, isLoading } = useSWR(
    `/api/top-tracks-timerange?time_range=${timeRange}&limit=20`,
    fetcher
  );

  const tracks = tracksData?.items || [];

  // Calculate 3D positions in a spiral pattern
  const getPosition = (index: number, total: number): [number, number, number] => {
    const radius = 8;
    const height = 10;
    const turns = 2; // Number of spiral turns

    const t = index / total;
    const angle = t * Math.PI * 2 * turns;
    const y = (t - 0.5) * height;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    return [x, y, z];
  };

  const timeRangeLabels = {
    short_term: 'Last 4 Weeks',
    medium_term: 'Last 6 Months',
    long_term: 'All Time'
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">
            Your Top Tracks
            <span className="text-cyan-500"> in 3D</span>
          </h1>

          {/* Time Range Selector */}
          <div className="flex gap-2 mt-4">
            {(['short_term', 'medium_term', 'long_term'] as const).map((range) => (
              <Button
                key={range}
                variant="secondary"
                size="sm"
                isActive={timeRange === range}
                onClick={() => setTimeRange(range)}
              >
                {timeRangeLabels[range]}
              </Button>
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-4 text-sm text-gray-400 space-y-1">
            <p>🖱️ Drag to rotate • 🔍 Scroll to zoom • 🎵 Hover over tracks for details</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <Spinner size="xl" variant="vibrant" className="mx-auto mb-4" />
            <p className="text-[var(--color-text-primary)] text-lg">Loading your tracks...</p>
          </div>
        </div>
      )}

      {/* 3D Scene */}
      {!isLoading && tracks.length > 0 && (
        <Scene enableControls={true} cameraPosition={[0, 0, 12]}>
          {tracks.map((track: any, index: number) => (
            <TrackParticle
              key={track.id}
              track={track}
              position={getPosition(index, tracks.length)}
              index={index}
              onClick={() => setSelectedTrack(track)}
            />
          ))}
        </Scene>
      )}

      {/* Track Detail Modal */}
      <AnimatePresence>
        {selectedTrack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedTrack(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="max-w-2xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatedCard opacity="bold" weight="heavy">
                <div className="flex gap-6">
                  {/* Album Art */}
                  <div className="flex-shrink-0">
                    <img
                      src={selectedTrack.album.images[0]?.url}
                      alt={selectedTrack.album.name}
                      className="w-48 h-48 rounded-lg shadow-2xl"
                    />
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 flex flex-col">
                    <h2 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
                      {selectedTrack.name}
                    </h2>
                    <p className="text-xl text-[var(--color-vibrant-safe)] mb-4">
                      {selectedTrack.artists.map((a: any) => a.name).join(', ')}
                    </p>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">Album</span>
                        <span className="text-[var(--color-text-primary)]">{selectedTrack.album.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">Release Date</span>
                        <span className="text-[var(--color-text-primary)]">{selectedTrack.album.release_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--color-text-secondary)]">Popularity</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-vibrant-safe)] rounded-full"
                              style={{ width: `${selectedTrack.popularity}%` }}
                            />
                          </div>
                          <span className="text-[var(--color-text-primary)]">{selectedTrack.popularity}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto flex gap-3">
                      <a
                        href={selectedTrack.external_urls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="success" fullWidth leftIcon="🎵">
                          Open in Spotify
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedTrack(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Panel */}
      <div className="absolute bottom-4 right-4">
        <AnimatedCard size="compact" opacity="bold" weight="medium">
          <h3 className="font-bold mb-2 text-[var(--color-vibrant-safe)]">Stats</h3>
          <div className="text-sm space-y-1 text-[var(--color-text-secondary)]">
            <p>Tracks Loaded: <span className="text-[var(--color-text-primary)] font-bold">{tracks.length}</span></p>
            <p>Time Range: <span className="text-[var(--color-text-primary)] font-bold">{timeRangeLabels[timeRange]}</span></p>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
