'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import AnimatedCard from '@/components/AnimatedCard';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

type ViewMode = 'plays' | 'popularity';

export default function CalendarHeatmap() {
  const [viewMode, setViewMode] = useState<ViewMode>('plays');
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; avgPopularity?: number; tracks: any[] } | null>(null);

  // Memoize the start date to prevent SWR from re-fetching on every render
  const startDateStr = useMemo(() => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    return startDate.toISOString().split('T')[0]; // Use just the date part (YYYY-MM-DD)
  }, []);

  const { data: historyData, error, isLoading } = useSWR(
    `/api/stats/history?start=${startDateStr}&limit=10000`,
    fetcher
  );

  const history = historyData?.data || [];

  const heatmapData = useMemo(() => {
    if (history.length === 0) return [];

    // Group plays by day
    const dayMap = new Map<string, { count: number; totalPopularity: number; tracks: any[] }>();

    history.forEach((play: any) => {
      const day = new Date(play.playedAt).toISOString().split('T')[0];
      if (!dayMap.has(day)) {
        dayMap.set(day, { count: 0, totalPopularity: 0, tracks: [] });
      }
      const dayData = dayMap.get(day)!;
      dayData.count++;
      dayData.tracks.push(play.track);
      dayData.totalPopularity += play.track.popularity || 50;
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
        avgPopularity: dayData ? Math.round(dayData.totalPopularity / dayData.count) : 0,
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
      // Popularity view: purple (niche/indie) to pink (mainstream)
      const popularity = (day.avgPopularity || 50) / 100; // 0-1 scale
      // 0 = purple (niche), 1 = pink (mainstream)
      const hue = 280 - popularity * 40; // 280 (purple) to 240 (more pink/magenta)
      const saturation = 60 + popularity * 30; // More popular = more saturated
      const lightness = 40 + popularity * 20; // More popular = brighter
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }
  };

  // Group days by week for proper grid layout
  const weeks = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  return (
    <AnimatedCard>
      <div className="flex items-center justify-between mb-6">
        <AnimatedCard.Header
          title="Listening Calendar"
          description="Last 365 days of your listening activity"
        />

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            isActive={viewMode === 'plays'}
            onClick={() => setViewMode('plays')}
          >
            Play Count
          </Button>
          <Button
            variant="secondary"
            size="sm"
            isActive={viewMode === 'popularity'}
            onClick={() => setViewMode('popularity')}
          >
            Popularity
          </Button>
        </div>
      </div>

      {/* Legend and Heatmap - hide while loading */}
      {!isLoading && heatmapData.length > 0 && (
        <>
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
                <span>Niche</span>
                <div className="flex gap-1">
                  {[0.0, 0.25, 0.5, 0.75, 1.0].map((popularity) => {
                    const hue = 280 - popularity * 40;
                    const saturation = 60 + popularity * 30;
                    const lightness = 40 + popularity * 20;
                    return (
                      <div
                        key={popularity}
                        className="w-4 h-4 rounded-sm"
                        style={{
                          backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                        }}
                      />
                    );
                  })}
                </div>
                <span>Mainstream</span>
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
                {viewMode === 'popularity' && hoveredDay.avgPopularity !== undefined && (
                  <p className="text-purple-400 text-sm mt-1">
                    Avg Popularity: {hoveredDay.avgPopularity}/100
                    <span className="text-gray-500 ml-1">
                      ({hoveredDay.avgPopularity >= 70 ? 'Mainstream' : hoveredDay.avgPopularity >= 40 ? 'Mid-tier' : 'Niche'})
                    </span>
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
        </>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner size="lg" variant="accent" />
          <p className="text-gray-400 text-sm">Loading listening history...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && heatmapData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No listening data available yet</p>
          <p className="text-gray-500 text-sm mt-1">Start listening to see your calendar fill up!</p>
        </div>
      )}
    </AnimatedCard>
  );
}