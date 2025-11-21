'use client';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { useMemo } from 'react';
import AnimatedCard from '@/components/AnimatedCard';

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
      <AnimatedCard opacity="bold" weight="medium">
        <div className="flex items-center justify-center h-32">
          <p className="text-[var(--color-text-secondary)]">Loading...</p>
        </div>
      </AnimatedCard>
    );
  }

  if (!plays.length) {
    return (
      <AnimatedCard opacity="bold" weight="medium">
        <AnimatedCard.Header
          title="On This Day"
          icon="📅"
          description={`No listening history for ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} yet`}
        />
      </AnimatedCard>
    );
  }

  return (
    <AnimatedCard opacity="bold" weight="medium">
      <AnimatedCard.Header
        title="On This Day"
        icon="📅"
        description={today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--color-bg-2)]/30 border border-[var(--color-border)]/20 rounded p-3">
          <p className="text-[var(--color-text-secondary)] text-xs mb-1">Total Plays</p>
          <p className="text-2xl font-bold text-[var(--color-vibrant-safe)]">{plays.length}</p>
        </div>
        <div className="bg-[var(--color-bg-2)]/30 border border-[var(--color-border)]/20 rounded p-3">
          <p className="text-[var(--color-text-secondary)] text-xs mb-1">Years</p>
          <p className="text-2xl font-bold text-[var(--color-vibrant-safe)]">{years.length}</p>
        </div>
        <div className="bg-[var(--color-bg-2)]/30 border border-[var(--color-border)]/20 rounded p-3">
          <p className="text-[var(--color-text-secondary)] text-xs mb-1">First Year</p>
          <p className="text-2xl font-bold text-[var(--color-vibrant-safe)]">{Math.min(...years)}</p>
        </div>
        <div className="bg-[var(--color-bg-2)]/30 border border-[var(--color-border)]/20 rounded p-3">
          <p className="text-[var(--color-text-secondary)] text-xs mb-1">Latest Year</p>
          <p className="text-2xl font-bold text-[var(--color-vibrant-safe)]">{Math.max(...years)}</p>
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-3">
        {highlightedPlays.map((play: any) => {
          const year = new Date(play.playedAt).getFullYear();
          const yearsAgo = today.getFullYear() - year;

          return (
            <div key={play.id} className="flex items-center gap-4">
              <img
                src={play.track.albumImage}
                alt={play.track.albumName}
                className="w-16 h-16 rounded border border-[var(--color-border)]/30"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[var(--color-text-primary)] truncate">
                  {play.track.name}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] truncate">
                  {play.track.artists?.map((a: any) => a.name).join(', ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[var(--color-vibrant-safe)]">{year}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {yearsAgo === 0 ? 'This year' : yearsAgo === 1 ? '1 year ago' : `${yearsAgo} years ago`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {plays.length > highlightedPlays.length && (
        <div className="mt-4 text-center">
          <p className="text-[var(--color-text-secondary)] text-sm">
	          + {plays.length - highlightedPlays.length} more {plays.length - highlightedPlays.length === 1 ? 'track' : 'tracks'} on this day
          </p>
        </div>
      )}
    </AnimatedCard>
  );
}
