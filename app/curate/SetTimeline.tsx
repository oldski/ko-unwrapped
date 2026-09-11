'use client';

import { useState } from 'react';
import { harmonicCompat } from '@/lib/curation/mix/compat';
import { useSequentialRamp } from '@/hooks/useChartPalette';
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
  const ramp = useSequentialRamp(5);

  const totalMs = set.reduce((s, t) => s + t.durationMs, 0);
  const usedIds = new Set(set.map((t) => t.trackId));
  const freeAlternates = alternates.filter((a) => !usedIds.has(a.trackId));

  if (set.length === 0) {
    return (
      <p className="text-sm text-[var(--ink-muted)]">
        Add a few seeds below, then build the set. It lands here as an energy
        arc you can reorder.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
        <p className="font-figure text-3xl text-[var(--ink-primary)]">
          {fmtDuration(totalMs)}
          <span className="ml-2 text-sm text-[var(--ink-muted)]">
            over {set.length} tracks
          </span>
        </p>
        <label
          className="flex items-center gap-2 text-xs text-[var(--ink-muted)] cursor-pointer select-none"
          title="Uncheck to see the order the generator returned"
        >
          <input type="checkbox" checked={smoothed} onChange={onToggleSmoothed} />
          Ordered for smooth mixing
        </label>
        <button
          onClick={onPush}
          disabled={pushDisabled}
          className="ml-auto rounded-lg px-4 py-1.5 text-sm font-semibold bg-[var(--surface-signal)] text-[var(--ink-on-signal)] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Push to Spotify
        </button>
      </div>

      {narrative && (
        <p className="text-xs text-[var(--ink-muted)] italic mb-3 max-w-3xl">{narrative}</p>
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
            className={`relative min-w-0 flex-1 overflow-hidden rounded-t-[4px] border transition-colors ${
              openSlot === i
                ? 'border-[var(--ink-signal)]'
                : 'border-transparent hover:border-[var(--ink-muted)]'
            }`}
            style={{
              height: `${25 + t.energy * 75}%`,
              // Energy drives height and step on the album ramp together, so a
              // loud track is both taller and brighter.
              backgroundColor: ramp[Math.min(ramp.length - 1, Math.floor(t.energy * ramp.length))],
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
              <span className="absolute top-1 left-1/2 -translate-x-1/2 rounded bg-[var(--ink-on-signal)] px-1 text-[9px] font-semibold text-[var(--ink-signal)]">
                new
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="mb-4 text-xs text-[var(--ink-muted)]">
        Taller and brighter means more energy. Drag a bar to move it, click one
        to swap or drop it.
      </p>

      {/* Slot detail panel */}
      {openSlot !== null && set[openSlot] && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 text-sm">
          <div className="flex items-center gap-3 mb-2">
            {set[openSlot].albumImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={set[openSlot].albumImageUrl!} alt="" className="w-10 h-10 rounded object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate font-semibold">
                {openSlot + 1}. {set[openSlot].trackName}
                {set[openSlot].source === 'discovery' && (
                  <span className="ml-2 align-middle rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--surface-signal)] text-[var(--ink-on-signal)]">New to you</span>
                )}
              </p>
              <p className="truncate text-xs text-[var(--ink-muted)]">
                {set[openSlot].artistNames.join(', ')}, energy {set[openSlot].energy.toFixed(2)}
                {set[openSlot].bpm != null && <>, {Math.round(set[openSlot].bpm!)} BPM</>}
                {set[openSlot].camelotKey && <> in {set[openSlot].camelotKey}</>}
              </p>
            </div>
            <button
              onClick={() => setSwapping(!swapping)}
              className="rounded-lg px-3 py-1 text-xs bg-[var(--surface-panel)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors"
            >
              Swap
            </button>
            <button
              onClick={() => {
                onRemove(openSlot);
                setOpenSlot(null);
              }}
              className="rounded-lg px-3 py-1 text-xs bg-[var(--surface-panel)] text-[var(--ink-muted)] hover:text-rose-400 transition-colors"
            >
              Remove
            </button>
          </div>
          <p className="text-xs text-[var(--ink-muted)]">
            {set[openSlot].placementNote || set[openSlot].reasons.join('; ') || 'Picked for sitting close to your seeds.'}
          </p>
          {(() => {
            const t = transitions.find((tr) => tr.fromIndex === openSlot - 1);
            const prev = openSlot > 0 ? set[openSlot - 1] : null;
            const cur = set[openSlot];
            const compat =
              prev && (prev.bpm != null || prev.camelotKey) && (cur.bpm != null || cur.camelotKey)
                ? harmonicCompat(
                    { bpm: prev.bpm, camelotKey: prev.camelotKey },
                    { bpm: cur.bpm, camelotKey: cur.camelotKey }
                  )
                : null;
            const chipClass =
              compat?.keyRelation === 'clash'
                ? 'bg-red-500/15 text-red-300'
                : compat?.keyRelation === 'energy-boost'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-emerald-500/15 text-emerald-300';
            const chipLabel = compat
              ? [
                  prev?.camelotKey && cur.camelotKey ? `${prev.camelotKey}→${cur.camelotKey}` : null,
                  compat.bpmDelta != null
                    ? `${compat.bpmDelta >= 0 ? '+' : ''}${compat.bpmDelta.toFixed(1)}%`
                    : null,
                ]
                  .filter(Boolean)
                  .join(', ')
              : null;
            if (!t && !chipLabel) return null;
            return (
              <p className="mt-1 text-xs text-[var(--ink-signal)]">
                {t && <>↪ transition in: {t.note}</>}
                {chipLabel && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${chipClass}`}>
                    ⚡ {chipLabel}
                  </span>
                )}
              </p>
            );
          })()}
          {swapping && (
            <ul className="mt-3 space-y-1 border-t border-[var(--line)] pt-2">
              {freeAlternates.slice(0, 5).map((a) => (
                <li key={a.trackId}>
                  <button
                    onClick={() => {
                      onSwap(openSlot, a);
                      setSwapping(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--surface-panel)] text-left"
                  >
                    <span className="flex-1 min-w-0 truncate text-xs">
                      {a.trackName} — {a.artistNames.join(', ')}
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)]">
                      {a.score != null ? `score ${a.score.toFixed(2)}` : 'new'}, energy {a.energy.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
              {freeAlternates.length === 0 && (
                <li className="text-xs text-[var(--ink-muted)]">no alternates left — regenerate</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
