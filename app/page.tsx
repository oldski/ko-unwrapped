'use client';

import OnThisDay from '@/components/OnThisDay';
import AnimatedCard from '@/components/AnimatedCard';
import Link from 'next/link';
import useSWR from 'swr';
import fetcher from '@/lib/fetcher';
import { useMemo, useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { ScrollTrigger } from '@/lib/gsap';

export default function Home() {
  // Refs for GSAP animations
  const statsCardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const onThisDayRef = useRef<HTMLDivElement>(null);
  const quickLinksRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const mainRef = useRef<HTMLElement>(null);
  const quickLinksAnimatedRef = useRef(false);

  // Fetch recent stats for quick insights
  const { data: historyData } = useSWR('/api/stats/history?limit=100', fetcher);
  const { data: streakData } = useSWR('/api/stats/history?limit=10000', fetcher);

  const history = historyData?.data || [];

  // Calculate quick stats
  const quickStats = useMemo(() => {
    if (history.length === 0) return null;

    // Unique artists count
    const uniqueArtists = new Set();
    history.forEach((play: any) => {
      play.track.artists?.forEach((artist: any) => {
        uniqueArtists.add(artist.name);
      });
    });

    // Calculate listening streak
    const datesWithPlays = new Set<string>();
    if (streakData?.data) {
      streakData.data.forEach((play: any) => {
        const date = new Date(play.playedAt).toISOString().split('T')[0];
        datesWithPlays.add(date);
      });
    }

    let currentStreak = 0;
    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateStr = checkDate.toISOString().split('T')[0];

      if (datesWithPlays.has(checkDateStr)) {
        currentStreak++;
      } else if (i > 1) {
        break;
      }
    }

    return {
      recentPlays: history.length,
      uniqueArtists: uniqueArtists.size,
      currentStreak,
    };
  }, [history, streakData]);

  // GSAP Animations
  useEffect(() => {
    if (!quickStats) return;

    const ctx = gsap.context(() => {
      // Set initial states immediately (before ScrollTrigger)
      // 1. Stats Cards - DRAMATIC directional stagger with rotation
      if (statsCardsRef.current.length > 0) {
        const directions = [
          { x: -250, y: 0, rotation: -15 },    // Left with rotation
          { x: 0, y: 200, rotation: 0 },       // Bottom
          { x: 250, y: 0, rotation: 15 },      // Right with rotation
        ];

        statsCardsRef.current.forEach((card, index) => {
          if (!card) return;

          const direction = directions[index] || { x: 0, y: 0, rotation: 0 };

          // Set initial state - DRAMATIC
          gsap.set(card, {
            opacity: 0,
            x: direction.x,
            y: direction.y,
            scale: 0.6,
            rotation: direction.rotation,
          });

          // Animate in - DRAMATIC with overshoot
          gsap.to(card, {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            duration: 1.2,
            delay: index * 0.2,
            ease: 'back.out(1.7)', // Bouncy overshoot
            scrollTrigger: {
              trigger: card,
              start: 'top 85%',
              toggleActions: 'play none none reverse',
            },
          });
        });
      }

      // 2. OnThisDay - DRAMATIC bloom from center
      if (onThisDayRef.current) {
        gsap.set(onThisDayRef.current, {
          opacity: 0,
          scale: 0.5,
          rotationY: 90, // 3D flip effect
        });

        gsap.to(onThisDayRef.current, {
          opacity: 1,
          scale: 1,
          rotationY: 0,
          duration: 1.4,
          ease: 'back.out(1.4)', // Bouncy entrance
          scrollTrigger: {
            trigger: onThisDayRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      }

      // 3. Quick Links - DRAMATIC sequential pop-in with rotation
      if (quickLinksRef.current.length > 0 && !quickLinksAnimatedRef.current) {
        const validLinks = quickLinksRef.current.filter(link => link !== null);

        if (validLinks.length > 0) {
          quickLinksAnimatedRef.current = true;

          // Set initial hidden state
          gsap.set(validLinks, {
            opacity: 0,
            y: 150,
            scale: 0.5,
            rotation: -20,
          });

          // Animate in after a delay (simpler approach - always animate)
          gsap.to(validLinks, {
            opacity: 1,
            y: 0,
            scale: 1,
            rotation: 0,
            duration: 1,
            delay: 1.5, // Wait for other animations to settle
            stagger: 0.15,
            ease: 'elastic.out(1, 0.6)',
          });
        }
      }

      // 4. DRAMATIC parallax on scroll for main content
      if (mainRef.current) {
        const sections = mainRef.current.querySelectorAll('.parallax-section');
        sections.forEach((section, index) => {
          // Alternating parallax depths for more dynamic movement
          const yMovement = index % 2 === 0 ? -120 : -80;

          gsap.to(section, {
            y: yMovement,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.5, // Slightly slower scrub for smoother feel
            },
          });
        });
      }
      // Refresh ScrollTrigger after all animations are set up
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 150);
    });

    return () => {
      ctx.revert();
    };
  }, [quickStats]);

  return (
    <main ref={mainRef} className="w-screen min-h-screen overflow-x-hidden pt-[60vh] md:pt-[70vh] pb-20">
      {/* Hero/NowPlaying is handled by layout.tsx */}

      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8">
        {/* Quick Stats Cards */}
        {quickStats && (
          <div className="flex flex-col gap-4 md:gap-6 parallax-section">
            <Link href="/stats" className="group w-full">
              <div ref={(el) => { statsCardsRef.current[0] = el; }}>
                <AnimatedCard opacity="bold" weight="medium" className="hover:scale-105 transition-transform">
                  <AnimatedCard.Stat
                    label="Recent Plays"
                    value={quickStats.recentPlays}
                    trend="View full history →"
                  />
                </AnimatedCard>
              </div>
            </Link>

            <Link href="/insights" className="group w-full">
              <div ref={(el) => { statsCardsRef.current[2] = el; }}>
                <AnimatedCard opacity="bold" weight="medium" className="hover:scale-105 transition-transform">
                  <AnimatedCard.Stat
                    label="Current Streak"
                    value={quickStats.currentStreak}
                    trend="See insights →"
                    icon={quickStats.currentStreak >= 3 ? '🔥' : '🎵'}
                  />
                </AnimatedCard>
              </div>
            </Link>

            <Link href="/artists" className="group w-full">
              <div ref={(el) => { statsCardsRef.current[1] = el; }}>
                <AnimatedCard opacity="bold" weight="medium" className="hover:scale-105 transition-transform min-h-[400px] flex flex-col justify-between">
                  <AnimatedCard.Stat
                    label="Artists Explored"
                    value={quickStats.uniqueArtists}
                    trend="Discover more →"
                  />
                  {/* Space for future images/content */}
                  <div className="mt-4 flex-grow flex items-end justify-end opacity-20">
                    <p className="text-xs text-[var(--color-text-secondary)]">✨ Coming soon...</p>
                  </div>
                </AnimatedCard>
              </div>
            </Link>
          </div>
        )}

        {/* On This Day Feature */}
        <div ref={onThisDayRef} className="parallax-section" style={{ perspective: '1000px' }}>
          <OnThisDay />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 parallax-section">
          <Link
            href="/insights"
            className="group"
            ref={(el) => { quickLinksRef.current[0] = el; }}
          >
            <div className="bg-gray-900/30 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:bg-gray-900/50 transition-all hover:border-cyan-500/50 text-center">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-[var(--color-text-primary)] font-semibold group-hover:text-cyan-400 transition-colors">Insights</p>
              <p className="text-[var(--color-text-secondary)]/70 text-xs mt-1">Calendar & Trends</p>
            </div>
          </Link>

          <Link
            href="/stats"
            className="group"
            ref={(el) => { quickLinksRef.current[1] = el; }}
          >
            <div className="bg-gray-900/30 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:bg-gray-900/50 transition-all hover:border-cyan-500/50 text-center">
              <div className="text-3xl mb-2">🎧</div>
              <p className="text-[var(--color-text-primary)] font-semibold group-hover:text-cyan-400 transition-colors">Stats</p>
              <p className="text-[var(--color-text-secondary)]/70 text-xs mt-1">Listening Patterns</p>
            </div>
          </Link>

          <Link
            href="/taste-profile"
            className="group"
            ref={(el) => { quickLinksRef.current[2] = el; }}
          >
            <div className="bg-gray-900/30 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:bg-gray-900/50 transition-all hover:border-cyan-500/50 text-center">
              <div className="text-3xl mb-2">🎵</div>
              <p className="text-[var(--color-text-primary)] font-semibold group-hover:text-cyan-400 transition-colors">Taste</p>
              <p className="text-[var(--color-text-secondary)]/70 text-xs mt-1">Your Profile</p>
            </div>
          </Link>

          <Link
            href="/audio-features"
            className="group"
            ref={(el) => { quickLinksRef.current[3] = el; }}
          >
            <div className="bg-gray-900/30 backdrop-blur-md border border-gray-700/50 rounded-xl p-6 hover:bg-gray-900/50 transition-all hover:border-cyan-500/50 text-center">
              <div className="text-3xl mb-2">🎚️</div>
              <p className="text-[var(--color-text-primary)] font-semibold group-hover:text-cyan-400 transition-colors">Features</p>
              <p className="text-[var(--color-text-secondary)]/70 text-xs mt-1">Audio Analysis</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
