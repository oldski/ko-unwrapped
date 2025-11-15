'use client';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function OnThisDay() {
  const today = new Date();
  const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { data: onThisDayData, isLoading } = useSWR(
    `/api/stats/on-this-day?monthDay=${monthDay}`,
    fetcher
  );

  const plays = onThisDayData?.data || [];
  const groupedByYear = onThisDayData?.groupedByYear || {};
  const years = onThisDayData?.years || [];

  // Get a few representative tracks from different years
  const highlightedPlays = useMemo(() => {
    if (years.length === 0) return [];

    return years.slice(0, 5).map((year: number) => {
      const yearPlays = groupedByYear[year] || [];
      return yearPlays[0]; // Get first play from each year
    }).filter(Boolean);
  }, [years, groupedByYear]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-500/80 to-pink-500/50 border border-purple-500/50 rounded-2xl p-8">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Loading memories...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!plays.length) {
    return (
      <div className="bg-gradient-to-br from-[var(--color-5)]/75  to-pink-500/50 border border-purple-500/50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-2 text-purple-400">
          On This Day 📅
        </h2>
        <p className="text-gray-400">
          No listening history for {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} yet
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Come back next year to see what you were listening to!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[var(--color-5)]/75 to-[var(--color-7)]/75 border border-[var(--color-border)]/50 rounded-2xl p-8">
      <h2 className="text-2xl font-bold mb-2 text-purple-400">
        On This Day 📅
      </h2>
      <p className="text-gray-400 mb-6">
        Here's what you were listening to on {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} in previous years
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-purple-500/10 rounded-lg p-3">
          <p className="text-purple-300 text-xs mb-1">Total Plays</p>
          <p className="text-2xl font-bold text-white">{plays.length}</p>
        </div>
        <div className="bg-pink-500/10 rounded-lg p-3">
          <p className="text-pink-300 text-xs mb-1">Years</p>
          <p className="text-2xl font-bold text-white">{years.length}</p>
        </div>
        <div className="bg-purple-500/10 rounded-lg p-3">
          <p className="text-purple-300 text-xs mb-1">First Year</p>
          <p className="text-2xl font-bold text-white">{Math.min(...years)}</p>
        </div>
        <div className="bg-pink-500/10 rounded-lg p-3">
          <p className="text-pink-300 text-xs mb-1">Latest Year</p>
          <p className="text-2xl font-bold text-white">{Math.max(...years)}</p>
        </div>
      </div>

      {/* Highlighted Tracks */}
      <div className="space-y-3">
        {highlightedPlays.map((play: any, index: number) => {
          const year = new Date(play.playedAt).getFullYear();
          const yearsAgo = today.getFullYear() - year;

          return (
            <motion.div
              key={play.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-xl hover:bg-gray-800 transition-colors group"
            >
              <img
                src={play.track.albumImage}
                alt={play.track.albumName}
                className="w-16 h-16 rounded-lg shadow-lg"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                  {play.track.name}
                </p>
                <p className="text-sm text-gray-400 truncate">
                  {play.track.artists?.map((a: any) => a.name).join(', ')}
                </p>
                <p className="text-xs text-purple-300 mt-1">
                  {play.track.albumName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-400">{year}</p>
                <p className="text-xs text-gray-400">
                  {yearsAgo === 0 ? 'This year' : yearsAgo === 1 ? '1 year ago' : `${yearsAgo} years ago`}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* View All Link */}
      {plays.length > highlightedPlays.length && (
        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            And {plays.length - highlightedPlays.length} more {plays.length - highlightedPlays.length === 1 ? 'track' : 'tracks'} on this day
          </p>
        </div>
      )}
    </div>
  );
}
