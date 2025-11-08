'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { motion } from 'framer-motion';
import Navigation from "@/components/Interface/Navigation";
import DateRangePicker from "@/components/DateRangePicker";

export default function StatsPage() {
  const [selectedView, setSelectedView] = useState<'timeline' | 'patterns'>('timeline');
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({
    start: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString();
    })(),
    end: new Date().toISOString(),
  });

  // Build query params for date range
  const queryParams = new URLSearchParams();
  if (dateRange.start) queryParams.append('start', dateRange.start);
  if (dateRange.end) queryParams.append('end', dateRange.end);
  queryParams.append('limit', '200');

  // Fetch historical data from database
  const { data: historyData, isLoading } = useSWR(
    `/api/stats/history?${queryParams.toString()}`,
    fetcher
  );

  const recentTracks = historyData?.data || [];

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

  const handleDateRangeChange = (start: string | null, end: string | null) => {
    setDateRange({ start, end });
  };

  return (
    <div className="min-h-screen text-white p-8">
      <Navigation />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2 text-[var(--color-text-primary)]">
            Your Listening
            <span className="text-[var(--color-primary)]"> Patterns</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-lg">
            Discover when and what you love to listen to
          </p>
          <p className="text-[var(--color-text-secondary)]/70 text-sm mt-2">
            Based on your complete listening history from the database
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">Time Period</h3>
          <DateRangePicker onRangeChange={handleDateRangeChange} defaultPreset="30d" />
        </div>

        {/* View Selector */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setSelectedView('timeline')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all border-2 ${
              selectedView === 'timeline'
                ? 'bg-[var(--color-primary)] text-[var(--color-text-primary)] border-[var(--color-accent)]'
                : 'bg-[var(--color-bg-2)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-primary)]/20'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setSelectedView('patterns')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all border-2 ${
              selectedView === 'patterns'
                ? 'bg-[var(--color-primary)] text-[var(--color-text-primary)] border-[var(--color-accent)]'
                : 'bg-[var(--color-bg-2)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-primary)]/20'
            }`}
          >
            Patterns
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading your listening history...</p>
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
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[var(--color-primary)]/20 backdrop-blur-sm border border-[var(--color-primary)]/50 rounded-2xl p-6"
                  >
                    <p className="text-[var(--color-text-secondary)] text-sm mb-1">Tracks Played</p>
                    <p className="text-4xl font-bold text-[var(--color-primary)]">{patterns.totalTracks}</p>
                    <p className="text-[var(--color-text-secondary)] text-sm mt-1">in selected period</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[var(--color-secondary)]/20 backdrop-blur-sm border border-[var(--color-secondary)]/50 rounded-2xl p-6"
                  >
                    <p className="text-[var(--color-text-secondary)] text-sm mb-1">Peak Listening Time</p>
                    <p className="text-4xl font-bold text-[var(--color-secondary)]">
                      {patterns.peakHour > 12 ? patterns.peakHour - 12 : patterns.peakHour || 12}
                      {patterns.peakHour >= 12 ? 'PM' : 'AM'}
                    </p>
                    <p className="text-[var(--color-text-secondary)] text-sm mt-1">{getTimeOfDay(patterns.peakHour)}</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[var(--color-accent)]/20 backdrop-blur-sm border border-[var(--color-accent)]/50 rounded-2xl p-6"
                  >
                    <p className="text-[var(--color-text-secondary)] text-sm mb-1">Favorite Day</p>
                    <p className="text-4xl font-bold text-[var(--color-accent)]">
                      {dayNames[patterns.peakDay]}
                    </p>
                    <p className="text-[var(--color-text-secondary)] text-sm mt-1">Most active listening day</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-[var(--color-primary)]/20 backdrop-blur-sm border border-[var(--color-primary)]/50 rounded-2xl p-6"
                  >
                    <p className="text-[var(--color-text-secondary)] text-sm mb-1">Total Listening Time</p>
                    <p className="text-4xl font-bold text-[var(--color-primary)]">
                      {patterns.totalHours}h
                    </p>
                    <p className="text-[var(--color-text-secondary)] text-sm mt-1">{patterns.totalMinutes} minutes</p>
                  </motion.div>
                </div>

                {/* Recently Played Timeline */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold mb-6 text-cyan-400">Recent History</h2>
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
                          className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-xl hover:bg-gray-800 transition-colors group"
                        >
                          <img
                            src={item.track.albumImage}
                            alt={item.track.albumName}
                            className="w-16 h-16 rounded-lg shadow-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                              {item.track.name}
                            </p>
                            <p className="text-sm text-gray-400 truncate">
                              {item.track.artists?.map((a: any) => a.name).join(', ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-cyan-400 font-semibold">{timeAgo}</p>
                            <p className="text-xs text-gray-500">
                              {playedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {selectedView === 'patterns' && (
              <div className="space-y-8">
                {/* Listening by Hour */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold mb-6 text-cyan-400">Listening by Hour</h2>
                  <div className="grid grid-cols-12 gap-2">
                    {patterns.hourCounts.map((count, hour) => {
                      const maxCount = Math.max(...patterns.hourCounts);
                      const height = maxCount > 0 ? (count / maxCount) * 200 : 0;
                      const isPeak = hour === patterns.peakHour;

                      return (
                        <div key={hour} className="flex flex-col items-center gap-2">
                          <motion.div
                            className={`w-full rounded-t-lg ${
                              isPeak ? 'bg-cyan-500' : 'bg-gray-700'
                            }`}
                            initial={{ height: 0 }}
                            animate={{ height: `${height}px` }}
                            transition={{ duration: 0.5, delay: hour * 0.02 }}
                          />
                          <span className="text-xs text-gray-400">
                            {hour === 0 ? '12A' : hour < 12 ? `${hour}A` : hour === 12 ? '12P' : `${hour - 12}P`}
                          </span>
                          {count > 0 && (
                            <span className="text-xs text-cyan-400 font-bold">{count}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Day of Week Distribution */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold mb-6 text-cyan-400">Listening by Day</h2>
                  <div className="grid grid-cols-7 gap-4">
                    {patterns.dayOfWeekCounts.map((count, day) => {
                      const maxCount = Math.max(...patterns.dayOfWeekCounts);
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      const isPeak = day === patterns.peakDay;

                      return (
                        <div key={day} className="text-center">
                          <div className="mb-2">
                            <p className={`text-2xl font-bold ${isPeak ? 'text-cyan-400' : 'text-white'}`}>
                              {count}
                            </p>
                            <p className="text-sm text-gray-400">{dayNames[day]}</p>
                          </div>
                          <div className="h-32 bg-gray-800 rounded-lg overflow-hidden flex items-end">
                            <motion.div
                              className={`w-full ${isPeak ? 'bg-cyan-500' : 'bg-gray-600'}`}
                              initial={{ height: 0 }}
                              animate={{ height: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: day * 0.1 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Artists */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
                  <h2 className="text-2xl font-bold mb-6 text-cyan-400">Most Played Artists</h2>
                  <div className="space-y-4">
                    {patterns.topArtists.map((artist, index) => {
                      const maxCount = patterns.topArtists[0].count;
                      const percentage = (artist.count / maxCount) * 100;

                      return (
                        <motion.div
                          key={artist.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-lg">{artist.name}</span>
                            <span className="text-cyan-400 font-bold">{artist.count} plays</span>
                          </div>
                          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
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
