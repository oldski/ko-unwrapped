'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { motion, AnimatePresence } from 'framer-motion';
import DateRangePicker from "@/components/DateRangePicker";
import AnimatedCard from '@/components/AnimatedCard';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';
import HourDayHeatmap from '@/components/HourDayHeatmap';

// Comparison preset options
const COMPARISON_PRESETS = [
  { label: 'This Week vs Last Week', periodA: 7, periodB: 7 },
  { label: 'This Month vs Last Month', periodA: 30, periodB: 30 },
  { label: 'Last 7 Days vs Previous 7 Days', periodA: 7, periodB: 7 },
  { label: 'Last 30 Days vs Previous 30 Days', periodA: 30, periodB: 30 },
];

// Period-based listening personas (based on WHEN you listen, not WHAT)
const PERIOD_PERSONAS = {
  nightOwl: {
    name: 'Night Owl',
    emoji: '🦉',
    description: 'You come alive after dark',
    color: 'var(--color-accent-safe)',
  },
  earlyBird: {
    name: 'Early Bird',
    emoji: '🐦',
    description: 'You start your day with music',
    color: 'var(--color-primary-safe)',
  },
  weekendWarrior: {
    name: 'Weekend Warrior',
    emoji: '🎉',
    description: 'Your listening peaks on weekends',
    color: 'var(--color-vibrant-safe)',
  },
  workdayListener: {
    name: 'Workday Listener',
    emoji: '💼',
    description: 'Music powers your weekdays',
    color: 'var(--color-secondary-safe)',
  },
  eveningEnthusiast: {
    name: 'Evening Enthusiast',
    emoji: '🌆',
    description: 'Your prime listening time is evenings',
    color: 'var(--color-accent-safe)',
  },
  allDayPlayer: {
    name: 'All-Day Player',
    emoji: '🎧',
    description: 'You listen throughout the day',
    color: 'var(--color-vibrant-safe)',
  },
};

// Helper function to calculate patterns from tracks
function calculatePatterns(tracks: any[]) {
  if (tracks.length === 0) return null;

  const hourCounts = new Array(24).fill(0);
  const dayOfWeekCounts = new Array(7).fill(0);
  const artistCounts: { [key: string]: number } = {};
  let totalDurationMs = 0;

  tracks.forEach((item: any) => {
    const date = new Date(item.playedAt);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    hourCounts[hour]++;
    dayOfWeekCounts[dayOfWeek]++;
    totalDurationMs += item.track?.durationMs || 0;

    item.track?.artists?.forEach((artist: any) => {
      artistCounts[artist.name] = (artistCounts[artist.name] || 0) + 1;
    });
  });

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  const peakDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));

  const topArtists = Object.entries(artistCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    hourCounts,
    dayOfWeekCounts,
    peakHour,
    peakDay,
    topArtists,
    totalTracks: tracks.length,
    totalHours,
    totalMinutes,
  };
}

// Helper to get persona from patterns
function getPersonaFromPatterns(patterns: ReturnType<typeof calculatePatterns>) {
  if (!patterns) return PERIOD_PERSONAS.allDayPlayer;

  const { hourCounts, dayOfWeekCounts } = patterns;
  const total = patterns.totalTracks;

  const nightPlays = hourCounts.slice(21, 24).reduce((a, b) => a + b, 0) + hourCounts.slice(0, 5).reduce((a, b) => a + b, 0);
  const morningPlays = hourCounts.slice(5, 12).reduce((a, b) => a + b, 0);
  const eveningPlays = hourCounts.slice(17, 21).reduce((a, b) => a + b, 0);

  const weekendPlays = dayOfWeekCounts[0] + dayOfWeekCounts[6];
  const weekdayPlays = dayOfWeekCounts.slice(1, 6).reduce((a, b) => a + b, 0);
  const weekendRatio = total > 0 ? weekendPlays / total : 0;

  if (weekendRatio >= 0.5) return PERIOD_PERSONAS.weekendWarrior;
  if (nightPlays / total >= 0.4) return PERIOD_PERSONAS.nightOwl;
  if (morningPlays / total >= 0.4) return PERIOD_PERSONAS.earlyBird;
  if (eveningPlays / total >= 0.35) return PERIOD_PERSONAS.eveningEnthusiast;
  if (weekdayPlays / total >= 0.8) return PERIOD_PERSONAS.workdayListener;

  return PERIOD_PERSONAS.allDayPlayer;
}

