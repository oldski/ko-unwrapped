'use client';

import { useState } from 'react';
import type { SetTrack } from './types';

export default function PushDialog({
  set,
  onClose,
}: {
  set: SetTrack[];
  onClose: () => void;
}) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const [name, setName] = useState(`oldski set — ${today}`);
  const [state, setState] = useState<'idle' | 'pushing' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<string>('');

  const push = async () => {
    setState('pushing');
    try {
      const res = await fetch('/api/curation/playlist/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: 'Curated with oldski unwrapped',
          spotifyTrackIds: set.map((t) => t.spotifyTrackId),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'push failed');
      setResult(data.playlistUrl);
      setState('done');
    } catch (e: any) {
      setResult(e.message);
      setState('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Push to Spotify</h2>
        {state === 'done' ? (
          <div className="text-center">
            <p className="mb-4 text-sm">
              Playlist created with {set.length} tracks.
            </p>
            <a
              href={result}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-5 py-2 rounded-full bg-[var(--color-vibrant-safe)] text-black font-semibold hover:opacity-90 transition"
            >
              Open in Spotify ↗
            </a>
          </div>
        ) : (
          <>
            <label className="block mb-4">
              <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
                Playlist name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[var(--color-primary)] outline-none text-sm"
              />
            </label>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              {set.length} tracks · private playlist on your account
            </p>
            {state === 'error' && (
              <p className="text-sm text-red-400 mb-3">Failed: {result}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={push}
                disabled={state === 'pushing' || !name.trim()}
                className="px-5 py-2 rounded-full bg-[var(--color-primary)] text-black font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition"
              >
                {state === 'pushing' ? 'Pushing…' : state === 'error' ? 'Retry' : 'Create playlist'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
