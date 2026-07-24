'use client';

import { useCallback, useState } from 'react';
import { energyFromTags } from '@/lib/curation/energy';
import type { Filters, SetTrack, TrackHit } from './types';
import { DEFAULT_FILTERS } from './types';
import SeedTray from './SeedTray';
import SearchTab from './SearchTab';
import VibesTab from './VibesTab';
import SessionsTab from './SessionsTab';
import ShapeTab from './ShapeTab';

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
    try {
      const res = await fetch('/api/curation/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedTrackIds: seeds.map((s) => s.trackId),
          durationTargetMs: [
            filters.durationMinMinutes * 60_000,
            filters.durationMaxMinutes * 60_000,
          ],
          popularityRange: [filters.popularityMin, filters.popularityMax],
          ...(filters.genreAllow.length ? { genreAllow: filters.genreAllow } : {}),
          ...(filters.genreDeny.length ? { genreDeny: filters.genreDeny } : {}),
          excludeTrackIds: excluded,
          alternatesCount: 15,
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
      setAlternates(data.alternates.map(withEnergy));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }, [seeds, filters, excluded]);

  return (
    <div className="min-h-screen text-white p-6 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <header className="flex items-baseline justify-between">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Curate<span className="text-[var(--color-vibrant-safe)]">.</span>
          </h1>
          <span className="text-xs text-[var(--color-text-secondary)]">{displayName}</span>
        </header>

        {/* The Set — timeline lands here in Task 13 */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 min-h-40">
          {set.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">
              The set will appear here. Pick seeds below and hit Generate.
            </p>
          ) : (
            <ul className="text-sm space-y-1">
              {set.map((t, i) => (
                <li key={t.trackId} className="truncate">
                  {i + 1}. {t.trackName} — {t.artistNames.join(', ')}
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </section>

        <SeedTray seeds={seeds} onRemove={removeSeed} onGenerate={generate} generating={generating} />

        <nav className="flex gap-1">
          {(['search', 'vibes', 'sessions', 'shape'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-t-lg text-sm capitalize transition ${
                tab === t ? 'bg-white/10 text-white' : 'text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <section className="rounded-2xl rounded-tl-none bg-white/5 border border-white/10 p-4 min-h-64">
          {tab === 'search' && (
            <SearchTab onAddSeed={addSeed} seedIds={new Set(seeds.map((s) => s.trackId))} />
          )}
          {tab === 'vibes' && (
            <VibesTab onAddSeed={addSeed} seedIds={new Set(seeds.map((s) => s.trackId))} />
          )}
          {tab === 'sessions' && <SessionsTab onSeedFromSession={seedFromSession} />}
          {tab === 'shape' && <ShapeTab filters={filters} onChange={setFilters} />}
        </section>
      </div>
    </div>
  );
}
