'use client';

import { useState } from 'react';
import type { SetTrack, Transition } from './types';

function fmtDuration(ms: number): string {
  const m = Math.floor(ms / 60000);
  return `${m} min`;
}

export default function SetTimeline({
  set,
  alternates,
  smoothed,
  onToggleSmoothed,
  onReorder,
  onRemove,
  onSwap,
  onPush,
  pushDisabled,
  transitions,
  narrative,
}: {
  set: SetTrack[];
  alternates: SetTrack[];
  smoothed: boolean;
  onToggleSmoothed: () => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onSwap: (index: number, replacement: SetTrack) => void;
  onPush: () => void;
  pushDisabled: boolean;
  transitions: Transition[];
  narrative: string;
}) {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const totalMs = set.reduce((s, t) => s + t.durationMs, 0);
  const usedIds = new Set(set.map((t) => t.trackId));
  const freeAlternates = alternates.filter((a) => !usedIds.has(a.trackId));

  if (set.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        The set will appear here. Pick seeds below and hit Generate.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
          The set · {fmtDuration(totalMs)} · {set.length} tracks
        </span>
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input type="checkbox" checked={smoothed} onChange={onToggleSmoothed} />
          smooth transitions
        </label>
        <button
          onClick={onPush}
          disabled={pushDisabled}
          className="ml-auto px-4 py-1.5 rounded-full text-sm font-semibold bg-[var(--color-primary)] text-black disabled:opacity-40 hover:opacity-90 transition"
        >
          Push to Spotify
        </button>
      </div>

      {narrative && (
        <p className="text-xs text-[var(--color-text-secondary)] italic mb-3 max-w-3xl">{narrative}</p>
      )}

      {/* Energy arc timeline */}
      <div className="flex items-end gap-1 h-36 mb-2">
        {set.map((t, i) => (
          <button
            key={t.trackId}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null && dragIndex !== i) onReorder(dragIndex, i);
              setDragIndex(null);
            }}
            onClick={() => {
              setOpenSlot(openSlot === i ? null : i);
              setSwapping(false);
            }}
            className={`flex-1 min-w-0 rounded-t-lg border transition relative overflow-hidden ${
              openSlot === i
                ? 'border-[var(--color-vibrant-safe)]'
                : 'border-white/10 hover:border-white/40'
            }`}
            style={{
              height: `${25 + t.energy * 75}%`,
              backgroundColor: `color-mix(in srgb, var(--color-primary) ${Math.round(
                15 + t.energy * 60
              )}%, transparent)`,
            }}
            title={`${t.trackName} — ${t.artistNames.join(', ')}`}
          >
            {t.albumImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.albumImageUrl}
                alt=""
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-7 rounded object-cover opacity-90"
              />
            )}
            {t.source === 'discovery' && (
              <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] px-1 rounded bg-[var(--color-vibrant-safe)] text-black font-bold">
                new
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-[var(--color-text-secondary)] mb-3">
        bar height = energy · drag bars to reorder · click a bar for actions
      </p>

      {/* Slot detail panel */}
      {openSlot !== null && set[openSlot] && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm">
          <div className="flex items-center gap-3 mb-2">
            {set[openSlot].albumImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={set[openSlot].albumImageUrl!} alt="" className="w-10 h-10 rounded object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold">
                {openSlot + 1}. {set[openSlot].trackName}
                {set[openSlot].source === 'discovery' && (
                  <span className="ml-2 text-[10px] align-middle px-1.5 py-0.5 rounded bg-[var(--color-vibrant-safe)] text-black font-bold">NEW TO YOU</span>
                )}
              </p>
              <p className="truncate text-xs text-[var(--color-text-secondary)]">
                {set[openSlot].artistNames.join(', ')} · energy {set[openSlot].energy.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => setSwapping(!swapping)}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs transition"
            >
              swap ⇄
            </button>
            <button
              onClick={() => {
                onRemove(openSlot);
                setOpenSlot(null);
              }}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-red-500/40 text-xs transition"
            >
              remove ✕
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {set[openSlot].placementNote || set[openSlot].reasons.join('; ') || 'seed-adjacent pick'}
          </p>
          {(() => {
            const t = transitions.find((tr) => tr.fromIndex === openSlot - 1);
            return t ? (
              <p className="mt-1 text-xs text-[var(--color-primary)]">↪ transition in: {t.note}</p>
            ) : null;
          })()}
          {swapping && (
            <ul className="mt-3 space-y-1 border-t border-white/10 pt-2">
              {freeAlternates.slice(0, 5).map((a) => (
                <li key={a.trackId}>
                  <button
                    onClick={() => {
                      onSwap(openSlot, a);
                      setSwapping(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/10 text-left"
                  >
                    <span className="flex-1 min-w-0 truncate text-xs">
                      {a.trackName} — {a.artistNames.join(', ')}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-secondary)]">
                      {a.score != null ? `score ${a.score.toFixed(2)}` : 'new'} · energy {a.energy.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
              {freeAlternates.length === 0 && (
                <li className="text-xs text-[var(--color-text-secondary)]">no alternates left — regenerate</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
