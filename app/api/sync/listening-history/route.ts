import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tracks, artists, trackArtists, playHistory } from '@/db/schema';
import { getRecentlyPlayed } from '@/lib/spotify';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🔄 Starting listening history sync...');

    // Fetch recently played from Spotify (last 50 tracks)
    const recentlyPlayedData = await getRecentlyPlayed(50);
    const items = recentlyPlayedData?.items || [];

    if (!items.length) {
      console.log('⚠️  No tracks to sync');
      return NextResponse.json({
        success: true,
        newPlays: 0,
        message: 'No tracks to sync',
      });
    }

    console.log(`📥 Fetched ${items.length} tracks from Spotify`);

    let newPlays = 0;
    let skippedPlays = 0;

    for (const item of items) {
      try {
        // Check if track exists in database
        const existingTracks = await db
          .select()
          .from(tracks)
          .where(eq(tracks.spotifyTrackId, item.track.id))
          .limit(1);

        let trackRecord;

        if (existingTracks.length === 0) {
          // Insert new track
          const [newTrack] = await db
            .insert(tracks)
            .values({
              spotifyTrackId: item.track.id,
              trackName: item.track.name,
              durationMs: item.track.duration_ms,
              albumName: item.track.album.name,
              albumImageUrl: item.track.album.images[0]?.url || null,
              popularity: item.track.popularity,
            })
            .returning();

          trackRecord = newTrack;
          console.log(`✅ New track: ${item.track.name}`);
        } else {
          trackRecord = existingTracks[0];
        }

        // Insert or link artists
        for (const artist of item.track.artists) {
          // Check if artist exists
          const existingArtists = await db
            .select()
            .from(artists)
            .where(eq(artists.spotifyArtistId, artist.id))
            .limit(1);

          let artistRecord;

          if (existingArtists.length === 0) {
            // Insert new artist
            const [newArtist] = await db
              .insert(artists)
              .values({
                spotifyArtistId: artist.id,
                artistName: artist.name,
              })
              .returning();

            artistRecord = newArtist;
            console.log(`✅ New artist: ${artist.name}`);
          } else {
            artistRecord = existingArtists[0];
          }

          // Link track and artist (check if link exists first)
          const existingLink = await db
            .select()
            .from(trackArtists)
            .where(
              and(
                eq(trackArtists.trackId, trackRecord.id),
                eq(trackArtists.artistId, artistRecord.id)
              )
            )
            .limit(1);

          if (existingLink.length === 0) {
            await db.insert(trackArtists).values({
              trackId: trackRecord.id,
              artistId: artistRecord.id,
            });
          }
        }

        // Check if this play already exists (by timestamp)
        const playedAtDate = new Date(item.played_at);
        const existingPlay = await db
          .select()
          .from(playHistory)
          .where(eq(playHistory.playedAt, playedAtDate))
          .limit(1);

        if (existingPlay.length === 0) {
          // Insert new play history
          await db.insert(playHistory).values({
            trackId: trackRecord.id,
            playedAt: playedAtDate,
            contextType: item.context?.type || null,
          });

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

    console.log(`✅ Sync complete: ${newPlays} new plays, ${skippedPlays} skipped`);

    return NextResponse.json({
      success: true,
      newPlays,
      skippedPlays,
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
