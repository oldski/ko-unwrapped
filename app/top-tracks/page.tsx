'use client';

import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { motion } from 'framer-motion';
import AnimatedCard from '@/components/AnimatedCard';
import Spinner from '@/components/Spinner';

export default function AudioFeaturesPage() {
  const { data, isLoading, error } = useSWR('/api/top-tracks-insights', fetcher);

  const insights = data || null;

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 text-[var(--color-text-primary)]">
            What Your Top 100 Tracks
            <span className="text-[var(--color-vibrant-safe)]"> Reveal</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg">
            Insights from your most played songs
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Spinner size="xl" className="mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)]">Analyzing your music...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <AnimatedCard opacity="bold" weight="medium">
            <div className="text-center py-8">
              <p className="text-red-400 text-lg">Failed to load insights</p>
              <p className="text-[var(--color-text-secondary)] text-sm mt-2">{error.message}</p>
            </div>
          </AnimatedCard>
        )}

        {/* Main Content */}
        {!isLoading && insights && (
          <>
            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <AnimatedCard size="compact" opacity="bold" weight="light" hoverOpacity>
                <div className="text-center">
                  <p className="text-[var(--color-text-secondary)] text-xs mb-1">Tracks Analyzed</p>
                  <p className="text-3xl font-bold text-[var(--color-accent-safe)]">
                    {insights.summary.tracksAnalyzed}
                  </p>
                </div>
              </AnimatedCard>

              <AnimatedCard size="compact" opacity="bold" weight="light" hoverOpacity>
                <div className="text-center">
                  <p className="text-[var(--color-text-secondary)] text-xs mb-1">Total Plays</p>
                  <p className="text-3xl font-bold text-[var(--color-vibrant-safe)]">
                    {insights.summary.totalPlays.toLocaleString()}
                  </p>
                </div>
              </AnimatedCard>

              <AnimatedCard size="compact" opacity="bold" weight="light" hoverOpacity>
                <div className="text-center">
                  <p className="text-[var(--color-text-secondary)] text-xs mb-1">Listening Time</p>
                  <p className="text-3xl font-bold text-[var(--color-primary-safe)]">
                    {insights.summary.totalListeningTime.hours}h {insights.summary.totalListeningTime.minutes}m
                  </p>
                </div>
              </AnimatedCard>

              <AnimatedCard size="compact" opacity="bold" weight="light" hoverOpacity>
                <div className="text-center">
                  <p className="text-[var(--color-text-secondary)] text-xs mb-1">Unique Artists</p>
                  <p className="text-3xl font-bold text-[var(--color-secondary-safe)]">
                    {insights.summary.uniqueArtists}
                  </p>
                </div>
              </AnimatedCard>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Popularity Analysis */}
              <AnimatedCard opacity="bold" weight="medium" hoverOpacity>
                <AnimatedCard.Header title="Popularity Profile" />
                <div className="space-y-6">
                  {/* Average & Obscurity */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[var(--color-text-secondary)] text-sm">Average Popularity</p>
                      <p className="text-4xl font-bold text-[var(--color-accent-safe)]">
                        {insights.popularity.average}
                        <span className="text-lg text-[var(--color-text-secondary)]">/100</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--color-text-secondary)] text-sm">Obscurity Score</p>
                      <p className="text-4xl font-bold text-[var(--color-vibrant-safe)]">
                        {insights.popularity.obscurityScore}
                      </p>
                    </div>
                  </div>

                  {/* Distribution */}
                  <div>
                    <p className="text-[var(--color-text-secondary)] text-sm mb-3">Distribution</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Mainstream (70+)', value: insights.popularity.distribution.mainstream, color: 'var(--color-vibrant)' },
                        { label: 'Popular (50-69)', value: insights.popularity.distribution.popular, color: 'var(--color-accent)' },
                        { label: 'Emerging (30-49)', value: insights.popularity.distribution.emerging, color: 'var(--color-primary)' },
                        { label: 'Underground (<30)', value: insights.popularity.distribution.underground, color: 'var(--color-secondary)' },
                      ].map((bucket, index) => {
                        const percentage = (bucket.value / insights.summary.tracksAnalyzed) * 100;
                        return (
                          <motion.div
                            key={bucket.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-[var(--color-text-secondary)]">{bucket.label}</span>
                              <span style={{ color: bucket.color }}>{bucket.value} tracks</span>
                            </div>
                            <div className="h-2 bg-[var(--color-darker)] rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: bucket.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.8, delay: index * 0.1 }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </AnimatedCard>

              {/* Duration Analysis */}
              <AnimatedCard className="h-full" opacity="bold" weight="medium" hoverOpacity>
                <AnimatedCard.Header title="Duration Insights" />
                <div className="flex flex-col justify-between flex-1">
                  {/* Average Duration */}
                  <div className="text-center py-4">
                    <p className="text-[var(--color-text-secondary)] text-sm">Average Track Length</p>
                    <p className="text-5xl font-bold text-[var(--color-accent-safe)]">
                      {insights.duration.averageFormatted}
                    </p>
                  </div>

                  {/* Shortest & Longest */}
                  <div className="grid grid-cols-2 gap-4">
                    {insights.duration.shortest && (
                      <div className="bg-[var(--color-darker)] rounded-lg p-4">
                        <p className="text-[var(--color-text-secondary)] text-xs mb-1">Shortest</p>
                        <p className="text-[var(--color-primary-safe)] font-bold text-lg">
                          {insights.duration.shortest.formatted}
                        </p>
                        <p className="text-sm text-[var(--color-text-secondary)] truncate">
                          {insights.duration.shortest.name}
                        </p>
                      </div>
                    )}
                    {insights.duration.longest && (
                      <div className="bg-[var(--color-darker)] rounded-lg p-4">
                        <p className="text-[var(--color-text-secondary)] text-xs mb-1">Longest</p>
                        <p className="text-[var(--color-vibrant-safe)] font-bold text-lg">
                          {insights.duration.longest.formatted}
                        </p>
                        <p className="text-sm text-[var(--color-text-secondary)] truncate">
                          {insights.duration.longest.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Listening Style */}
              <AnimatedCard opacity="bold" weight="medium" hoverOpacity>
                <AnimatedCard.Header title="Your Style" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[var(--color-darker)] rounded-lg">
                    <span className="text-[var(--color-text-secondary)]">Taste</span>
                    <span className={`font-bold ${insights.listeningStyle.mainstream ? 'text-[var(--color-vibrant-safe)]' : 'text-[var(--color-accent-safe)]'}`}>
                      {insights.listeningStyle.mainstream ? 'Mainstream' : 'Underground'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--color-darker)] rounded-lg">
                    <span className="text-[var(--color-text-secondary)]">Variety</span>
                    <span className={`font-bold ${insights.listeningStyle.diverse ? 'text-[var(--color-primary-safe)]' : 'text-[var(--color-secondary-safe)]'}`}>
                      {insights.listeningStyle.diverse ? 'Diverse' : 'Focused'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--color-darker)] rounded-lg">
                    <span className="text-[var(--color-text-secondary)]">Loyalty</span>
                    <span className={`font-bold ${insights.listeningStyle.loyalist ? 'text-[var(--color-accent-safe)]' : 'text-[var(--color-vibrant-safe)]'}`}>
                      {insights.listeningStyle.loyalist ? 'Loyalist' : 'Explorer'}
                    </span>
                  </div>
                </div>
              </AnimatedCard>

              {/* Artist Diversity */}
              <AnimatedCard opacity="bold" weight="medium" hoverOpacity>
                <AnimatedCard.Header title="Artist Diversity" />
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="var(--color-darker)"
                        strokeWidth="12"
                        fill="none"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="var(--color-accent)"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        initial={{ strokeDasharray: "351.86", strokeDashoffset: "351.86" }}
                        animate={{
                          strokeDashoffset: 351.86 - (351.86 * (insights.artists.diversity / 100))
                        }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-[var(--color-accent-safe)]">
                        {insights.artists.diversity}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[var(--color-text-secondary)] text-sm mt-4 text-center">
                    {insights.summary.uniqueArtists} artists across {insights.summary.tracksAnalyzed} tracks
                  </p>
                </div>
              </AnimatedCard>

              {/* Top Artists */}
              <AnimatedCard opacity="bold" weight="medium" hoverOpacity>
                <AnimatedCard.Header title="Top Artists" />
                <div className="space-y-2">
                  {insights.artists.top.slice(0, 5).map((artist: any, index: number) => {
                    const percentage = (artist.plays / insights.artists.top[0].plays) * 100;
                    return (
                      <motion.div
                        key={artist.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="space-y-1"
                      >
                        <div className="flex justify-between text-sm">
                          <span className="truncate flex-1 mr-2">{artist.name}</span>
                          <span className="text-[var(--color-accent-safe)] font-bold">{artist.plays}</span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-darker)] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-[var(--color-vibrant)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatedCard>
            </div>

            {/* Top Tracks List */}
            <AnimatedCard opacity="bold" weight="medium">
              <AnimatedCard.Header
                title="Your Most Played"
                description={`Top ${insights.tracks.length} tracks by play count`}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.tracks.slice(0, 20).map((track: any, index: number) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-darker)]/50 hover:bg-[var(--color-darker)] transition-colors"
                  >
                    {/* Rank */}
                    <span className="w-6 text-center text-[var(--color-text-secondary)] text-sm font-bold">
                      {index + 1}
                    </span>

                    {/* Album Art */}
                    {track.albumImage && (
                      <img
                        src={track.albumImage}
                        alt={track.album}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{track.name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">
                        {track.artists.join(', ')}
                      </p>
                    </div>

                    {/* Play Count */}
                    <div className="text-right">
                      <p className="text-[var(--color-accent-safe)] font-bold">{track.playCount}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">plays</p>
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