'use client';

import { useEffect, useState } from 'react';
import type { TrackHit } from './types';

export default function SearchTab({
  onAddSeed,
  seedIds,
}: {
  onAddSeed: (t: TrackHit) => void;
  seedIds: Set<string>;
}) {
  const [q, setQ] = useState('');
  const [shelf, setShelf] = useState<'most-played' | 'recent'>('most-played');
  const [hits, setHits] = useState<TrackHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = q.trim()
          ? `/api/curation/tracks?q=${encodeURIComponent(q.trim())}`
          : `/api/curation/tracks?shelf=${shelf}`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (data.success) setHits(data.tracks);
      } catch {
        /* aborted or network error — keep previous hits */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q, shelf]);

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your library by track or artist"
          className="flex-1 px-4 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-raised)] outline-none focus:border-[var(--ink-signal)] text-sm"
        />
        {(['most-played', 'recent'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setQ('');
              setShelf(s);
            }}
            className={`px-3 py-2 rounded-lg text-xs transition-colors ${
              !q && shelf === s ? 'bg-[var(--surface-signal)] text-[var(--ink-on-signal)]' : 'bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            {s === 'most-played' ? 'Most played' : 'Recent'}
          </button>
        ))}
      </div>
      {loading && hits.length === 0 && (
        <p className="text-sm text-[var(--ink-muted)]">Loading…</p>
      )}
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
        {hits.map((t) => (
          <li key={t.trackId}>
            <button
              onClick={() => onAddSeed(t)}
              disabled={seedIds.has(t.trackId)}
              className="group w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-raised)] disabled:opacity-40 transition-colors text-left"
            >
              {t.albumImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.albumImageUrl} alt="" className="w-9 h-9 rounded object-cover" />
              ) : (
                <div className="w-9 h-9 rounded bg-[var(--surface-raised)]" />
              )}
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm">{t.trackName}</span>
                <span className="block truncate text-xs text-[var(--ink-muted)]">
                  {t.artistNames.join(', ')}, {t.plays} plays
                </span>
              </span>
              <span className="shrink-0 text-xs text-[var(--ink-signal)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {seedIds.has(t.trackId) ? 'Added' : 'Add'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
