import { NextResponse } from "next/server";
import { currentlyPlayingSong } from "@/lib/spotify";
import { getAudioFeaturesOrMock } from "@/lib/mockAudioFeatures";
import { db } from "@/db";
import { playHistory, tracks, artists, trackArtists } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

async function mostRecentFromDb() {
	const recent = await db
		.select({
			trackId: tracks.id,
			spotifyTrackId: tracks.spotifyTrackId,
			title: tracks.trackName,
			album: tracks.albumName,
			albumImageUrl: tracks.albumImageUrl,
			popularity: tracks.popularity,
			durationMs: tracks.durationMs,
			playedAt: playHistory.playedAt,
		})
		.from(playHistory)
		.innerJoin(tracks, eq(playHistory.trackId, tracks.id))
		.orderBy(desc(playHistory.playedAt))
		.limit(1);

	if (recent.length === 0) return null;
	const row = recent[0];

	const artistRows = await db
		.select({ name: artists.artistName })
		.from(trackArtists)
		.innerJoin(artists, eq(trackArtists.artistId, artists.id))
		.where(eq(trackArtists.trackId, row.trackId));

	const artist = artistRows.map((a) => a.name).join(", ");

	const audioFeatures = getAudioFeaturesOrMock(null, {
		trackId: row.spotifyTrackId,
		popularity: row.popularity ?? 50,
		durationMs: row.durationMs,
		trackName: row.title,
		artistName: artist,
	});

	return {
		album: row.album,
		albumImageUrl: row.albumImageUrl,
		artist,
		isPlaying: false,
		isFallback: true,
		songUrl: `https://open.spotify.com/track/${row.spotifyTrackId}`,
		title: row.title,
		trackId: row.spotifyTrackId,
		audioFeatures,
		playedAt: row.playedAt,
	};
}

async function fallbackResponse() {
	try {
		const recent = await mostRecentFromDb();
		if (recent) return NextResponse.json(recent, { status: 200 });
	} catch (error) {
		console.error('[now-playing] DB fallback failed:', error);
	}
	return NextResponse.json({ isPlaying: false }, { status: 200 });
}

export async function GET() {
	let response;
	try {
		response = await currentlyPlayingSong();
	} catch (error) {
		console.error('[now-playing] Failed to fetch currently playing:', error);
		return fallbackResponse();
	}

	if (response.status === 204 || response.status > 400) {
		return fallbackResponse();
	}

	const song = await response.json();

	if (song.item === null) {
		return fallbackResponse();
	}

	const isPlaying = song.is_playing;
	const title = song.item.name;
	const artist = song.item.artists.map((artist: any) => artist.name).join(", ");
	const album = song.item.album.name;
	const albumImageUrl = song.item.album.images[0].url;
	const songUrl = song.item.external_urls.spotify;
	const trackId = song.item.id;
	const popularity = song.item.popularity;
	const durationMs = song.item.duration_ms;

	if (!isPlaying) {
		return fallbackResponse();
	}

	// Spotify deprecated /v1/audio-features for new apps — always use intelligent mocks
	const enhancedAudioFeatures = getAudioFeaturesOrMock(null, {
		trackId,
		popularity,
		durationMs,
		trackName: title,
		artistName: artist,
	});

	return NextResponse.json({
		album,
		albumImageUrl,
		artist,
		isPlaying,
		isFallback: false,
		songUrl,
		title,
		trackId,
		audioFeatures: enhancedAudioFeatures,
	}, { status: 200 });
}
