'use client';

import CalendarHeatmap from "@/components/CalendarHeatmap";
import TasteEvolution from "@/components/TasteEvolution";
import OnThisDay from "@/components/OnThisDay";
import ListeningStreaks from "@/components/ListeningStreaks";
import ExportData from "@/components/ExportData";
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Section rule. Carries the section's rank rather than decorating it: the
 * label sits on a hairline that runs to the edge of the column, so scanning
 * down the page reads as a contents list.
 */
const SectionRule = ({ label, note }: { label: string; note?: string }) => (
  <div className="flex items-baseline gap-4 mb-4">
    <h2 className="font-display text-sm text-[var(--ink-signal)] shrink-0">{label}</h2>
    <span className="h-px flex-1 bg-[var(--line)]" aria-hidden />
    {note && <span className="text-xs text-[var(--ink-muted)] shrink-0">{note}</span>}
  </div>
);

export default function InsightsPage() {
  const reduceMotion = useReducedMotion();

  // One orchestrated entrance, on the masthead only. Staggering every section
  // on scroll is the default treatment and makes the page feel like it is
  // assembling itself rather than already being there.
  const enter = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: -12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <div className="min-h-screen p-8 text-[var(--ink-primary)]">
      <div className="max-w-7xl">
        <motion.header {...enter} className="mb-12 pt-14 md:pt-0 md:pr-82">
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl text-[var(--ink-primary)]">
            Your listening, in detail
          </h1>
          <p className="text-[var(--ink-muted)] mt-3 max-w-[52ch]">
            A year of plays, the shape of the habit, and what your taste has been
            drifting toward.
          </p>
        </motion.header>

        <div className="space-y-14">
          <section>
            <SectionRule label="The year" note="last 365 days" />
            <CalendarHeatmap />
          </section>

          <section>
            <SectionRule label="Drift" note="12 months" />
            <TasteEvolution months={12} />
          </section>

          {/* Deliberately uneven: the streaks panel is the denser read, so it
              takes the wider column instead of splitting the row in half. */}
          <section>
            <SectionRule label="Patterns" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <OnThisDay />
              </div>
              <div className="lg:col-span-7">
                <ListeningStreaks />
              </div>
            </div>
          </section>

          {process.env.NODE_ENV === 'development' && (
            <section>
              <SectionRule label="Export" note="development only" />
              <ExportData />
            </section>
          )}
        </div>

        <footer className="mt-16 pt-6 border-t border-[var(--line)]">
          <p className="text-xs text-[var(--ink-muted)]">
            Your listening history lives in your own database. Nothing here is shared.
          </p>
        </footer>
      </div>
    </div>
  );
}
