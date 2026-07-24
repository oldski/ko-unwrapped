import { db } from '@/db';
import { playHistory, listeningSessions, sessionTracks } from '@/db/schema';
import { asc, sql } from 'drizzle-orm';

const SESSION_GAP_MS = 30 * 60 * 1000;
const TZ = process.env.CURATION_TZ || 'America/Los_Angeles';

export interface ExtractSessionsResult {
  sessionCount: number;
  trackLinkCount: number;
  avgSessionLength: number;
  longestSessionTracks: number;
}

interface PlayRow {
  id: string;
  trackId: string;
  playedAt: Date;
}

function localParts(d: Date): { hour: number; dayOfWeek: number } {
  // 'h12: false' gives 0-23. weekday short -> mapped to 0..6 (Sun=0)
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = dtf.formatToParts(d);
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  // Intl can return "24" for midnight in some locales; normalize.
  const hour = parseInt(hourStr, 10) % 24;
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return { hour, dayOfWeek: weekdayMap[weekdayStr] ?? 0 };
}

/**
 * Recomputes the listening_sessions + session_tracks tables from scratch by
 * grouping play_history rows into runs where consecutive plays are within
 * SESSION_GAP_MS of each other.
 *
 * Idempotent: wipes and rebuilds both derived tables on every call.
 */
export async function extractSessions(): Promise<ExtractSessionsResult> {
  console.log('🧩 Recomputing listening sessions...');

  // Wipe prior state. session_tracks cascades from listening_sessions.
  await db.delete(sessionTracks);
  await db.delete(listeningSessions);

  const rows: PlayRow[] = await db
    .select({
      id: playHistory.id,
      trackId: playHistory.trackId,
      playedAt: playHistory.playedAt,
    })
    .from(playHistory)
    .orderBy(asc(playHistory.playedAt));

  if (!rows.length) {
    return { sessionCount: 0, trackLinkCount: 0, avgSessionLength: 0, longestSessionTracks: 0 };
  }

  // Group into sessions.
  const sessions: PlayRow[][] = [];
  let current: PlayRow[] = [rows[0]];
  for (let i = 1; i < rows.length; i++) {
    const prev = current[current.length - 1];
    const cur = rows[i];
    if (cur.playedAt.getTime() - prev.playedAt.getTime() > SESSION_GAP_MS) {
      sessions.push(current);
      current = [cur];
    } else {
      current.push(cur);
    }
  }
  sessions.push(current);

  let trackLinkCount = 0;
  let longestSessionTracks = 0;

  for (const session of sessions) {
    const startedAt = session[0].playedAt;
    const endedAt = session[session.length - 1].playedAt;
    const { hour, dayOfWeek } = localParts(startedAt);

    const [{ id: sessionId }] = await db
      .insert(listeningSessions)
      .values({
        startedAt,
        endedAt,
        trackCount: session.length,
        hourOfDay: hour,
        dayOfWeek,
      })
      .returning({ id: listeningSessions.id });

    const linkRows = session.map((play, idx) => ({
      sessionId,
      trackId: play.trackId,
      playHistoryId: play.id,
      position: idx,
    }));

    // Insert in chunks of 1000 to keep parameter count bounded.
    const CHUNK = 1000;
    for (let i = 0; i < linkRows.length; i += CHUNK) {
      await db.insert(sessionTracks).values(linkRows.slice(i, i + CHUNK));
    }

    trackLinkCount += session.length;
    if (session.length > longestSessionTracks) longestSessionTracks = session.length;
  }

  const avgSessionLength = trackLinkCount / sessions.length;

  console.log(`✅ Sessions: ${sessions.length} sessions, avg ${avgSessionLength.toFixed(1)} tracks, longest ${longestSessionTracks}`);

  return {
    sessionCount: sessions.length,
    trackLinkCount,
    avgSessionLength,
    longestSessionTracks,
  };
}

// Re-export sql in case callers want it for ad-hoc queries against derived tables.
export { sql };
