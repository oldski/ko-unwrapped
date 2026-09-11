'use client';

import { useEffect, useState } from 'react';
import type { TrackHit } from './types';

interface SessionSummary {
  id: string;
  startedAt: string;
  trackCount: number;
  hourOfDay: number;
  dayOfWeek: number;
  sampleTracks: { trackId: string; trackName: string }[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SessionsTab({
  onSeedFromSession,
}: {
  onSeedFromSession: (trackIds: string[]) => void;
}) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    fetch('/api/curation/sessions')
      .then((r) => r.json())
      .then((d) => d.success && setSessions(d.sessions));
  }, []);

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
      {sessions.map((s) => {
        const date = new Date(s.startedAt);
        return (
          <li key={s.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-3 transition-colors hover:border-[var(--ink-muted)]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-semibold">
                {DAYS[s.dayOfWeek]} {date.toLocaleDateString()} at {s.hourOfDay}:00
              </span>
              <span className="text-xs text-[var(--ink-muted)]">{s.trackCount} tracks</span>
            </div>
            <p className="text-xs text-[var(--ink-muted)] truncate mb-2">
              {s.sampleTracks.map((t) => t.trackName).join(', ')}
            </p>
            <button
              onClick={() => onSeedFromSession(s.sampleTracks.map((t) => t.trackId))}
              className="rounded-lg px-3 py-1 text-xs bg-[var(--surface-raised)] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink-primary)]"
            >
              Use as seeds
            </button>
          </li>
        );
      })}
    </ul>
  );
}
