import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tracks, artists, trackArtists, playHistory } from '@/db/schema';
import { getRecentlyPlayed } from '@/lib/spotify';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔄 Starting listening history sync...');

    // Ask Spotify only for plays newer than the newest one already stored.
    // Spotify retains just the last 50 plays, so this does not let us reach
    // further back; it only avoids re-processing what we already have.
    const [newest] = await db
      .select({ playedAt: playHistory.playedAt })
      .from(playHistory)
      .orderBy(desc(playHistory.playedAt))
      .limit(1);

    const after = newest ? newest.playedAt.getTime() : undefined;
    const recentlyPlayedData = await getRecentlyPlayed(50, after);
    const items = recentlyPlayedData?.items || [];

    if (!items.length) {
      console.log('⚠️  Nothing new since the last sync');
      return NextResponse.json({
        success: true,
        newPlays: 0,
        message: 'Nothing new since the last sync',
      });
    }

    console.log(`📥 Fetched ${items.length} tracks from Spotify`);

    // Spotify caps this endpoint at 50 plays. A full page means listening may
    // have overflowed the window since the last run, so some plays are gone.
    if (items.length === 50) {
      console.warn(
        '⚠️  Full page returned — plays may have been missed. Sync more often.'
      );
    }

    let newPlays = 0;
    let skippedPlays = 0;
    let newTracks = 0;
    let newArtists = 0;

    for (const item of items) {
      try {
        // Insert the track, or fall back to the existing row. ON CONFLICT
        // rather than a read-then-write check so concurrent syncs cannot both
        // decide the row is missing.
        const [insertedTrack] = await db
          .insert(tracks)
          .values({
            spotifyTrackId: item.track.id,
            trackName: item.track.name,
            durationMs: item.track.duration_ms,
            albumName: item.track.album.name,
            albumImageUrl: item.track.album.images[0]?.url || null,
            popularity: item.track.popularity,
          })
          .onConflictDoNothing({ target: tracks.spotifyTrackId })
          .returning();

        let trackRecord = insertedTrack;

        if (trackRecord) {
          newTracks++;
          console.log(`✅ New track: ${item.track.name}`);
        } else {
          [trackRecord] = await db
            .select()
            .from(tracks)
            .where(eq(tracks.spotifyTrackId, item.track.id))
            .limit(1);
        }

        if (!trackRecord) {
          throw new Error(`Could not resolve track ${item.track.id}`);
        }

        for (const artist of item.track.artists) {
          const [insertedArtist] = await db
            .insert(artists)
            .values({
              spotifyArtistId: artist.id,
              artistName: artist.name,
            })
            .onConflictDoNothing({ target: artists.spotifyArtistId })
            .returning();

          let artistRecord = insertedArtist;

          if (artistRecord) {
            newArtists++;
            console.log(`✅ New artist: ${artist.name}`);
          } else {
            [artistRecord] = await db
              .select()
              .from(artists)
              .where(eq(artists.spotifyArtistId, artist.id))
              .limit(1);
          }

          if (!artistRecord) {
            throw new Error(`Could not resolve artist ${artist.id}`);
          }

          const existingLink = await db
            .select()
            .from(trackArtists)
            .where(eq(trackArtists.trackId, trackRecord.id))
            .limit(50);

          if (!existingLink.some((link) => link.artistId === artistRecord.id)) {
            await db.insert(trackArtists).values({
              trackId: trackRecord.id,
              artistId: artistRecord.id,
            });
          }
        }

        // played_at carries a unique index, so a duplicate play is rejected by
        // the database rather than by a prior read. An empty result means the
        // play was already recorded.
        const playedAtDate = new Date(item.played_at);
        const insertedPlay = await db
          .insert(playHistory)
          .values({
            trackId: trackRecord.id,
            playedAt: playedAtDate,
            contextType: item.context?.type || null,
          })
          .onConflictDoNothing({ target: playHistory.playedAt })
          .returning({ id: playHistory.id });

        if (insertedPlay.length > 0) {
          newPlays++;
          console.log(`🎵 New play: ${item.track.name} at ${playedAtDate.toISOString()}`);
        } else {
          skippedPlays++;
        }
      } catch (itemError: any) {
        console.error(`❌ Error processing track ${item.track.name}:`, itemError.message);
        // Continue processing other tracks
      }
    }

    console.log(
      `✅ Sync complete: ${newPlays} new plays, ${skippedPlays} already recorded, ` +
      `${newTracks} first-time tracks, ${newArtists} first-time artists`
    );

    return NextResponse.json({
      success: true,
      newPlays,
      skippedPlays,
      newTracks,
      newArtists,
      totalProcessed: items.length,
      message: `Synced ${newPlays} new plays`,
    });
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}
