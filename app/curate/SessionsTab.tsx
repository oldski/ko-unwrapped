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
          <li key={s.id} className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm font-semibold">
                {DAYS[s.dayOfWeek]} {date.toLocaleDateString()} · {s.hourOfDay}:00
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">{s.trackCount} tracks</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] truncate mb-2">
              {s.sampleTracks.map((t) => t.trackName).join(' · ')}
            </p>
            <button
              onClick={() => onSeedFromSession(s.sampleTracks.map((t) => t.trackId))}
              className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition"
            >
              Use as seeds ⊕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
