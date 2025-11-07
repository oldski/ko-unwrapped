'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';

type ViewMode = 'plays' | 'mood';

export default function CalendarHeatmap() {
  const [viewMode, setViewMode] = useState<ViewMode>('plays');
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; avgValence?: number } | null>(null);

  // Fetch all history (last 365 days)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365);

  const { data: historyData } = useSWR(
    `/api/stats/history?start=${startDate.toISOString()}&limit=10000`,
    fetcher
  );

  const history = historyData?.data || [];

  const heatmapData = useMemo(() => {
    if (history.length === 0) return [];

    // Group plays by day
    const dayMap = new Map<string, { count: number; totalValence: number; tracks: any[] }>();

    history.forEach((play: any) => {
      const day = new Date(play.playedAt).toISOString().split('T')[0];
      if (!dayMap.has(day)) {
        dayMap.set(day, { count: 0, totalValence: 0, tracks: [] });
      }
      const dayData = dayMap.get(day)!;
      dayData.count++;
      dayData.tracks.push(play.track);

      // Calculate mood (valence) based on track popularity as a proxy
      // In a real scenario, we'd use actual audio features from Spotify
      // Higher popularity = slightly higher valence (0-1 scale)
      const mockValence = (play.track.popularity || 50) / 100;
      dayData.totalValence += mockValence;
    });

    // Create grid for last 365 days
    const days = [];
    const today = new Date();

    for (let i = 365; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = dayMap.get(dateStr);

      days.push({
        date: dateStr,
        count: dayData?.count || 0,
        avgValence: dayData ? dayData.totalValence / dayData.count : 0.5,
        tracks: dayData?.tracks || [],
      });
    }

    return days;
  }, [history]);

  const maxCount = Math.max(...heatmapData.map(d => d.count), 1);

  const getColor = (day: typeof heatmapData[0]) => {
    if (day.count === 0) return '#1f2937'; // gray-800

    if (viewMode === 'plays') {
      // Play count: cyan gradient
      const intensity = day.count / maxCount;
      const lightness = 70 - intensity * 40; // 70% to 30%
      return `hsl(180, 100%, ${lightness}%)`;
    } else {
      // Mood view: green (happy) to blue (calm/sad)
      const valence = day.avgValence;
      // Valence 0-1: 0 = blue (sad/calm), 1 = green (happy/energetic)
      const hue = 200 + valence * 100; // 200 (blue) to 300 (green)
      const saturation = 70 + day.count / maxCount * 30; // More plays = more saturated
      return `hsl(${hue}, ${saturation}%, 50%)`;
    }
  };

  // Group days by week for proper grid layout
  const weeks = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-cyan-400">Listening Calendar</h2>
          <p className="text-gray-400 text-sm mt-1">Last 365 days of your listening activity</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('plays')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              viewMode === 'plays'
                ? 'bg-cyan-500 text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Play Count
          </button>
          <button
            onClick={() => setViewMode('mood')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              viewMode === 'mood'
                ? 'bg-green-500 text-black'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Mood
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-4 text-sm text-gray-400">
        {viewMode === 'plays' ? (
          <>
            <span>Less</span>
            <div className="flex gap-1">
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                <div
                  key={intensity}
                  className="w-4 h-4 rounded-sm"
                  style={{
                    backgroundColor: `hsl(180, 100%, ${70 - intensity * 40}%)`,
                  }}
                />
              ))}
            </div>
            <span>More</span>
          </>
        ) : (
          <>
            <span>Calm/Sad</span>
            <div className="flex gap-1">
              {[0.0, 0.25, 0.5, 0.75, 1.0].map((valence) => {
                const hue = 200 + valence * 100;
                return (
                  <div
                    key={valence}
                    className="w-4 h-4 rounded-sm"
                    style={{
                      backgroundColor: `hsl(${hue}, 80%, 50%)`,
                    }}
                  />
                );
              })}
            </div>
            <span>Happy/Energetic</span>
          </>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="relative">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.ceil(heatmapData.length / 7)}, minmax(0, 1fr))` }}>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid gap-1 grid-rows-7">
              {week.map((day, dayIndex) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (weekIndex * 7 + dayIndex) * 0.001 }}
                  className="aspect-square rounded-sm cursor-pointer relative"
                  style={{
                    backgroundColor: getColor(day),
                  }}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  whileHover={{ scale: 1.5, zIndex: 10 }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredDay && hoveredDay.count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl z-20 pointer-events-none"
            style={{ minWidth: '200px' }}
          >
            <p className="font-bold text-white mb-1">{hoveredDay.date}</p>
            <p className="text-cyan-400 text-sm">
              {hoveredDay.count} {hoveredDay.count === 1 ? 'play' : 'plays'}
            </p>
            {viewMode === 'mood' && (
              <p className="text-green-400 text-sm mt-1">
                Mood: {hoveredDay.avgValence > 0.6 ? 'Happy' : hoveredDay.avgValence > 0.4 ? 'Neutral' : 'Calm'}
              </p>
            )}
            {hoveredDay.tracks.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-gray-400 text-xs mb-1">Top track:</p>
                <p className="text-white text-sm truncate">{hoveredDay.tracks[0].name}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Empty State */}
      {heatmapData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No listening data available yet</p>
          <p className="text-gray-500 text-sm mt-1">Start listening to see your calendar fill up!</p>
        </div>
      )}
    </div>
  );
}