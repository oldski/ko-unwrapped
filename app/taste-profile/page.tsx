'use client';

import { useState } from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { motion } from 'framer-motion';
import AnimatedCard from '@/components/AnimatedCard';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

// Add style for artist hover effect - circular glow
const artistHoverStyles = `
  .artist-image-wrapper {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .artist-image-wrapper:hover {
    box-shadow:
      0 0 20px color-mix(in srgb, var(--color-accent) 60%, transparent),
      0 0 40px color-mix(in srgb, var(--color-accent) 40%, transparent),
      0 0 60px color-mix(in srgb, var(--color-accent) 20%, transparent);
  }
`;

export default function TasteProfilePage() {
  const [timeRange, setTimeRange] = useState<'short_term' | 'medium_term' | 'long_term'>('short_term');

  // Fetch top tracks
  const { data: tracksData, isLoading: tracksLoading } = useSWR(
    `/api/top-tracks-timerange?time_range=${timeRange}&limit=20`,
    fetcher
  );

  // Fetch top artists
  const { data: artistsData, isLoading: artistsLoading } = useSWR(
    '/api/top-artists',
    fetcher
  );

  const tracks = tracksData?.items || [];
  const artists = artistsData || [];
  const isLoading = tracksLoading || artistsLoading;

  // Calculate statistics
  const avgPopularity = tracks.length > 0
    ? Math.round(tracks.reduce((sum: number, track: any) => sum + track.popularity, 0) / tracks.length)
    : 0;

  const uniqueArtists = new Set(tracks.flatMap((track: any) => track.artists.map((a: any) => a.name))).size;

  const timeRangeLabels = {
    short_term: 'Last 4 Weeks',
    medium_term: 'Last 6 Months',
    long_term: 'All Time'
  };

  return (
    <div className="min-h-screen text-white p-8">
      <style>{artistHoverStyles}</style>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2">
            Your Taste
            <span className="text-cyan-500"> Profile</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Explore your music preferences and favorites
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-8">
          {(['short_term', 'medium_term', 'long_term'] as const).map((range) => (
            <Button
              key={range}
              variant="secondary"
              isActive={timeRange === range}
              onClick={() => setTimeRange(range)}
            >
              {timeRangeLabels[range]}
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Spinner size="xl" className="mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)]">Loading your taste profile...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && tracks.length > 0 && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <AnimatedCard size="compact" opacity="bold" weight="light">
                <AnimatedCard.Stat
                  label="Average Popularity"
                  value={`${avgPopularity}%`}
                  trend={avgPopularity > 70 ? 'Mainstream taste' : avgPopularity > 40 ? 'Balanced taste' : 'Underground explorer'}
                />
              </AnimatedCard>

              <AnimatedCard size="compact" opacity="bold" weight="light">
                <AnimatedCard.Stat
                  label="Unique Artists"
                  value={uniqueArtists}
                  trend="in your top tracks"
                />
              </AnimatedCard>

              <AnimatedCard size="compact" opacity="bold" weight="light">
                <AnimatedCard.Stat
                  label="Top Tracks"
                  value={tracks.length}
                  trend={timeRangeLabels[timeRange].toLowerCase()}
                />
              </AnimatedCard>
            </div>

            {/* Top Artists Grid */}
            <AnimatedCard opacity="subtle" weight="light" className="mb-8">
              <AnimatedCard.Header title="Your Top Artists" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {artists.slice(0, 10).map((artist: any, index: number) => (
                  <motion.div
                    key={artist.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="text-center group cursor-pointer"
                  >
                    {artist.coverImage && (
                      <div className="artist-image-wrapper relative mb-3 transition-all duration-300 rounded-full overflow-hidden">
                        <img
                          src={artist.coverImage.url}
                          alt={artist.name}
                          className="w-full aspect-square"
                        />
                      </div>
                    )}
                    <p className="font-semibold text-sm group-hover:text-[var(--color-accent)] transition-colors">
                      {artist.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">#{index + 1}</p>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>

            {/* Popularity Distribution */}
            <AnimatedCard opacity="bold" weight="medium" className="mb-8">
              <AnimatedCard.Header title="Track Popularity Distribution" />
              <div className="space-y-3">
                {tracks.map((track: any, index: number) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center gap-4"
                  >
                    <span className="text-sm text-gray-500 w-8">#{index + 1}</span>
                    <img
                      src={track.album.images[2]?.url || track.album.images[0]?.url}
                      alt={track.album.name}
                      className="w-12 h-12 rounded shadow-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{track.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {track.artists.map((a: any) => a.name).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 w-48">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${track.popularity}%` }}
                          transition={{ duration: 0.5, delay: index * 0.02 }}
                        />
                      </div>
                      <span className="text-sm font-bold text-cyan-400 w-10 text-right">
                        {track.popularity}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>

            {/* Album Collage */}
            <AnimatedCard opacity="bold" weight="medium">
              <AnimatedCard.Header title="Your Musical Universe" />
              <div className="grid grid-cols-4 md:grid-cols-10 gap-2">
                {tracks.map((track: any, index: number) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="aspect-square relative group overflow-hidden rounded"
                  >
                    <img
                      src={track.album.images[2]?.url || track.album.images[0]?.url}
                      alt={track.album.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                      <p className="text-xs text-center line-clamp-3">{track.name}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>
          </>
        )}
      </div>
    </div>
  );
}
