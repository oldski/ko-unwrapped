'use client';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import AnimatedCard from '@/components/AnimatedCard';
import Spinner from '@/components/Spinner';

export default function ListeningStreaks() {
  // Fetch all history to calculate streaks
  const { data: historyData, isLoading } = useSWR(
    '/api/stats/history?limit=10000',
    fetcher
  );

  const history = historyData?.data || [];

  const streakData = useMemo(() => {
    if (history.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        streakDays: [],
        totalDaysWithPlays: 0,
      };
    }

    // Group plays by date
    const datesWithPlays = new Set<string>();
    history.forEach((play: any) => {
      const date = new Date(play.playedAt).toISOString().split('T')[0];
      datesWithPlays.add(date);
    });

    // Convert to sorted array
    const sortedDates = Array.from(datesWithPlays).sort();

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    const streakDays: string[] = [];

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Calculate current streak (consecutive days ending today or yesterday)
    let streakEnded = false;
    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = checkDate.toISOString().split('T')[0];

      if (datesWithPlays.has(checkDateStr)) {
        if (!streakEnded) {
          currentStreak++;
          streakDays.unshift(checkDateStr);
        }
      } else {
        // Allow one day gap for "yesterday" check
        if (i === 0 || (i === 1 && !streakEnded)) {
          continue;
        }
        streakEnded = true;
      }
    }

    // Calculate longest streak
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return {
      currentStreak,
      longestStreak,
      streakDays,
      totalDaysWithPlays: datesWithPlays.size,
    };
  }, [history]);

  const getStreakMessage = () => {
    if (streakData.currentStreak === 0) {
      return "No current streak. Start listening to begin one!";
    } else if (streakData.currentStreak === 1) {
      return "Keep it going! Listen tomorrow to continue your streak.";
    } else if (streakData.currentStreak >= 7) {
      return "🔥 You're on fire! Amazing dedication!";
    } else {
      return "Great job! Keep the momentum going!";
    }
  };

  if (isLoading) {
    return (
      <AnimatedCard>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Spinner size="lg" className="mx-auto mb-3" />
            <p className="text-[var(--color-text-secondary)] text-sm">Calculating streaks...</p>
          </div>
        </div>
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard>
      <AnimatedCard.Header
        title="Listening Streaks"
        description="Track your daily listening consistency"
        icon="🔥"
      />

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-xl p-6 text-center"
        >
          <p className="text-gray-400 text-sm mb-2">Current Streak</p>
          <p className="text-5xl font-bold text-orange-400 mb-1">
            {streakData.currentStreak}
          </p>
          <p className="text-gray-400 text-sm">
            {streakData.currentStreak === 1 ? 'day' : 'days'}
          </p>
          {streakData.currentStreak >= 3 && (
            <div className="mt-2 text-2xl">
              {streakData.currentStreak >= 30 ? '🏆' : streakData.currentStreak >= 14 ? '⭐' : '🔥'}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl p-6 text-center"
        >
          <p className="text-gray-400 text-sm mb-2">Longest Streak</p>
          <p className="text-5xl font-bold text-yellow-400 mb-1">
            {streakData.longestStreak}
          </p>
          <p className="text-gray-400 text-sm">
            {streakData.longestStreak === 1 ? 'day' : 'days'}
          </p>
          {streakData.longestStreak >= 7 && (
            <p className="text-xs text-yellow-400 mt-2">Personal Best!</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-6 text-center"
        >
          <p className="text-gray-400 text-sm mb-2">Total Active Days</p>
          <p className="text-5xl font-bold text-green-400 mb-1">
            {streakData.totalDaysWithPlays}
          </p>
          <p className="text-gray-400 text-sm">days with plays</p>
        </motion.div>
      </div>

      {/* Streak Message */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
        <p className="text-orange-300 text-center font-medium">
          {getStreakMessage()}
        </p>
      </div>

      {/* Recent Streak Calendar */}
      {streakData.streakDays.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-3">
            Current Streak Timeline
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {streakData.streakDays.slice(-14).map((date, index) => {
              const dayDate = new Date(date);
              const isToday = date === new Date().toISOString().split('T')[0];

              return (
                <motion.div
                  key={date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex-shrink-0 w-16 h-20 rounded-lg flex flex-col items-center justify-center ${
                    isToday
                      ? 'bg-orange-500 text-black'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  <p className="text-xs font-semibold">
                    {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className="text-2xl font-bold">
                    {dayDate.getDate()}
                  </p>
                  {isToday && (
                    <p className="text-xs font-bold mt-1">Today</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-3">Milestones</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { days: 3, emoji: '🎵', label: '3-Day', achieved: streakData.longestStreak >= 3 },
            { days: 7, emoji: '🔥', label: '1-Week', achieved: streakData.longestStreak >= 7 },
            { days: 14, emoji: '⭐', label: '2-Week', achieved: streakData.longestStreak >= 14 },
            { days: 30, emoji: '🏆', label: '1-Month', achieved: streakData.longestStreak >= 30 },
          ].map((milestone) => (
            <div
              key={milestone.days}
              className={`p-3 rounded-lg text-center ${
                milestone.achieved
                  ? 'bg-green-500/20 border border-green-500/50'
                  : 'bg-gray-800/50 border border-gray-700'
              }`}
            >
              <p className="text-2xl mb-1">{milestone.emoji}</p>
              <p className={`text-sm font-semibold ${
                milestone.achieved ? 'text-green-400' : 'text-gray-500'
              }`}>
                {milestone.label}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {milestone.achieved ? 'Unlocked!' : `${milestone.days} days`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AnimatedCard>
  );
}
