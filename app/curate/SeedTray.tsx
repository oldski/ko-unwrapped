'use client';

import type { Preset, TrackHit } from './types';

export default function SeedTray({
  seeds,
  onRemove,
  onGenerate,
  generating,
  preset,
  onPresetChange,
  progressLabel,
}: {
  seeds: TrackHit[];
  onRemove: (trackId: string) => void;
  onGenerate: () => void;
  generating: boolean;
  preset: Preset;
  onPresetChange: (p: Preset) => void;
  progressLabel?: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/*
        Seeds read as a row of records you have pulled, not as buttons. The
        whole chip removes on click, so the cross is a marker rather than a
        separate control.
      */}
      <div className="flex flex-wrap items-center gap-2">
        {seeds.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">
            Nothing yet. Add tracks from the right to anchor the set.
          </p>
        ) : (
          seeds.map((s) => (
            <button
              key={s.trackId}
              onClick={() => onRemove(s.trackId)}
              className="group flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-panel)] py-1 pl-1 pr-2.5 text-sm transition-colors hover:border-[var(--ink-signal)]"
              title={`Remove ${s.trackName}`}
            >
              {s.albumImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.albumImageUrl} alt="" className="h-6 w-6 rounded object-cover" />
              )}
              <span className="max-w-44 truncate text-[var(--ink-primary)]">{s.trackName}</span>
              <span
                aria-hidden
                className="text-[var(--ink-muted)] transition-colors group-hover:text-[var(--ink-primary)]"
              >
                ✕
              </span>
            </button>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/*
          How far from the library the set may wander. Named for what it does
          to the result rather than for the setting: "familiar" is the library
          only, "adventurous" reaches well outside it.
        */}
        <div className="flex items-center gap-1.5">
          {(['familiar', 'balanced', 'adventurous'] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPresetChange(p)}
              aria-pressed={preset === p}
              className={`rounded-lg px-3 py-1.5 text-xs capitalize transition-colors ${
                preset === p
                  ? 'bg-[var(--surface-signal)] text-[var(--ink-on-signal)]'
                  : 'bg-[var(--surface-panel)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-raised)]'
              }`}
              title={
                p === 'familiar'
                  ? 'Only tracks already in your library'
                  : p === 'balanced'
                    ? 'About a third new to you'
                    : 'About two thirds new to you'
              }
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={onGenerate}
          disabled={seeds.length === 0 || generating}
          className="ml-auto rounded-lg bg-[var(--surface-signal)] px-5 py-2 text-sm font-semibold text-[var(--ink-on-signal)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          title={seeds.length === 0 ? 'Add at least one seed first' : undefined}
        >
          {generating ? (progressLabel ?? 'Building the set…') : 'Build the set'}
        </button>
      </div>
    </div>
  );
}
