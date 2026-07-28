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
    <div className="flex items-center gap-3 flex-wrap py-3 border-y border-white/10">
      <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
        Seeds
      </span>
      {seeds.length === 0 && (
        <span className="text-sm text-[var(--color-text-secondary)]">
          add tracks from below to anchor the set
        </span>
      )}
      {seeds.map((s) => (
        <button
          key={s.trackId}
          onClick={() => onRemove(s.trackId)}
          className="group flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition text-sm"
          title="Remove seed"
        >
          {s.albumImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.albumImageUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
          )}
          <span className="max-w-48 truncate">{s.trackName}</span>
          <span className="text-white/40 group-hover:text-white/80">✕</span>
        </button>
      ))}
      <div className="flex gap-1 ml-auto mr-3">
        {(['familiar', 'balanced', 'adventurous'] as const).map((p) => (
          <button
            key={p}
            onClick={() => onPresetChange(p)}
            className={`px-3 py-1 rounded-full text-xs capitalize transition ${
              preset === p ? 'bg-[var(--color-primary)] text-black' : 'bg-white/10 hover:bg-white/20'
            }`}
            title={
              p === 'familiar'
                ? 'Library only'
                : p === 'balanced'
                ? '~30% new music'
                : '~60% new music'
            }
          >
            {p}
          </button>
        ))}
      </div>
      <button
        onClick={onGenerate}
        disabled={seeds.length === 0 || generating}
        className="px-5 py-2 rounded-full font-semibold bg-[var(--color-vibrant-safe)] text-black disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
        title={seeds.length === 0 ? 'Pick at least one seed first' : 'Generate the set'}
      >
        {generating ? (progressLabel ?? 'Generating…') : 'Generate'}
      </button>
    </div>
  );
}
