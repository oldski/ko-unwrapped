'use client';

import type { Filters } from './types';

function ChipInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">{label}</span>
      <input
        defaultValue={values.join(', ')}
        onBlur={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean)
          )
        }
        placeholder="comma-separated, e.g. downtempo, trip hop"
        className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-[var(--color-primary)] outline-none text-sm"
      />
    </label>
  );
}

export default function ShapeTab({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const num =
    (key: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...filters, [key]: Number(e.target.value) });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
      <div className="flex gap-3 items-end">
        <label className="block flex-1">
          <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
            Duration (min)
          </span>
          <input
            type="number"
            min={10}
            max={filters.durationMaxMinutes}
            value={filters.durationMinMinutes}
            onChange={num('durationMinMinutes')}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
          />
        </label>
        <span className="pb-2 text-[var(--color-text-secondary)]">to</span>
        <label className="block flex-1">
          <span className="text-xs uppercase tracking-widest text-transparent select-none">max</span>
          <input
            type="number"
            min={filters.durationMinMinutes}
            max={240}
            value={filters.durationMaxMinutes}
            onChange={num('durationMaxMinutes')}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
          />
        </label>
      </div>
      <div className="flex gap-3 items-end">
        <label className="block flex-1">
          <span className="text-xs uppercase tracking-widest text-[var(--color-text-secondary)]">
            Popularity
          </span>
          <input
            type="number"
            min={0}
            max={filters.popularityMax}
            value={filters.popularityMin}
            onChange={num('popularityMin')}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
          />
        </label>
        <span className="pb-2 text-[var(--color-text-secondary)]">to</span>
        <label className="block flex-1">
          <span className="text-xs uppercase tracking-widest text-transparent select-none">max</span>
          <input
            type="number"
            min={filters.popularityMin}
            max={100}
            value={filters.popularityMax}
            onChange={num('popularityMax')}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
          />
        </label>
      </div>
      <ChipInput
        label="Only these genres"
        values={filters.genreAllow}
        onChange={(genreAllow) => onChange({ ...filters, genreAllow })}
      />
      <ChipInput
        label="Never these genres"
        values={filters.genreDeny}
        onChange={(genreDeny) => onChange({ ...filters, genreDeny })}
      />
    </div>
  );
}