export default function StatsPage() {
  const [selectedView, setSelectedView] = useState<'timeline' | 'patterns' | 'heatmap' | 'compare'>('timeline');
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString();
    })(),
    end: new Date().toISOString(),
  });

  // Comparison mode state
  const [comparisonPreset, setComparisonPreset] = useState(0);
  const [comparisonRanges, setComparisonRanges] = useState(() => {
    const now = new Date();
    const periodAEnd = new Date(now);
    const periodAStart = new Date(now);
    periodAStart.setDate(periodAStart.getDate() - 7);
    const periodBEnd = new Date(periodAStart);
    const periodBStart = new Date(periodBEnd);
    periodBStart.setDate(periodBStart.getDate() - 7);

    return {
      periodA: { start: periodAStart.toISOString(), end: periodAEnd.toISOString(), label: 'This Week' },
      periodB: { start: periodBStart.toISOString(), end: periodBEnd.toISOString(), label: 'Last Week' },
    };
  });

  const hourScrollRef = useRef<HTMLDivElement>(null);

  // Enable horizontal drag scrolling for hourly grid
  useEffect(() => {
    const el = hourScrollRef.current;
    if (!el) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      el.classList.add('cursor-grabbing');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const onMouseLeave = () => {
      isDown = false;
      el.classList.remove('cursor-grabbing');
    };

    const onMouseUp = () => {
      isDown = false;
      el.classList.remove('cursor-grabbing');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 2;
      el.scrollLeft = scrollLeft - walk;
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  // Build query params for date range
  const queryParams = new URLSearchParams();
  if (dateRange.start) queryParams.append('start', dateRange.start);
  if (dateRange.end) queryParams.append('end', dateRange.end);
  queryParams.append('limit', '2000');

  // Fetch historical data from database
  const { data: historyData, isLoading } = useSWR(
    `/api/stats/history?${queryParams.toString()}`,
    fetcher
  );

  // Fetch top tracks for period
  const topTracksParams = new URLSearchParams();
  if (dateRange.start) topTracksParams.append('start', dateRange.start);
  if (dateRange.end) topTracksParams.append('end', dateRange.end);
  topTracksParams.append('limit', '10');

  const { data: topTracksData } = useSWR(
    `/api/stats/top-tracks?${topTracksParams.toString()}`,
    fetcher
  );

  const recentTracks = historyData?.data || [];
  const topTracks = topTracksData?.data || [];

  // Comparison mode data fetching
  const periodAParams = new URLSearchParams();
  periodAParams.append('start', comparisonRanges.periodA.start);
  periodAParams.append('end', comparisonRanges.periodA.end);
  periodAParams.append('limit', '2000');

  const periodBParams = new URLSearchParams();
  periodBParams.append('start', comparisonRanges.periodB.start);
  periodBParams.append('end', comparisonRanges.periodB.end);
  periodBParams.append('limit', '2000');

  const { data: periodAData, isLoading: isLoadingA } = useSWR(
    selectedView === 'compare' ? `/api/stats/history?${periodAParams.toString()}` : null,
    fetcher
  );

  const { data: periodBData, isLoading: isLoadingB } = useSWR(
    selectedView === 'compare' ? `/api/stats/history?${periodBParams.toString()}` : null,
    fetcher
  );

  const periodATracks = periodAData?.data || [];
  const periodBTracks = periodBData?.data || [];
  const isLoadingComparison = isLoadingA || isLoadingB;

  // Calculate patterns for comparison periods
  const periodAPatterns = useMemo(() => calculatePatterns(periodATracks), [periodATracks]);
  const periodBPatterns = useMemo(() => calculatePatterns(periodBTracks), [periodBTracks]);
  const periodAPersona = useMemo(() => getPersonaFromPatterns(periodAPatterns), [periodAPatterns]);
  const periodBPersona = useMemo(() => getPersonaFromPatterns(periodBPatterns), [periodBPatterns]);

  // Handle comparison preset change
  const handleComparisonPresetChange = useCallback((presetIndex: number) => {
    setComparisonPreset(presetIndex);
    const preset = COMPARISON_PRESETS[presetIndex];
    const now = new Date();

    // Period A is the more recent period
    const periodAEnd = new Date(now);
    const periodAStart = new Date(now);
    periodAStart.setDate(periodAStart.getDate() - preset.periodA);

    // Period B is the previous period
    const periodBEnd = new Date(periodAStart);
    const periodBStart = new Date(periodBEnd);
    periodBStart.setDate(periodBStart.getDate() - preset.periodB);

    const labels = preset.label.split(' vs ');
    setComparisonRanges({
      periodA: { start: periodAStart.toISOString(), end: periodAEnd.toISOString(), label: labels[0] },
      periodB: { start: periodBStart.toISOString(), end: periodBEnd.toISOString(), label: labels[1] },
    });
  }, []);

  // Calculate comparison deltas
  const comparisonDeltas = useMemo(() => {
    if (!periodAPatterns || !periodBPatterns) return null;

    const playsDelta = periodAPatterns.totalTracks - periodBPatterns.totalTracks;
    const playsPercent = periodBPatterns.totalTracks > 0
      ? Math.round(((periodAPatterns.totalTracks - periodBPatterns.totalTracks) / periodBPatterns.totalTracks) * 100)
      : 0;

    const hoursDelta = periodAPatterns.totalHours - periodBPatterns.totalHours;
    const hoursPercent = periodBPatterns.totalHours > 0
      ? Math.round(((periodAPatterns.totalHours - periodBPatterns.totalHours) / periodBPatterns.totalHours) * 100)
      : 0;

    const peakHourChanged = periodAPatterns.peakHour !== periodBPatterns.peakHour;
    const peakDayChanged = periodAPatterns.peakDay !== periodBPatterns.peakDay;
    const personaChanged = periodAPersona.name !== periodBPersona.name;

    return {
      playsDelta,
      playsPercent,
      hoursDelta,
      hoursPercent,
      peakHourChanged,
      peakDayChanged,
      personaChanged,
    };
  }, [periodAPatterns, periodBPatterns, periodAPersona, periodBPersona]);

  // Calculate listening patterns
  const patterns = useMemo(() => {
    if (recentTracks.length === 0) return null;

    // Group by hour of day
    const hourCounts = new Array(24).fill(0);
    const dayOfWeekCounts = new Array(7).fill(0);
    const artistCounts: { [key: string]: number } = {};
    let totalDurationMs = 0;

    recentTracks.forEach((item: any) => {
      const date = new Date(item.playedAt);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();

      hourCounts[hour]++;
      dayOfWeekCounts[dayOfWeek]++;
      totalDurationMs += item.track.durationMs || 0;

      // Count artists
      item.track.artists?.forEach((artist: any) => {
        artistCounts[artist.name] = (artistCounts[artist.name] || 0) + 1;
      });
    });

    // Find peak listening hour
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));

    // Top artists
    const topArtists = Object.entries(artistCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Calculate total listening time
    const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      hourCounts,
      dayOfWeekCounts,
      peakHour,
      peakDay,
      topArtists,
      totalTracks: recentTracks.length,
      totalHours,
      totalMinutes,
    };
  }, [recentTracks]);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getTimeOfDay = (hour: number) => {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 21) return 'Evening';
    return 'Night';
  };

  // Calculate period-based listening persona
  const periodPersona = useMemo(() => {
    if (!patterns) return PERIOD_PERSONAS.allDayPlayer;

    const { hourCounts, dayOfWeekCounts, peakHour } = patterns;

    // Calculate time-of-day distribution
    const nightPlays = hourCounts.slice(21, 24).reduce((a, b) => a + b, 0) + hourCounts.slice(0, 5).reduce((a, b) => a + b, 0);
    const morningPlays = hourCounts.slice(5, 12).reduce((a, b) => a + b, 0);
    const eveningPlays = hourCounts.slice(17, 21).reduce((a, b) => a + b, 0);
    const total = patterns.totalTracks;

    // Calculate weekend vs weekday
    const weekendPlays = dayOfWeekCounts[0] + dayOfWeekCounts[6];
    const weekdayPlays = dayOfWeekCounts.slice(1, 6).reduce((a, b) => a + b, 0);
    const weekendRatio = total > 0 ? weekendPlays / total : 0;

    // Determine persona
    if (weekendRatio >= 0.5) return PERIOD_PERSONAS.weekendWarrior;
    if (nightPlays / total >= 0.4) return PERIOD_PERSONAS.nightOwl;
    if (morningPlays / total >= 0.4) return PERIOD_PERSONAS.earlyBird;
    if (eveningPlays / total >= 0.35) return PERIOD_PERSONAS.eveningEnthusiast;
    if (weekdayPlays / total >= 0.8) return PERIOD_PERSONAS.workdayListener;

    return PERIOD_PERSONAS.allDayPlayer;
  }, [patterns]);

  const handleDateRangeChange = (start: string | null, end: string | null) => {
    setDateRange({ start, end });
  };

  return (
    <div className="min-h-screen text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
	        <h1 className="text-5xl font-bold mb-2 text-[var(--color-text-primary)]">
            Your Listening
	          <span className="text-[var(--color-vibrant-safe)]"> Patterns</span>
          </h1>
	        <p className="text-[var(--color-text-secondary)] text-lg">
            Discover when and what you love to listen to
          </p>
          <p className="text-[var(--color-text-secondary)]/70 text-sm mt-2">
            Based on your complete listening history from the database
          </p>
        </div>

        {/* View Selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant="secondary"
            isActive={selectedView === 'timeline'}
            onClick={() => setSelectedView('timeline')}
          >
            Timeline
          </Button>
          <Button
            variant="secondary"
            isActive={selectedView === 'patterns'}
            onClick={() => setSelectedView('patterns')}
          >
            Patterns
          </Button>
          <Button
            variant="secondary"
            isActive={selectedView === 'heatmap'}
            onClick={() => setSelectedView('heatmap')}
          >
            Heatmap
          </Button>
          <Button
            variant="secondary"
            isActive={selectedView === 'compare'}
            onClick={() => setSelectedView('compare')}
          >
            Compare
          </Button>
        </div>

        {/* Date Range Picker - only show for non-compare views */}
        {selectedView !== 'compare' && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-gray-300">Time Period</h3>
            <DateRangePicker onRangeChange={handleDateRangeChange} defaultPreset="30d" />
          </div>
        )}

        {/* Comparison Preset Selector */}
        {selectedView === 'compare' && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-gray-300">Compare Periods</h3>
            <div className="flex flex-wrap gap-2">
              {COMPARISON_PRESETS.map((preset, index) => (
                <Button
                  key={preset.label}
                  variant="secondary"
                  isActive={comparisonPreset === index}
                  onClick={() => handleComparisonPresetChange(index)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Spinner size="xl" className="mx-auto mb-4" />
              <p className="text-[var(--color-text-secondary)]">Loading your listening history...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && patterns && (
          <>
            {selectedView === 'timeline' && (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <AnimatedCard.Stat
                      label="Tracks Played"
                      value={patterns.totalTracks}
                      trend="in selected period"
                    />
                  </AnimatedCard>

                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <AnimatedCard.Stat
                      label="Peak Listening Time"
                      value={`${patterns.peakHour > 12 ? patterns.peakHour - 12 : patterns.peakHour || 12}${patterns.peakHour >= 12 ? 'PM' : 'AM'}`}
                      trend={getTimeOfDay(patterns.peakHour)}
                    />
                  </AnimatedCard>

                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <AnimatedCard.Stat
                      label="Favorite Day"
                      value={dayNames[patterns.peakDay]}
                      trend="Most active listening day"
                    />
                  </AnimatedCard>

                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <AnimatedCard.Stat
                      label="Total Listening Time"
                      value={`${patterns.totalHours}h`}
                      trend={`${patterns.totalMinutes} minutes`}
                    />
                  </AnimatedCard>
                </div>

                {/* Recently Played Timeline */}
                <AnimatedCard opacity="bold" weight="medium">
                  <AnimatedCard.Header title="Recent History" />
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {recentTracks.slice(0, 50).map((item: any, index: number) => {
                      const playedDate = new Date(item.playedAt);
                      const now = new Date();
                      const diffMs = now.getTime() - playedDate.getTime();
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMins / 60);
                      const diffDays = Math.floor(diffHours / 24);

                      let timeAgo = '';
                      if (diffDays > 0) timeAgo = `${diffDays}d ago`;
                      else if (diffHours > 0) timeAgo = `${diffHours}h ago`;
                      else timeAgo = `${diffMins}m ago`;

                      return (
                        <motion.div
                          key={`${item.id}-${item.playedAt}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          whileHover={{ scale: 1.02, x: 4 }}
                          className="flex items-center gap-4 bg-[var(--color-bg-2)]/30 border border-[var(--color-border)]/10 p-4 rounded-xl hover:bg-[var(--color-bg-2)]/50 hover:border-[var(--color-accent)]/30 transition-all group cursor-pointer"
                        >
                          <img
                            src={item.track.albumImage}
                            alt={item.track.albumName}
                            className="w-16 h-16 rounded-lg shadow-lg group-hover:shadow-xl transition-shadow"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-vibrant-safe)] transition-colors">
                              {item.track.name}
                            </p>
                            <p className="text-sm text-[var(--color-text-secondary)] truncate">
                              {item.track.artists?.map((a: any) => a.name).join(', ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-[var(--color-accent-safe)] font-semibold">{timeAgo}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]/70">
                              {playedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </AnimatedCard>
              </div>
            )}

            {selectedView === 'patterns' && (
              <div className="space-y-8">
                {/* Period Persona */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AnimatedCard opacity="bold" weight="medium">
                    <div className="flex flex-col md:flex-row items-center gap-6 p-2">
                      <div className="text-6xl">{periodPersona.emoji}</div>
                      <div className="text-center md:text-left">
                        <h2 className="text-2xl font-bold mb-1" style={{ color: periodPersona.color }}>
                          {periodPersona.name}
                        </h2>
                        <p className="text-[var(--color-text-secondary)]">{periodPersona.description}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]/60 mt-1">Based on this period</p>
                      </div>
                    </div>
                  </AnimatedCard>
                </motion.div>

                {/* Listening by Hour - Scrollable on mobile */}
                <AnimatedCard opacity="bold" weight="medium" hoverOpacity>
                  <AnimatedCard.Header title="Listening by Hour" description="Drag to scroll on mobile" />
                  <div
                    ref={hourScrollRef}
                    className="overflow-x-auto cursor-grab pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                  >
                    <div className="grid grid-cols-24 gap-2" style={{ minWidth: '800px' }}>
                      {patterns.hourCounts.map((count, hour) => {
                        const maxCount = Math.max(...patterns.hourCounts);
                        const height = maxCount > 0 ? (count / maxCount) * 150 : 0;
                        const isPeak = hour === patterns.peakHour;

                        return (
                          <div key={hour} className="flex flex-col items-center gap-2 min-w-[30px]">
                            <motion.div
                              className={`w-full rounded-t-lg ${
                                isPeak ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-muted)]'
                              }`}
                              initial={{ height: 0 }}
                              animate={{ height: `${height}px` }}
                              transition={{ duration: 0.5, delay: hour * 0.02 }}
                            />
                            <span className="text-[10px] text-[var(--color-muted)]">
                              {hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                            </span>
                            {count > 0 && (
                              <span className="text-[10px] text-[var(--color-accent-safe)] font-bold">{count}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </AnimatedCard>

                {/* Day of Week Distribution */}
                <AnimatedCard opacity="bold" weight="medium" hoverOpacity={1}>
                  <AnimatedCard.Header title="Listening by Day" />
                  <div className="grid grid-cols-7 gap-2 md:gap-4">
                    {patterns.dayOfWeekCounts.map((count, day) => {
                      const maxCount = Math.max(...patterns.dayOfWeekCounts);
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      const isPeak = day === patterns.peakDay;

                      return (
                        <div key={day} className="text-center">
                          <div className="mb-2">
                            <p className={`text-lg md:text-2xl font-bold ${isPeak ? 'text-[var(--color-accent-safe)]' : 'text-[var(--color-lighter)]'}`}>
                              {count}
                            </p>
                            <p className="text-xs md:text-sm text-[var(--color-muted)]">{dayNames[day]}</p>
                          </div>
                          <div className="h-20 md:h-32 bg-[var(--color-darker)] rounded-lg overflow-hidden flex items-end">
                            <motion.div
                              className={`w-full ${isPeak ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-muted)]'}`}
                              initial={{ height: 0 }}
                              animate={{ height: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: day * 0.1 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AnimatedCard>

                {/* Top Artists & Top Tracks side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Artists */}
                  <AnimatedCard opacity="bold" weight="medium">
                    <AnimatedCard.Header title="Most Played Artists" />
                    <div className="space-y-3">
                      {patterns.topArtists.map((artist, index) => {
                        const maxCount = patterns.topArtists[0].count;
                        const percentage = (artist.count / maxCount) * 100;

                        return (
                          <motion.div
                            key={artist.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm truncate flex-1 mr-2">{artist.name}</span>
                              <span className="text-[var(--color-accent-safe)] font-bold text-sm">{artist.count}</span>
                            </div>
                            <div className="h-2 bg-[var(--color-darker)] rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-[var(--color-accent-safe)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </AnimatedCard>

                  {/* Top Tracks for Period */}
                  <AnimatedCard opacity="bold" weight="medium">
                    <AnimatedCard.Header title="Most Played Tracks" />
                    <div className="space-y-2">
                      {topTracks.slice(0, 5).map((track: any, index: number) => (
                        <motion.div
                          key={track.trackId}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-bg-2)]/30 hover:bg-[var(--color-bg-2)]/50 transition-colors"
                        >
                          <span className="text-xs text-[var(--color-text-secondary)] w-4">#{index + 1}</span>
                          <img
                            src={track.albumImage}
                            alt={track.trackName}
                            className="w-10 h-10 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{track.trackName}</p>
                            <p className="text-xs text-[var(--color-text-secondary)] truncate">
                              {track.artists?.map((a: any) => a.name).join(', ')}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-[var(--color-primary-safe)]">
                            {track.playCount}×
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatedCard>
                </div>
              </div>
            )}

            {selectedView === 'heatmap' && (
              <div className="space-y-8">
                {/* Period Persona */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AnimatedCard opacity="bold" weight="medium">
                    <div className="flex flex-col md:flex-row items-center gap-6 p-2">
                      <div className="text-6xl">{periodPersona.emoji}</div>
                      <div className="text-center md:text-left">
                        <h2 className="text-2xl font-bold mb-1" style={{ color: periodPersona.color }}>
                          {periodPersona.name}
                        </h2>
                        <p className="text-[var(--color-text-secondary)]">{periodPersona.description}</p>
                      </div>
                    </div>
                  </AnimatedCard>
                </motion.div>

                {/* Hour x Day Heatmap */}
                <AnimatedCard opacity="bold" weight="medium">
                  <AnimatedCard.Header
                    title="When You Listen"
                    description="Hour × Day of Week activity heatmap"
                  />
                  <div className="mt-4">
                    <HourDayHeatmap
                      data={recentTracks.map((t: any) => ({ playedAt: t.playedAt }))}
                      colorScheme="accent"
                    />
                  </div>
                </AnimatedCard>

                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <div className="text-center p-2">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Peak Hour</p>
                      <p className="text-2xl font-bold text-[var(--color-accent-safe)]">
                        {patterns.peakHour > 12 ? patterns.peakHour - 12 : patterns.peakHour || 12}
                        {patterns.peakHour >= 12 ? 'PM' : 'AM'}
                      </p>
                    </div>
                  </AnimatedCard>
                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <div className="text-center p-2">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Peak Day</p>
                      <p className="text-2xl font-bold text-[var(--color-vibrant-safe)]">
                        {dayNames[patterns.peakDay]}
                      </p>
                    </div>
                  </AnimatedCard>
                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <div className="text-center p-2">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Total Plays</p>
                      <p className="text-2xl font-bold text-[var(--color-primary-safe)]">
                        {patterns.totalTracks}
                      </p>
                    </div>
                  </AnimatedCard>
                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <div className="text-center p-2">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Listen Time</p>
                      <p className="text-2xl font-bold text-[var(--color-secondary-safe)]">
                        {patterns.totalHours}h
                      </p>
                    </div>
                  </AnimatedCard>
                </div>
              </div>
            )}
          </>
        )}

        {/* Compare View */}
        {selectedView === 'compare' && (
          <>
            {isLoadingComparison && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Spinner size="xl" className="mx-auto mb-4" />
                  <p className="text-[var(--color-text-secondary)]">Loading comparison data...</p>
                </div>
              </div>
            )}

            {!isLoadingComparison && periodAPatterns && periodBPatterns && comparisonDeltas && (
              <div className="space-y-8">
                {/* Summary Delta Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <div className="text-center p-2">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Plays Change</p>
                      <p className={`text-2xl font-bold ${comparisonDeltas.playsDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {comparisonDeltas.playsDelta >= 0 ? '+' : ''}{comparisonDeltas.playsDelta}
                      </p>
                      <p className={`text-xs ${comparisonDeltas.playsPercent >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                        {comparisonDeltas.playsPercent >= 0 ? '+' : ''}{comparisonDeltas.playsPercent}%
                      </p>
                    </div>
                  </AnimatedCard>
                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <div className="text-center p-2">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Hours Change</p>
                      <p className={`text-2xl font-bold ${comparisonDeltas.hoursDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {comparisonDeltas.hoursDelta >= 0 ? '+' : ''}{comparisonDeltas.hoursDelta}h
                      </p>
                      <p className={`text-xs ${comparisonDeltas.hoursPercent >= 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
                        {comparisonDeltas.hoursPercent >= 0 ? '+' : ''}{comparisonDeltas.hoursPercent}%
                      </p>
                    </div>
                  </AnimatedCard>
                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <div className="text-center p-2">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Peak Hour</p>
                      <p className={`text-lg font-bold ${comparisonDeltas.peakHourChanged ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {comparisonDeltas.peakHourChanged ? 'Changed' : 'Same'}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {periodBPatterns.peakHour > 12 ? periodBPatterns.peakHour - 12 : periodBPatterns.peakHour || 12}
                        {periodBPatterns.peakHour >= 12 ? 'PM' : 'AM'}
                        {' → '}
                        {periodAPatterns.peakHour > 12 ? periodAPatterns.peakHour - 12 : periodAPatterns.peakHour || 12}
                        {periodAPatterns.peakHour >= 12 ? 'PM' : 'AM'}
                      </p>
                    </div>
                  </AnimatedCard>
                  <AnimatedCard size="compact" opacity="bold" weight="light">
                    <div className="text-center p-2">
                      <p className="text-[var(--color-text-secondary)] text-xs mb-1">Peak Day</p>
                      <p className={`text-lg font-bold ${comparisonDeltas.peakDayChanged ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {comparisonDeltas.peakDayChanged ? 'Changed' : 'Same'}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        {dayNames[periodBPatterns.peakDay]} → {dayNames[periodAPatterns.peakDay]}
                      </p>
                    </div>
                  </AnimatedCard>
                </div>

                {/* Persona Comparison */}
                <AnimatedCard opacity="bold" weight="medium">
                  <AnimatedCard.Header title="Listening Persona Comparison" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
                    {/* Period B (Previous) */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-center"
                    >
                      <p className="text-sm text-[var(--color-text-secondary)] mb-2">{comparisonRanges.periodB.label}</p>
                      <div className="text-5xl mb-2">{periodBPersona.emoji}</div>
                      <h3 className="text-xl font-bold" style={{ color: periodBPersona.color }}>
                        {periodBPersona.name}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">{periodBPersona.description}</p>
                      <div className="mt-3 text-xs text-[var(--color-text-secondary)]/60">
                        {periodBPatterns.totalTracks} plays · {periodBPatterns.totalHours}h
                      </div>
                    </motion.div>

                    {/* Arrow / Divider */}
                    <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                      <div className="text-3xl text-[var(--color-text-secondary)]/30">→</div>
                    </div>

                    {/* Period A (Current) */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-center"
                    >
                      <p className="text-sm text-[var(--color-text-secondary)] mb-2">{comparisonRanges.periodA.label}</p>
                      <div className="text-5xl mb-2">{periodAPersona.emoji}</div>
                      <h3 className="text-xl font-bold" style={{ color: periodAPersona.color }}>
                        {periodAPersona.name}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">{periodAPersona.description}</p>
                      <div className="mt-3 text-xs text-[var(--color-text-secondary)]/60">
                        {periodAPatterns.totalTracks} plays · {periodAPatterns.totalHours}h
                      </div>
                    </motion.div>
                  </div>
                  {comparisonDeltas.personaChanged && (
                    <div className="text-center pb-4">
                      <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm">
                        Your listening style shifted!
                      </span>
                    </div>
                  )}
                </AnimatedCard>

                {/* Side-by-side Heatmaps */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AnimatedCard opacity="bold" weight="medium">
                    <AnimatedCard.Header
                      title={comparisonRanges.periodB.label}
                      description={`${periodBPatterns.totalTracks} plays`}
                    />
                    <div className="mt-4">
                      <HourDayHeatmap
                        data={periodBTracks.map((t: any) => ({ playedAt: t.playedAt }))}
                        colorScheme="purple"
                      />
                    </div>
                  </AnimatedCard>

                  <AnimatedCard opacity="bold" weight="medium">
                    <AnimatedCard.Header
                      title={comparisonRanges.periodA.label}
                      description={`${periodAPatterns.totalTracks} plays`}
                    />
                    <div className="mt-4">
                      <HourDayHeatmap
                        data={periodATracks.map((t: any) => ({ playedAt: t.playedAt }))}
                        colorScheme="cyan"
                      />
                    </div>
                  </AnimatedCard>
                </div>

                {/* Day-by-Day Comparison */}
                <AnimatedCard opacity="bold" weight="medium">
                  <AnimatedCard.Header title="Day-by-Day Comparison" />
                  <div className="grid grid-cols-7 gap-2 md:gap-4">
                    {dayNames.map((day, index) => {
                      const prevCount = periodBPatterns.dayOfWeekCounts[index];
                      const currCount = periodAPatterns.dayOfWeekCounts[index];
                      const delta = currCount - prevCount;
                      const maxTotal = Math.max(
                        ...periodAPatterns.dayOfWeekCounts,
                        ...periodBPatterns.dayOfWeekCounts,
                        1
                      );
                      const prevHeight = (prevCount / maxTotal) * 100;
                      const currHeight = (currCount / maxTotal) * 100;

                      return (
                        <div key={day} className="text-center">
                          <p className="text-xs text-gray-400 mb-2">{day}</p>
                          <div className="h-24 md:h-32 flex items-end gap-1">
                            {/* Previous period bar */}
                            <motion.div
                              className="flex-1 bg-purple-600/60 rounded-t"
                              initial={{ height: 0 }}
                              animate={{ height: `${prevHeight}%` }}
                              transition={{ duration: 0.5, delay: index * 0.05 }}
                            />
                            {/* Current period bar */}
                            <motion.div
                              className="flex-1 bg-cyan-500 rounded-t"
                              initial={{ height: 0 }}
                              animate={{ height: `${currHeight}%` }}
                              transition={{ duration: 0.5, delay: index * 0.05 + 0.1 }}
                            />
                          </div>
                          <p className={`text-xs font-bold mt-1 ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                            {delta > 0 ? '+' : ''}{delta}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-purple-600/60" />
                      <span className="text-[var(--color-text-secondary)]">{comparisonRanges.periodB.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-cyan-500" />
                      <span className="text-[var(--color-text-secondary)]">{comparisonRanges.periodA.label}</span>
                    </div>
                  </div>
                </AnimatedCard>

                {/* Top Artists Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatedCard opacity="bold" weight="medium">
                    <AnimatedCard.Header title={`Top Artists - ${comparisonRanges.periodB.label}`} />
                    <div className="space-y-2">
                      {periodBPatterns.topArtists.slice(0, 5).map((artist, index) => (
                        <motion.div
                          key={artist.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-2)]/30"
                        >
                          <span className="text-sm truncate flex-1">{artist.name}</span>
                          <span className="text-purple-400 font-bold text-sm ml-2">{artist.count}</span>
                        </motion.div>
                      ))}
                    </div>
                  </AnimatedCard>

                  <AnimatedCard opacity="bold" weight="medium">
                    <AnimatedCard.Header title={`Top Artists - ${comparisonRanges.periodA.label}`} />
                    <div className="space-y-2">
                      {periodAPatterns.topArtists.slice(0, 5).map((artist, index) => {
                        // Check if artist was also in previous period
                        const prevArtist = periodBPatterns.topArtists.find(a => a.name === artist.name);
                        const isNew = !prevArtist;

                        return (
                          <motion.div
                            key={artist.name}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-2 rounded bg-[var(--color-bg-2)]/30"
                          >
                            <span className="text-sm truncate flex-1">
                              {artist.name}
                              {isNew && (
                                <span className="ml-2 text-xs text-green-400 bg-green-400/20 px-1.5 py-0.5 rounded">new</span>
                              )}
                            </span>
                            <span className="text-cyan-400 font-bold text-sm ml-2">{artist.count}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </AnimatedCard>
                </div>
              </div>
            )}

            {!isLoadingComparison && (!periodAPatterns || !periodBPatterns) && (
              <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-12 text-center">
                <p className="text-gray-400 text-lg mb-2">Not enough data for comparison</p>
                <p className="text-gray-500 text-sm">Try selecting different time periods with more listening history</p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && patterns && patterns.totalTracks === 0 && (
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-12 text-center">
            <p className="text-gray-400 text-lg mb-2">No listening data for this time period</p>
            <p className="text-gray-500 text-sm">Try selecting a different date range</p>
          </div>
        )}
      </div>
    </div>
  );
}
