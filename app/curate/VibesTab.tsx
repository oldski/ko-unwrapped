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
            className={`px-2.5 py-1 rounded-full text-xs transition ${
              selected.includes(tag)
                ? 'bg-[var(--color-vibrant-safe)] text-black'
                : 'bg-white/5 hover:bg-white/15'
            }`}
          >
            {tag} <span className="opacity-50">{count}</span>
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)] mb-2">
            Top tracks matching {selected.join(' + ')}
          </p>
          {matches.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)]">No tracks carry all selected tags.</p>
          )}
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {matches.map((t) => (
              <li key={t.trackId}>
                <button
                  onClick={() => onAddSeed(t)}
                  disabled={seedIds.has(t.trackId)}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 transition text-left"
                >
                  {t.albumImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.albumImageUrl} alt="" className="w-9 h-9 rounded object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded bg-white/10" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm">{t.trackName}</span>
                    <span className="block truncate text-xs text-[var(--color-text-secondary)]">
                      {t.artistNames.join(', ')}
                    </span>
                  </span>
                  <span className="text-[var(--color-vibrant-safe)] text-lg leading-none">⊕</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
