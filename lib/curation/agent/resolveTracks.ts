import { db } from '@/db';
import { tracks, artists, trackArtists, vibeTags } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { tagTrackIds } from '@/lib/curation/tagWithLLM';
import { searchTrack } from './spotifySearch';
import type { DiscoveredCandidate } from './buildPool';

export interface ProposedTrack {
  artistName: string;
  trackName: string;
  reason: string;
}

async function upsertArtist(spotifyArtistId: string, artistName: string): Promise<string> {
  const [existing] = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.spotifyArtistId, spotifyArtistId));
  if (existing) return existing.id;
  const [row] = await db
    .insert(artists)
    .values({ spotifyArtistId, artistName })
    .onConflictDoNothing()
    .returning({ id: artists.id });
  if (row) return row.id;
  const [raced] = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.spotifyArtistId, spotifyArtistId));
  return raced.id;
}

/**
 * Resolves proposals against Spotify; folds library duplicates back to their
 * existing rows; inserts + vibe-tags genuinely new tracks. Unresolvable
 * proposals are silently dropped. Per-proposal failures never abort the batch.
 */
export async function resolveProposals(proposals: ProposedTrack[]): Promise<DiscoveredCandidate[]> {
  const out: DiscoveredCandidate[] = [];
  const newTrackIds: string[] = [];

  for (const p of proposals) {
    try {
      const hit = await searchTrack(p.trackName, p.artistName);
      if (!hit) continue;

      const [existing] = await db
        .select({
          id: tracks.id,
          trackName: tracks.trackName,
          durationMs: tracks.durationMs,
          popularity: tracks.popularity,
          albumImageUrl: tracks.albumImageUrl,
        })
        .from(tracks)
        .where(eq(tracks.spotifyTrackId, hit.spotifyTrackId));

      if (existing) {
        const tagRows = await db
          .select({ tag: vibeTags.tag })
          .from(vibeTags)
          .where(eq(vibeTags.trackId, existing.id));
        out.push({
          trackId: existing.id,
          spotifyTrackId: hit.spotifyTrackId,
          trackName: existing.trackName,
          artistNames: hit.artistNames,
          durationMs: existing.durationMs,
          popularity: existing.popularity,
          albumImageUrl: existing.albumImageUrl,
          tags: tagRows.map((r) => r.tag),
          reason: p.reason,
        });
        continue;
      }

      const [inserted] = await db
        .insert(tracks)
        .values({
          spotifyTrackId: hit.spotifyTrackId,
          trackName: hit.trackName,
          durationMs: hit.durationMs,
          albumName: hit.albumName,
          albumImageUrl: hit.albumImageUrl,
          popularity: hit.popularity,
        })
        .onConflictDoNothing()
        .returning({ id: tracks.id });
      if (!inserted) continue;

      if (hit.primaryArtistSpotifyId) {
        const artistId = await upsertArtist(hit.primaryArtistSpotifyId, hit.artistNames[0]);
        await db.insert(trackArtists).values({ trackId: inserted.id, artistId }).onConflictDoNothing();
      }

      newTrackIds.push(inserted.id);
      out.push({
        trackId: inserted.id,
        spotifyTrackId: hit.spotifyTrackId,
        trackName: hit.trackName,
        artistNames: hit.artistNames,
        durationMs: hit.durationMs,
        popularity: hit.popularity,
        albumImageUrl: hit.albumImageUrl,
        tags: [],
        reason: p.reason,
      });
    } catch {
      // drop this proposal; never abort the batch
    }
  }

  if (newTrackIds.length) {
    await tagTrackIds(newTrackIds).catch(() => undefined);
    const tagged = await db
      .select({ trackId: vibeTags.trackId, tag: vibeTags.tag })
      .from(vibeTags)
      .where(inArray(vibeTags.trackId, newTrackIds));
    const byTrack = new Map<string, string[]>();
    for (const row of tagged) {
      const list = byTrack.get(row.trackId) ?? [];
      list.push(row.tag);
      byTrack.set(row.trackId, list);
    }
    for (const c of out) {
      if (byTrack.has(c.trackId)) c.tags = byTrack.get(c.trackId)!;
    }
  }

  return out;
}
