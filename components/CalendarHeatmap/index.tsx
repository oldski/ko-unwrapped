'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useSequentialRamp } from '@/hooks/useChartPalette';
import { useAmbientTheme } from '@/components/ColorThemeProvider';
import { buildSequentialRamp } from '@/lib/color/chartPalette';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import AnimatedCard from '@/components/AnimatedCard';
import Button from '@/components/Button';
import Spinner from '@/components/Spinner';

type ViewMode = 'plays' | 'popularity';

export default function CalendarHeatmap() {
  const { albumHue } = useAmbientTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('plays');
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; avgPopularity: number; topTrack?: string | null } | null>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  // Enable horizontal drag scrolling for calendar grid
  useEffect(() => {
    const el = calendarScrollRef.current;
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

  /*
   * One row per day, grouped in the database.
   *
   * This used to fetch raw plays from /api/stats/history and bucket them here,
   * which made `limit` a cap on plays rather than days: ~14,500 plays in a
   * 365-day window meant limit=10000 returned only back to 2026-01-26, so
   * three months quietly vanished off the left of the calendar.
   */
  const { data: dailyData, error, isLoading } = useSWR(
    '/api/stats/daily?days=365',
    fetcher
  );

  const dailyRows: { date: string; plays: number; avgPopularity: number; topTrack?: string | null }[] =
    dailyData?.data || [];

  const heatmapData = useMemo(() => {
    if (dailyRows.length === 0) return [];

    const byDate = new Map(dailyRows.map((row) => [row.date, row]));
    const days: { date: string; count: number; avgPopularity: number; topTrack?: string | null }[] = [];
    const today = new Date();

    for (let i = 365; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const row = byDate.get(dateStr);

      days.push({
        date: dateStr,
        count: row?.plays ?? 0,
        avgPopularity: row?.avgPopularity ?? 0,
        topTrack: row?.topTrack ?? null,
      });
    }

    return days;
  }, [dailyRows]);

  const maxCount = Math.max(...heatmapData.map(d => d.count), 1);

  /*
   * Cell colour.
   *
   * Both views are sequential — they encode magnitude — so each is one hue
   * stepping light to dark, taken from the album. The previous version
   * hardcoded cyan for plays and, for popularity, swept the hue from purple
   * toward pink while also changing saturation and lightness. A hue sweep
   * encodes magnitude as a rainbow, which reads as categories rather than
   * amount; and neither view touched the album palette at all.
   *
   * The two views sit on different anchors of the album hue so switching
   * between them is visible, while each stays a single-hue ramp.
   */
  const RAMP_STEPS = 5;
  const playsRamp = useSequentialRamp(RAMP_STEPS);
  const popularityRamp = useMemo(
    () => buildSequentialRamp((albumHue + 40) % 360, RAMP_STEPS),
    [albumHue],
  );

  const getColor = (day: typeof heatmapData[0]) => {
    // An empty day is absence, not a low value: it takes the surface, not the
    // lightest step of the ramp, so "nothing" never reads as "a little".
    if (day.count === 0) return 'var(--surface-raised)';

    const ramp = viewMode === 'plays' ? playsRamp : popularityRamp;
    const fraction =
      viewMode === 'plays'
        ? day.count / maxCount
        : Math.min(day.avgPopularity, 100) / 100;

    const step = Math.min(RAMP_STEPS - 1, Math.floor(fraction * RAMP_STEPS));
    return ramp[step];
  };

  // Group days by week for proper grid layout
  const weeks = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  return (
    <AnimatedCard tier="feature">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <AnimatedCard.Header
          title="Listening Calendar"
          description="Last 365 days of your listening activity. Drag to scroll on mobile."
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
          {/* Legend reads from the same ramp the cells use, so it cannot drift. */}
          <div className="mb-4 flex items-center gap-3 text-xs text-[var(--ink-muted)]">
            <span>{viewMode === 'plays' ? 'Fewer plays' : 'Niche'}</span>
            <div className="flex gap-[2px]">
              {(viewMode === 'plays' ? playsRamp : popularityRamp).map((colour, i) => (
                <div
                  key={colour + i}
                  className="w-4 h-4 rounded-[3px]"
                  style={{ backgroundColor: colour }}
                />
              ))}
            </div>
            <span>{viewMode === 'plays' ? 'More' : 'Mainstream'}</span>
            <span className="ml-2 flex items-center gap-1.5">
              <span
                className="w-4 h-4 rounded-[3px] inline-block"
                style={{ backgroundColor: 'var(--surface-raised)' }}
              />
              no plays
            </span>
          </div>

          {/* Heatmap Grid - Scrollable on mobile */}
          <div className="relative">
            <div
              ref={calendarScrollRef}
              className="overflow-x-auto cursor-grab pb-2 palette-scrollbar"
            >
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${Math.ceil(heatmapData.length / 7)}, minmax(0, 1fr))`,
                  minWidth: '800px'
                }}
              >
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
            </div>

            {/* Tooltip */}
            {hoveredDay && hoveredDay.count > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 rounded-lg p-3 shadow-xl z-20 pointer-events-none bg-[var(--surface-raised)] border border-[var(--line)]"
                style={{ minWidth: '200px' }}
              >
                <p className="text-[var(--ink-primary)] mb-1">{hoveredDay.date}</p>
                <p className="text-[var(--ink-signal)] text-sm">
                  {hoveredDay.count} {hoveredDay.count === 1 ? 'play' : 'plays'}
                </p>
                {viewMode === 'popularity' && hoveredDay.avgPopularity !== undefined && (
                  <p className="text-[var(--ink-signal)] text-sm mt-1">
                    Avg Popularity: {hoveredDay.avgPopularity}/100
                    <span className="text-[var(--ink-muted)] ml-1">
                      ({hoveredDay.avgPopularity >= 70 ? 'Mainstream' : hoveredDay.avgPopularity >= 40 ? 'Mid-tier' : 'Niche'})
                    </span>
                  </p>
                )}
                {hoveredDay.topTrack && (
                  <div className="mt-2 pt-2 border-t border-[var(--line)]">
                    <p className="text-[var(--ink-muted)] text-xs mb-1">Last played</p>
                    <p className="text-[var(--ink-primary)] text-sm truncate">{hoveredDay.topTrack}</p>
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
          <p className="text-[var(--ink-muted)] text-sm">Loading listening history...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && heatmapData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[var(--ink-muted)]">No listening data available yet</p>
          <p className="text-[var(--ink-muted)] text-sm mt-1">Start listening to see your calendar fill up!</p>
        </div>
      )}
    </AnimatedCard>
  );
}