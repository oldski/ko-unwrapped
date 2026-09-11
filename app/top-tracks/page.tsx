'use client';

import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { motion } from 'framer-motion';
import AnimatedCard from '@/components/AnimatedCard';
import SectionRule from '@/components/Interface/SectionRule';
import { useSequentialRamp } from '@/hooks/useChartPalette';
import Spinner from '@/components/Spinner';

export default function AudioFeaturesPage() {
  const popularityRamp = useSequentialRamp(4);
  const { data, isLoading, error } = useSWR('/api/top-tracks-insights', fetcher);

  const insights = data || null;

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-7xl">
        {/* Header */}
        <div className="mb-8 pt-14 md:pt-0 md:pr-82">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl mb-3 text-[var(--ink-primary)]">
            What your top 100 say about you
          </h1>
          <p className="text-[var(--ink-muted)] max-w-[52ch]">
            Insights from your most played songs
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Spinner size="xl" className="mx-auto mb-4" />
              <p className="text-[var(--ink-muted)]">Analyzing your music...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <AnimatedCard tier="panel">
            <div className="text-center py-8">
              <p className="text-rose-400 text-lg">Failed to load insights</p>
              <p className="text-[var(--ink-muted)] text-sm mt-2">{error.message}</p>
            </div>
          </AnimatedCard>
        )}

        {/* Main Content */}
        {!isLoading && insights && (
          <>
            {/*
              * Headline figure plus supporting readouts, rather than four
              * identical tiles. One number is the story of this page; the rest
              * are context, and the layout should say which is which.
              */}
            <section className="mb-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                  <AnimatedCard tier="feature">
                    <p className="text-sm text-[var(--ink-muted)] mb-2">Total plays across your top 100</p>
                    <p className="font-figure text-7xl sm:text-8xl text-[var(--ink-primary)]">
                      {insights.summary.totalPlays.toLocaleString()}
                    </p>
                    <p className="text-sm text-[var(--ink-muted)] mt-3">
                      {insights.summary.totalListeningTime.hours} hours{' '}
                      {insights.summary.totalListeningTime.minutes} minutes of listening
                    </p>
                  </AnimatedCard>
                </div>

                <div className="lg:col-span-5 grid grid-cols-2 lg:grid-cols-1 gap-6">
                  <AnimatedCard tier="chip">
                    <p className="text-xs text-[var(--ink-muted)] mb-1">Tracks analysed</p>
                    <p className="font-figure text-4xl text-[var(--ink-primary)]">
                      {insights.summary.tracksAnalyzed}
                    </p>
                  </AnimatedCard>

                  <AnimatedCard tier="chip">
                    <p className="text-xs text-[var(--ink-muted)] mb-1">Unique artists</p>
                    <p className="font-figure text-4xl text-[var(--ink-primary)]">
                      {insights.summary.uniqueArtists}
                    </p>
                  </AnimatedCard>
                </div>
              </div>
            </section>

            {/* Main Grid */}
            <SectionRule label="Popularity" note="how far off the beaten track" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
              {/* Popularity Analysis */}
              <AnimatedCard tier="panel" className="lg:col-span-7">
                <AnimatedCard.Header title="Popularity Profile" />
                <div className="space-y-6">
                  {/* Average & Obscurity */}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[var(--ink-muted)] text-sm">Average Popularity</p>
                      <p className="font-figure text-4xl text-[var(--ink-primary)]">
                        {insights.popularity.average}
                        <span className="text-lg text-[var(--ink-muted)]">/100</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[var(--ink-muted)] text-sm">Obscurity Score</p>
                      <p className="font-figure text-4xl text-[var(--ink-primary)]">
                        {insights.popularity.obscurityScore}
                      </p>
                    </div>
                  </div>

                  {/*
                    * Distribution is ordinal, not categorical: mainstream,
                    * popular, emerging, underground is a ranked sequence. It
                    * used four unrelated hues, which made the ranking
                    * invisible and implied four separate categories; they were
                    * also visualiser tokens, fixed whatever the artwork.
                    *
                    * One album hue stepping in lightness instead, brightest at
                    * the mainstream end, so the order reads in the colour.
                    */}
                  <div>
                    <p className="text-[var(--ink-muted)] text-sm mb-3">Distribution</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Mainstream', range: '70+', value: insights.popularity.distribution.mainstream },
                        { label: 'Popular', range: '50–69', value: insights.popularity.distribution.popular },
                        { label: 'Emerging', range: '30–49', value: insights.popularity.distribution.emerging },
                        { label: 'Underground', range: 'under 30', value: insights.popularity.distribution.underground },
                      ].map((bucket, index) => {
                        const percentage = (bucket.value / insights.summary.tracksAnalyzed) * 100;
                        // Brightest first, so rank descends with lightness.
                        const fill = popularityRamp[popularityRamp.length - 1 - index];

                        return (
                          <div key={bucket.label}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-[var(--ink-muted)]">
                                {bucket.label}{' '}
                                <span className="text-xs">{bucket.range}</span>
                              </span>
                              <span className="font-data text-[var(--ink-primary)]">
                                {bucket.value}
                              </span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden bg-[var(--surface-raised)]">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${percentage}%`, backgroundColor: fill }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </AnimatedCard>

              {/* Duration Analysis */}
              <AnimatedCard tier="panel" className="h-full lg:col-span-5">
                <AnimatedCard.Header title="Duration Insights" />
                <div className="flex flex-col justify-between flex-1">
                  {/* Average Duration */}
                  <div className="text-center py-4">
                    <p className="text-[var(--ink-muted)] text-sm">Average Track Length</p>
                    <p className="font-figure text-5xl text-[var(--ink-primary)]">
                      {insights.duration.averageFormatted}
                    </p>
                  </div>

                  {/* Shortest & Longest */}
                  <div className="grid grid-cols-2 gap-4">
                    {insights.duration.shortest && (
                      <div className="bg-[var(--surface-raised)] rounded-lg p-4">
                        <p className="text-[var(--ink-muted)] text-xs mb-1">Shortest</p>
                        <p className="text-[var(--ink-signal)] font-bold text-lg">
                          {insights.duration.shortest.formatted}
                        </p>
                        <p className="text-sm text-[var(--ink-muted)] truncate">
                          {insights.duration.shortest.name}
                        </p>
                      </div>
                    )}
                    {insights.duration.longest && (
                      <div className="bg-[var(--surface-raised)] rounded-lg p-4">
                        <p className="text-[var(--ink-muted)] text-xs mb-1">Longest</p>
                        <p className="text-[var(--ink-signal)] font-bold text-lg">
                          {insights.duration.longest.formatted}
                        </p>
                        <p className="text-sm text-[var(--ink-muted)] truncate">
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
              <AnimatedCard tier="panel">
                <AnimatedCard.Header title="Your Style" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[var(--surface-raised)] rounded-lg">
                    <span className="text-[var(--ink-muted)]">Taste</span>
                    <span className={`font-bold ${insights.listeningStyle.mainstream ? 'text-[var(--ink-signal)]' : 'text-[var(--ink-signal)]'}`}>
                      {insights.listeningStyle.mainstream ? 'Mainstream' : 'Underground'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--surface-raised)] rounded-lg">
                    <span className="text-[var(--ink-muted)]">Variety</span>
                    <span className={`font-bold ${insights.listeningStyle.diverse ? 'text-[var(--ink-signal)]' : 'text-[var(--ink-signal)]'}`}>
                      {insights.listeningStyle.diverse ? 'Diverse' : 'Focused'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--surface-raised)] rounded-lg">
                    <span className="text-[var(--ink-muted)]">Loyalty</span>
                    <span className={`font-bold ${insights.listeningStyle.loyalist ? 'text-[var(--ink-signal)]' : 'text-[var(--ink-signal)]'}`}>
                      {insights.listeningStyle.loyalist ? 'Loyalist' : 'Explorer'}
                    </span>
                  </div>
                </div>
              </AnimatedCard>

              {/* Artist Diversity */}
              <AnimatedCard tier="panel">
                <AnimatedCard.Header title="Artist Diversity" />
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="var(--surface-raised)"
                        strokeWidth="12"
                        fill="none"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke={popularityRamp[popularityRamp.length - 1]}
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
                      <span className="font-figure text-3xl text-[var(--ink-primary)]">
                        {insights.artists.diversity}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[var(--ink-muted)] text-sm mt-4 text-center">
                    {insights.summary.uniqueArtists} artists across {insights.summary.tracksAnalyzed} tracks
                  </p>
                </div>
              </AnimatedCard>

              {/* Top Artists */}
              <AnimatedCard tier="panel">
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
                          <span className="text-[var(--ink-signal)] font-bold">{artist.plays}</span>
                        </div>
                        <div className="h-1.5 bg-[var(--surface-raised)] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: popularityRamp[popularityRamp.length - 1] }}
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
            <AnimatedCard tier="panel">
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
                    className="flex items-center gap-3 p-2 rounded-lg bg-[var(--surface-raised)]/60 hover:bg-[var(--surface-raised)] transition-colors"
                  >
                    {/* Rank */}
                    <span className="w-6 text-center text-[var(--ink-muted)] text-sm font-bold">
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
                      <p className="text-xs text-[var(--ink-muted)] truncate">
                        {track.artists.join(', ')}
                      </p>
                    </div>

                    {/* Play Count */}
                    <div className="text-right">
                      <p className="text-[var(--ink-signal)] font-bold">{track.playCount}</p>
                      <p className="text-xs text-[var(--ink-muted)]">plays</p>
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