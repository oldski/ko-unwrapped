'use client';

import { useState, useMemo } from 'react';
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

// Listening Persona definitions
const PERSONAS = {
  explorer: {
    name: 'The Explorer',
    emoji: '🧭',
    description: 'You love discovering new artists and have eclectic taste',
    color: 'var(--color-vibrant-safe)',
  },
  curator: {
    name: 'The Curator',
    emoji: '🎨',
    description: 'You seek out underground gems before they go mainstream',
    color: 'var(--color-accent-safe)',
  },
  loyalist: {
    name: 'The Loyalist',
    emoji: '💎',
    description: 'You know what you love and stick with your favorites',
    color: 'var(--color-primary-safe)',
  },
  mainstream: {
    name: 'The Trendsetter',
    emoji: '📈',
    description: 'You stay current with what\'s popular and trending',
    color: 'var(--color-secondary-safe)',
  },
  eclectic: {
    name: 'The Eclectic',
    emoji: '🎭',
    description: 'Your taste spans many genres and moods',
    color: 'var(--color-vibrant-safe)',
  },
};

export default function TasteProfilePage() {
  const [timeRange, setTimeRange] = useState<'short_term' | 'medium_term' | 'long_term'>('short_term');

  // Fetch top tracks
  const { data: tracksData, isLoading: tracksLoading } = useSWR(
    `/api/top-tracks-timerange?time_range=${timeRange}&limit=50`,
    fetcher
  );

  // Fetch top artists (now respects time range)
  const { data: artistsData, isLoading: artistsLoading } = useSWR(
    `/api/top-artists?time_range=${timeRange}&limit=20`,
    fetcher
  );

  // Fetch actual play counts from database for comparison
  const { data: dbTopTracks } = useSWR(
    '/api/stats/top-tracks?limit=20',
    fetcher
  );

  const tracks = tracksData?.items || [];
  const artists = artistsData || [];
  const actualTopTracks = dbTopTracks?.data || [];
  const isLoading = tracksLoading || artistsLoading;

  // Calculate statistics
  const avgPopularity = tracks.length > 0
    ? Math.round(tracks.reduce((sum: number, track: any) => sum + track.popularity, 0) / tracks.length)
    : 0;

  const uniqueArtistsInTracks = new Set(tracks.flatMap((track: any) => track.artists.map((a: any) => a.name))).size;

  const timeRangeLabels = {
    short_term: 'Last 4 Weeks',
    medium_term: 'Last 6 Months',
    long_term: 'All Time'
  };

  // Genre breakdown calculation
  const genreData = useMemo(() => {
    const genreCounts = new Map<string, number>();
    artists.forEach((artist: any) => {
      (artist.genres || []).forEach((genre: string) => {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      });
    });

    return Array.from(genreCounts.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [artists]);

  // Obscurity score (0-100, higher = more obscure/underground)
  const obscurityScore = useMemo(() => {
    if (tracks.length === 0) return 0;
    const avgPop = tracks.reduce((sum: number, t: any) => sum + t.popularity, 0) / tracks.length;
    return Math.round(100 - avgPop);
  }, [tracks]);

  // Diversity metrics
  const diversityMetrics = useMemo(() => {
    const uniqueArtists = new Set(tracks.flatMap((t: any) => t.artists.map((a: any) => a.id))).size;
    const uniqueAlbums = new Set(tracks.map((t: any) => t.album.id)).size;
    const uniqueGenres = new Set(artists.flatMap((a: any) => a.genres || [])).size;

    // Artist diversity: ratio of unique artists to total tracks
    const artistDiversity = tracks.length > 0 ? Math.round((uniqueArtists / tracks.length) * 100) : 0;

    return {
      uniqueArtists,
      uniqueAlbums,
      uniqueGenres,
      artistDiversity,
    };
  }, [tracks, artists]);

  // Determine listening persona
  const persona = useMemo(() => {
    if (tracks.length === 0) return PERSONAS.explorer;

    const { artistDiversity, uniqueGenres } = diversityMetrics;

    // High genre diversity = eclectic
    if (uniqueGenres >= 20) return PERSONAS.eclectic;

    // High artist diversity + low popularity = explorer/curator
    if (artistDiversity >= 70 && obscurityScore >= 50) return PERSONAS.explorer;
    if (obscurityScore >= 60) return PERSONAS.curator;

    // Low diversity = loyalist
    if (artistDiversity <= 40) return PERSONAS.loyalist;

    // High popularity = mainstream
    if (avgPopularity >= 65) return PERSONAS.mainstream;

    // Default to explorer
    return PERSONAS.explorer;
  }, [tracks, diversityMetrics, obscurityScore, avgPopularity]);

  return (
    <div className="min-h-screen text-white p-8">
      <style>{artistHoverStyles}</style>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
	        <h1 className="text-5xl font-bold mb-2 text-[var(--color-text-primary)]">
            Your Taste
		        <span className="text-[var(--color-vibrant-safe)]"> Profile</span>
          </h1>
	        <p className="text-[var(--color-text-secondary)] text-lg">
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
            {/* Listening Persona */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <AnimatedCard opacity="bold" weight="medium">
                <div className="flex flex-col md:flex-row items-center gap-6 p-2">
                  <div className="text-6xl">{persona.emoji}</div>
                  <div className="text-center md:text-left">
                    <h2 className="text-3xl font-bold mb-2" style={{ color: persona.color }}>
                      {persona.name}
                    </h2>
                    <p className="text-[var(--color-text-secondary)] text-lg">{persona.description}</p>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>

            {/* Stats Overview - Enhanced */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <AnimatedCard size="compact" opacity="bold" weight="light">
                  <div className="text-center p-2">
                    <p className="text-[var(--color-text-secondary)] text-xs mb-1">Obscurity Score</p>
                    <p className="text-3xl font-bold text-[var(--color-accent-safe)]">{obscurityScore}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      {obscurityScore >= 60 ? 'Deep underground' : obscurityScore >= 40 ? 'Off the beaten path' : 'Chart adjacent'}
                    </p>
                  </div>
                </AnimatedCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <AnimatedCard size="compact" opacity="bold" weight="light">
                  <div className="text-center p-2">
                    <p className="text-[var(--color-text-secondary)] text-xs mb-1">Artist Diversity</p>
                    <p className="text-3xl font-bold text-[var(--color-vibrant-safe)]">{diversityMetrics.artistDiversity}%</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      {diversityMetrics.artistDiversity >= 70 ? 'Variety seeker' : diversityMetrics.artistDiversity >= 40 ? 'Balanced mix' : 'Loyal listener'}
                    </p>
                  </div>
                </AnimatedCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <AnimatedCard size="compact" opacity="bold" weight="light">
                  <div className="text-center p-2">
                    <p className="text-[var(--color-text-secondary)] text-xs mb-1">Genres</p>
                    <p className="text-3xl font-bold text-[var(--color-primary-safe)]">{diversityMetrics.uniqueGenres}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">unique genres</p>
                  </div>
                </AnimatedCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <AnimatedCard size="compact" opacity="bold" weight="light">
                  <div className="text-center p-2">
                    <p className="text-[var(--color-text-secondary)] text-xs mb-1">Avg Popularity</p>
                    <p className="text-3xl font-bold text-[var(--color-secondary-safe)]">{avgPopularity}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">out of 100</p>
                  </div>
                </AnimatedCard>
              </motion.div>
            </div>

            {/* Genre Breakdown */}
            {genreData.length > 0 && (
              <AnimatedCard opacity="bold" weight="medium" className="mb-8">
                <AnimatedCard.Header title="Your Genre DNA" description="Based on your top artists" />
                <div className="flex flex-wrap gap-2 mt-4">
                  {genreData.map((item, index) => {
                    const maxCount = genreData[0].count;
                    const intensity = item.count / maxCount;
                    return (
                      <motion.span
                        key={item.genre}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
                        style={{
                          backgroundColor: `color-mix(in srgb, var(--color-accent) ${20 + intensity * 40}%, transparent)`,
                          borderWidth: '1px',
                          borderColor: `color-mix(in srgb, var(--color-accent) ${30 + intensity * 50}%, transparent)`,
                          color: intensity > 0.5 ? 'var(--color-accent-safe)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {item.genre}
                        <span className="ml-1.5 opacity-60">({item.count})</span>
                      </motion.span>
                    );
                  })}
                </div>
              </AnimatedCard>
            )}

            {/* Top Artists Grid */}
            <AnimatedCard opacity="subtle" weight="light" className="mb-8">
              <AnimatedCard.Header title="Your Top Artists" description={timeRangeLabels[timeRange]} />
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

            {/* Actual Plays vs Spotify Ranking */}
            {actualTopTracks.length > 0 && (
              <AnimatedCard opacity="bold" weight="medium" className="mb-8">
                <AnimatedCard.Header
                  title="What You Actually Play"
                  description="Your real listening data vs Spotify's algorithm"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Database Top Tracks */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-primary-safe)] mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-primary-safe)]" />
                      Most Played (Database)
                    </h3>
                    <div className="space-y-2">
                      {actualTopTracks.slice(0, 10).map((track: any, index: number) => (
                        <motion.div
                          key={track.trackId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-bg-2)]/30 hover:bg-[var(--color-bg-2)]/50 transition-colors"
                        >
                          <span className="text-xs text-[var(--color-text-secondary)] w-5">#{index + 1}</span>
                          <img
                            src={track.albumImage}
                            alt={track.trackName}
                            className="w-8 h-8 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{track.trackName}</p>
                            <p className="text-xs text-[var(--color-text-secondary)] truncate">
                              {track.artists?.map((a: any) => a.name).join(', ')}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-[var(--color-primary-safe)]">
                            {track.playCount}×
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Spotify Top Tracks */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-accent-safe)] mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-accent-safe)]" />
                      Spotify's Top Picks
                    </h3>
                    <div className="space-y-2">
                      {tracks.slice(0, 10).map((track: any, index: number) => (
                        <motion.div
                          key={track.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-bg-2)]/30 hover:bg-[var(--color-bg-2)]/50 transition-colors"
                        >
                          <span className="text-xs text-[var(--color-text-secondary)] w-5">#{index + 1}</span>
                          <img
                            src={track.album.images[2]?.url || track.album.images[0]?.url}
                            alt={track.album.name}
                            className="w-8 h-8 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{track.name}</p>
                            <p className="text-xs text-[var(--color-text-secondary)] truncate">
                              {track.artists.map((a: any) => a.name).join(', ')}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-[var(--color-accent-safe)]">
                            {track.popularity}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            )}

            {/* Album Collage */}
            <AnimatedCard opacity="bold" weight="medium">
              <AnimatedCard.Header title="Your Musical Universe" />
              <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
                {tracks.map((track: any, index: number) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="aspect-square relative group overflow-hidden rounded"
                  >
                    <img
                      src={track.album.images[2]?.url || track.album.images[0]?.url}
                      alt={track.album.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                      <p className="text-[10px] text-center line-clamp-3">{track.name}</p>
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
