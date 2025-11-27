import { NextResponse } from 'next/server';
import { db } from '@/db';
import { playHistory, tracks, artists, trackArtists } from '@/db/schema';
import { desc, count, sql, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get top tracks by play count with all metadata
    const topTracks = await db
      .select({
        trackId: tracks.id,
        spotifyTrackId: tracks.spotifyTrackId,
        trackName: tracks.trackName,
        albumName: tracks.albumName,
        albumImage: tracks.albumImageUrl,
        popularity: tracks.popularity,
        durationMs: tracks.durationMs,
        playCount: count(playHistory.id).as('play_count'),
      })
      .from(playHistory)
      .innerJoin(tracks, eq(playHistory.trackId, tracks.id))
      .groupBy(
        tracks.id,
        tracks.spotifyTrackId,
        tracks.trackName,
        tracks.albumName,
        tracks.albumImageUrl,
        tracks.popularity,
        tracks.durationMs
      )
      .orderBy(desc(sql`play_count`))
      .limit(limit);

    // Get artists for each track
    const tracksWithArtists = await Promise.all(
      topTracks.map(async (track) => {
        const trackArtistsData = await db
          .select({
            artistId: artists.id,
            artistName: artists.artistName,
            spotifyArtistId: artists.spotifyArtistId,
          })
          .from(trackArtists)
          .innerJoin(artists, eq(trackArtists.artistId, artists.id))
          .where(eq(trackArtists.trackId, track.trackId));

        return {
          ...track,
          artists: trackArtistsData,
        };
      })
    );

    // Calculate insights
    const totalPlays = tracksWithArtists.reduce((sum, t) => sum + t.playCount, 0);
    const totalDurationMs = tracksWithArtists.reduce((sum, t) => sum + (t.durationMs || 0) * t.playCount, 0);
    const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));

    // Popularity analysis
    const popularities = tracksWithArtists.map(t => t.popularity).filter((p): p is number => p !== null);
    const avgPopularity = popularities.length > 0
      ? popularities.reduce((sum, p) => sum + p, 0) / popularities.length
      : 0;

    // Popularity distribution
    const popularityBuckets = {
      underground: popularities.filter(p => p < 30).length,      // 0-29
      emerging: popularities.filter(p => p >= 30 && p < 50).length, // 30-49
      popular: popularities.filter(p => p >= 50 && p < 70).length,  // 50-69
      mainstream: popularities.filter(p => p >= 70).length,         // 70+
    };

    // Duration analysis
    const durations = tracksWithArtists.map(t => t.durationMs).filter((d): d is number => d !== null);
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    // Find shortest and longest tracks safely
    const tracksWithDuration = tracksWithArtists.filter(t => t.durationMs !== null && t.durationMs !== undefined);
    const shortestTrack = tracksWithDuration.length > 0
      ? tracksWithDuration.reduce((min, t) => (t.durationMs! < min.durationMs!) ? t : min)
      : null;
    const longestTrack = tracksWithDuration.length > 0
      ? tracksWithDuration.reduce((max, t) => (t.durationMs! > max.durationMs!) ? t : max)
      : null;

    // Note: Genres are not currently stored in the database
    // This would require fetching from Spotify API or adding genres to schema
    const topGenres: { genre: string; playCount: number }[] = [];

    // Artist concentration
    const artistPlayCounts: Record<string, { name: string; plays: number }> = {};
    tracksWithArtists.forEach(track => {
      if (!track.artists) return;
      track.artists.forEach(artist => {
        if (!artist || !artist.artistName) return;
        if (!artistPlayCounts[artist.artistName]) {
          artistPlayCounts[artist.artistName] = { name: artist.artistName, plays: 0 };
        }
        artistPlayCounts[artist.artistName].plays += track.playCount;
      });
    });

    const topArtists = Object.values(artistPlayCounts)
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);

    const uniqueArtists = Object.keys(artistPlayCounts).length;
    const artistDiversity = tracksWithArtists.length > 0
      ? (uniqueArtists / tracksWithArtists.length) * 100
      : 0;

    // Calculate "obscurity score" - inverse of average popularity
    const obscurityScore = Math.round(100 - avgPopularity);

    // Listening style based on metrics
    const listeningStyle = {
      mainstream: avgPopularity >= 60,
      diverse: artistDiversity >= 70,
      loyalist: topArtists[0]?.plays > totalPlays * 0.15, // Top artist > 15% of plays
    };

    return NextResponse.json({
      success: true,
      summary: {
        tracksAnalyzed: tracksWithArtists.length,
        totalPlays,
        totalListeningTime: { hours: totalHours, minutes: totalMinutes },
        uniqueArtists,
        uniqueGenres: topGenres.length,
      },
      popularity: {
        average: Math.round(avgPopularity),
        obscurityScore,
        distribution: popularityBuckets,
      },
      duration: {
        averageMs: Math.round(avgDuration),
        averageFormatted: `${Math.floor(avgDuration / 60000)}:${String(Math.floor((avgDuration % 60000) / 1000)).padStart(2, '0')}`,
        shortest: shortestTrack ? {
          name: shortestTrack.trackName,
          durationMs: shortestTrack.durationMs,
          formatted: shortestTrack.durationMs ? `${Math.floor(shortestTrack.durationMs / 60000)}:${String(Math.floor((shortestTrack.durationMs % 60000) / 1000)).padStart(2, '0')}` : null,
        } : null,
        longest: longestTrack ? {
          name: longestTrack.trackName,
          durationMs: longestTrack.durationMs,
          formatted: longestTrack.durationMs ? `${Math.floor(longestTrack.durationMs / 60000)}:${String(Math.floor((longestTrack.durationMs % 60000) / 1000)).padStart(2, '0')}` : null,
        } : null,
      },
      genres: topGenres,
      artists: {
        top: topArtists,
        diversity: Math.round(artistDiversity),
      },
      listeningStyle,
      tracks: tracksWithArtists.map(t => ({
        id: t.trackId,
        spotifyId: t.spotifyTrackId,
        name: t.trackName,
        album: t.albumName,
        albumImage: t.albumImage,
        popularity: t.popularity,
        durationMs: t.durationMs,
        playCount: t.playCount,
        artists: t.artists?.map(a => a.artistName).filter(Boolean) || [],
      })),
    });

  } catch (error: any) {
    console.error('Error fetching top tracks insights:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch insights',
    }, { status: 500 });
  }
}