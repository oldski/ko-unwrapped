'use client';

import { useEffect, useState } from 'react';
import type { TrackHit } from './types';

interface TagCount {
  tag: string;
  count: number;
}

export default function VibesTab({
  onAddSeed,
  seedIds,
}: {
  onAddSeed: (t: TrackHit) => void;
  seedIds: Set<string>;
}) {
  const [tags, setTags] = useState<TagCount[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [matches, setMatches] = useState<TrackHit[]>([]);

  useEffect(() => {
    fetch('/api/curation/vibes')
      .then((r) => r.json())
      .then((d) => d.success && setTags(d.tags));
  }, []);

  useEffect(() => {
    if (selected.length === 0) {
      setMatches([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/curation/tracks?tags=${encodeURIComponent(selected.join(','))}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => d.success && setMatches(d.tracks))
      .catch(() => {});
    return () => controller.abort();
  }, [selected]);

  const toggle = (tag: string) =>
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4 max-h-40 overflow-y-auto">
        {tags.map(({ tag, count }) => (
          <button
            key={tag}
            onClick={() => toggle(tag)}
            className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
              selected.includes(tag)
                ? 'bg-[var(--surface-signal)] text-[var(--ink-on-signal)]'
                : 'bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
            }`}
          >
            {tag} <span className="opacity-50">{count}</span>
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <>
          <p className="text-xs text-[var(--ink-muted)] mb-2">
            Top tracks matching {selected.join(' + ')}
          </p>
          {matches.length === 0 && (
            <p className="text-sm text-[var(--ink-muted)]">Nothing carries all of those tags. Drop one to widen it.</p>
          )}
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {matches.map((t) => (
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
                      {t.artistNames.join(', ')}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-[var(--ink-signal)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {seedIds.has(t.trackId) ? 'Added' : 'Add'}
              </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
