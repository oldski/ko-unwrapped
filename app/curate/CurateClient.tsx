'use client';

import { useCallback, useState } from 'react';
import { energyFromTags } from '@/lib/curation/energy';
import { smoothTransitions } from '@/lib/curation/smoothTransitions';
import type { Filters, Preset, SetTrack, TrackHit, Transition } from './types';
import { DEFAULT_FILTERS } from './types';
import SeedTray from './SeedTray';
import SearchTab from './SearchTab';
import VibesTab from './VibesTab';
import SessionsTab from './SessionsTab';
import ShapeTab from './ShapeTab';
import SetTimeline from './SetTimeline';
import PushDialog from './PushDialog';
import SectionRule from '@/components/Interface/SectionRule';

type Tab = 'search' | 'vibes' | 'sessions' | 'shape';

export default function CurateClient({ displayName }: { displayName: string }) {
  const [tab, setTab] = useState<Tab>('search');
  const [seeds, setSeeds] = useState<TrackHit[]>([]);
  const [set, setSet] = useState<SetTrack[]>([]);
  const [alternates, setAlternates] = useState<SetTrack[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset>('balanced');
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [narrative, setNarrative] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string | null>(null);

  const addSeed = useCallback((t: TrackHit) => {
    setSeeds((prev) => (prev.some((s) => s.trackId === t.trackId) ? prev : [...prev, t]));
  }, []);

  const removeSeed = useCallback((trackId: string) => {
    setSeeds((prev) => prev.filter((s) => s.trackId !== trackId));
  }, []);

  const seedFromSession = useCallback(async (trackIds: string[]) => {
    // Sessions give us ids+names only; fetch full TrackHit rows via the shelf
    // endpoint would over-fetch, so hydrate from the tracks we already have or
    // fall back to a minimal hit.
    const res = await fetch(`/api/curation/tracks?shelf=most-played`);
    const data = await res.json();
    const byId = new Map<string, TrackHit>(
      (data.success ? (data.tracks as TrackHit[]) : []).map((t) => [t.trackId, t])
    );
    setSeeds((prev) => {
      const next = [...prev];
      for (const id of trackIds) {
        if (next.some((s) => s.trackId === id)) continue;
        const hit = byId.get(id);
        next.push(
          hit ?? {
            trackId: id,
            spotifyTrackId: '',
            trackName: 'From session',
            artistNames: [],
            durationMs: 0,
            albumImageUrl: null,
            popularity: null,
            plays: 0,
          }
        );
      }
      return next;
    });
  }, []);

  const generate = useCallback(async () => {
    if (seeds.length === 0) return;
    setGenerating(true);
    setError(null);
    setFallbackNotice(null);
    setProgressStage('finding candidates…');
    const stages = ['discovering new music…', 'sequencing the set…'];
    const timers = stages.map((s, i) => setTimeout(() => setProgressStage(s), 4000 * (i + 1)));
    try {
      const res = await fetch('/api/curation/agent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedTrackIds: seeds.map((s) => s.trackId),
          preset,
          durationTargetMs: [
            filters.durationMinMinutes * 60_000,
            filters.durationMaxMinutes * 60_000,
          ],
          popularityRange: [filters.popularityMin, filters.popularityMax],
          ...(filters.genreAllow.length ? { genreAllow: filters.genreAllow } : {}),
          ...(filters.genreDeny.length ? { genreDeny: filters.genreDeny } : {}),
          excludeTrackIds: excluded,
        }),
      });
      if (res.status === 401) {
        window.location.href = '/api/auth/login';
        return;
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Generation failed');
      const withEnergy = (t: Omit<SetTrack, 'energy'>): SetTrack => ({
        ...t,
        energy: energyFromTags(t.tags),
      });
      setSet(data.tracks.map(withEnergy));
      setAlternates((data.alternates ?? []).map(withEnergy));
      setTransitions(data.transitions ?? []);
      setNarrative(data.narrative ?? '');
      if (data.mode === 'fallback') {
        setFallbackNotice('The set director was unavailable, so this set was sequenced the classic way.');
      }
      setSmoothed(false);
      setBaseOrder([]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      timers.forEach(clearTimeout);
      setProgressStage(null);
      setGenerating(false);
    }
  }, [seeds, filters, excluded, preset]);

  const [smoothed, setSmoothed] = useState(false);
  const [baseOrder, setBaseOrder] = useState<SetTrack[]>([]);

  const toggleSmoothed = useCallback(() => {
    setSmoothed((prev) => {
      const next = !prev;
      if (next) {
        setBaseOrder(set);
        setSet(smoothTransitions(set));
      } else {
        // baseOrder is kept in sync with any swaps made while smoothed was on
        // (see swapInSet, which mirrors each swap into baseOrder), so this
        // filter never drops a track that was swapped in during smoothing.
        setSet(baseOrder.filter((t) => set.some((s) => s.trackId === t.trackId)));
      }
      return next;
    });
  }, [set, baseOrder]);

  const reorder = useCallback((from: number, to: number) => {
    setSet((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const removeFromSet = useCallback((index: number) => {
    setSet((prev) => {
      const removed = prev[index];
      setExcluded((ex) => [...ex, removed.trackId]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const swapInSet = useCallback(
    (index: number, replacement: SetTrack) => {
      const outgoing = set[index];
      if (!outgoing) return;
      setBaseOrder((base) =>
        base.map((t) => (t.trackId === outgoing.trackId ? replacement : t))
      );
      setSet((prev) => prev.map((t, i) => (i === index ? replacement : t)));
    },
    [set]
  );

  const [pushOpen, setPushOpen] = useState(false);

  const sourceTabs: { id: Tab; label: string; hint: string }[] = [
    { id: 'search', label: 'Search', hint: 'your whole library' },
    { id: 'vibes', label: 'Vibes', hint: 'by mood and tag' },
    { id: 'sessions', label: 'Sessions', hint: 'listens that hung together' },
    { id: 'shape', label: 'Shape', hint: 'tempo, key, era' },
  ];

  return (
    <div className="min-h-screen p-6 md:p-8 text-[var(--ink-primary)]">
      {/*
        Two columns, not one stack.
        
        The page does two jobs — build the set, and feed it — and used to give
        them identical weight in a vertical run of equal boxes. The set is the
        thing you judge, so it takes the wider column; the sources sit beside
        it. On one column the order still puts the set first.
      */}
      <div className="max-w-7xl">
        <header className="masthead mb-8 pt-14 md:pt-0 md:pr-82">
          <h1 className="font-display text-4xl sm:text-5xl text-[var(--ink-primary)]">
            Build a set
          </h1>
          <p className="text-[var(--ink-muted)] mt-2 max-w-[52ch]">
            Pick a few tracks to anchor it, then let the rest fall in around them,
            mixed in key and in tempo.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* The set */}
          <div className="lg:col-span-7 min-w-0">
            <SectionRule
              label="The set"
              note={set.length > 0 ? `${set.length} tracks` : 'nothing yet'}
            />

            <SetTimeline
              set={set}
              alternates={alternates}
              smoothed={smoothed}
              onToggleSmoothed={toggleSmoothed}
              onReorder={reorder}
              onRemove={removeFromSet}
              onSwap={swapInSet}
              onPush={() => setPushOpen(true)}
              pushDisabled={set.length === 0}
              transitions={transitions}
              narrative={narrative}
            />

            {error && (
              <p className="mt-3 text-sm text-rose-400">{error}</p>
            )}

            <div className="mt-8">
              <SectionRule label="Seeds" note="what the set is built around" />
              <SeedTray
                seeds={seeds}
                onRemove={removeSeed}
                onGenerate={generate}
                generating={generating}
                preset={preset}
                onPresetChange={setPreset}
                progressLabel={progressStage}
              />
            </div>

            {fallbackNotice && (
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--ink-muted)]">
                <span className="flex-1">{fallbackNotice}</span>
                <button
                  onClick={() => setFallbackNotice(null)}
                  className="shrink-0 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Where tracks come from */}
          <div className="lg:col-span-5 min-w-0">
            <SectionRule label="Add tracks" />

            {/*
              A plain row of choices rather than the browser-tab strip this had.
              The strip implied the panel below was a different document each
              time; it is one panel with four ways of filling it.
            */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {sourceTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  aria-pressed={tab === t.id}
                  title={t.hint}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    tab === t.id
                      ? 'bg-[var(--surface-signal)] text-[var(--ink-on-signal)]'
                      : 'bg-[var(--surface-panel)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-raised)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-panel)] p-4">
              {tab === 'search' && (
                <SearchTab onAddSeed={addSeed} seedIds={new Set(seeds.map((s) => s.trackId))} />
              )}
              {tab === 'vibes' && (
                <VibesTab onAddSeed={addSeed} seedIds={new Set(seeds.map((s) => s.trackId))} />
              )}
              {tab === 'sessions' && <SessionsTab onSeedFromSession={seedFromSession} />}
              {tab === 'shape' && <ShapeTab filters={filters} onChange={setFilters} />}
            </div>
          </div>
        </div>

        <footer className="mt-12 pt-6 border-t border-[var(--line)] flex items-baseline justify-between gap-4">
          <p className="text-xs text-[var(--ink-muted)]">
            Tempo and key data by{' '}
            <a
              href="https://getsongbpm.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-[var(--ink-primary)]"
            >
              GetSongBPM
            </a>
          </p>
          <span className="text-xs text-[var(--ink-muted)]">{displayName}</span>
        </footer>

        {pushOpen && (
          <PushDialog
            set={set}
            defaultDescription={narrative || 'Curated with oldski unwrapped'}
            onClose={() => setPushOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
