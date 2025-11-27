'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

interface HourDayHeatmapProps {
  data: Array<{ playedAt: string | Date }>;
  colorScheme?: 'cyan' | 'purple' | 'green' | 'accent';
  showLabels?: boolean;
  className?: string;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HourDayHeatmap({
  data,
  colorScheme = 'cyan',
  showLabels = true,
  className = '',
}: HourDayHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number; count: number } | null>(null);

  // Build 7x24 grid of counts
  const { grid, maxCount, totalPlays } = useMemo(() => {
    // Initialize 7 days × 24 hours grid
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let total = 0;

    data.forEach((item) => {
      const date = new Date(item.playedAt);
      const day = date.getDay(); // 0-6
      const hour = date.getHours(); // 0-23
      grid[day][hour]++;
      total++;
    });

    const max = Math.max(...grid.flat(), 1);
    return { grid, maxCount: max, totalPlays: total };
  }, [data]);

  // Color schemes
  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-800/50';
    const intensity = count / maxCount;

    const schemes = {
      cyan: [
        'bg-cyan-900/60',
        'bg-cyan-700/70',
        'bg-cyan-600/80',
        'bg-cyan-500/90',
        'bg-cyan-400',
      ],
      purple: [
        'bg-purple-900/60',
        'bg-purple-700/70',
        'bg-purple-600/80',
        'bg-purple-500/90',
        'bg-purple-400',
      ],
      green: [
        'bg-green-900/60',
        'bg-green-700/70',
        'bg-green-600/80',
        'bg-green-500/90',
        'bg-green-400',
      ],
      accent: [
        'bg-[var(--color-accent)]/20',
        'bg-[var(--color-accent)]/40',
        'bg-[var(--color-accent)]/60',
        'bg-[var(--color-accent)]/80',
        'bg-[var(--color-accent)]',
      ],
    };

    const colors = schemes[colorScheme];
    const index = Math.min(Math.floor(intensity * 5), 4);
    return colors[index];
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12a';
    if (hour < 12) return `${hour}a`;
    if (hour === 12) return '12p';
    return `${hour - 12}p`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Hour labels (top) */}
      {showLabels && (
        <div className="flex ml-10 mb-1">
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="flex-1 text-center text-[10px] text-[var(--color-text-secondary)]/60"
            >
              {hour % 3 === 0 ? formatHour(hour) : ''}
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="flex flex-col gap-1">
        {grid.map((row, day) => (
          <div key={day} className="flex items-center gap-1">
            {/* Day label */}
            {showLabels && (
              <div className="w-9 text-xs text-[var(--color-text-secondary)] text-right pr-2">
                {dayNames[day]}
              </div>
            )}

            {/* Hour cells */}
            <div className="flex-1 flex gap-[2px]">
              {row.map((count, hour) => (
                <motion.div
                  key={hour}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (day * 24 + hour) * 0.002 }}
                  className={`flex-1 aspect-square rounded-sm cursor-pointer transition-all ${getColor(count)}`}
                  onMouseEnter={() => setHoveredCell({ day, hour, count })}
                  onMouseLeave={() => setHoveredCell(null)}
                  whileHover={{ scale: 1.3, zIndex: 10 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl z-30 pointer-events-none whitespace-nowrap"
        >
          <p className="font-bold text-white text-sm">
            {dayNames[hoveredCell.day]} @ {formatHour(hoveredCell.hour)}
          </p>
          <p className="text-cyan-400 text-xs">
            {hoveredCell.count} {hoveredCell.count === 1 ? 'play' : 'plays'}
          </p>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-[var(--color-text-secondary)]">
        <span>Less</span>
        <div className="flex gap-[2px]">
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${getColor(intensity * maxCount)}`}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}