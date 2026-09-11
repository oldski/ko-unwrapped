'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSequentialRamp } from '@/hooks/useChartPalette';

const RAMP_STEPS = 5;

interface HourDayHeatmapProps {
  data: Array<{ playedAt: string | Date }>;
  showLabels?: boolean;
  className?: string;
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HourDayHeatmap({
  data,
  showLabels = true,
  className = '',
}: HourDayHeatmapProps) {
  /*
   * One ramp, shared by every instance.
   *
   * The compare tab shows two of these side by side, and they used to be
   * tinted cyan and purple to mark the two periods. But both encode the same
   * measure — plays by hour and weekday — and each sits in its own titled
   * card, so the period is already named. Colouring them differently implies
   * the colour carries meaning it does not. The day-by-day chart below is the
   * place where two periods share one plot and genuinely need two colours.
   */
  const ramp = useSequentialRamp(RAMP_STEPS);
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

  const getColor = (count: number) => {
    // Absence is not a low value: an empty cell takes the surface, so "no
    // plays" never reads as "a few". The ramp's floor clears 2:1 against it.
    if (count === 0) return 'var(--surface-raised)';
    const step = Math.min(RAMP_STEPS - 1, Math.floor((count / maxCount) * RAMP_STEPS));
    return ramp[step];
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
              className="flex-1 text-center text-[10px] text-[var(--ink-muted)]/60"
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
              <div className="w-9 text-xs text-[var(--ink-muted)] text-right pr-2">
                {dayNames[day]}
              </div>
            )}

            {/* Hour cells */}
            <div className="flex-1 flex gap-[2px]">
              {row.map((count, hour) => (
                <div
                  key={hour}
                  /* 168 cells each animating in on its own delay made the grid
                     assemble itself on every render. */
                  className="flex-1 aspect-square rounded-sm cursor-pointer transition-transform hover:scale-125"
                  style={{ backgroundColor: getColor(count) }}
                  onMouseEnter={() => setHoveredCell({ day, hour, count })}
                  onMouseLeave={() => setHoveredCell(null)}
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
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 rounded-lg px-3 py-2 shadow-xl z-30 pointer-events-none whitespace-nowrap bg-[var(--surface-raised)] border border-[var(--line)]"
        >
          <p className="text-[var(--ink-primary)] text-sm">
            {dayNames[hoveredCell.day]} @ {formatHour(hoveredCell.hour)}
          </p>
          <p className="text-[var(--ink-signal)] text-xs">
            {hoveredCell.count} {hoveredCell.count === 1 ? 'play' : 'plays'}
          </p>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3 text-xs text-[var(--ink-muted)]">
        <span>Less</span>
        <div className="flex gap-[2px]">
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getColor(intensity * maxCount) }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}