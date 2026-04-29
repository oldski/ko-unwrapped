import { NextResponse } from "next/server";
import { currentlyPlayingSong } from "@/lib/spotify";
import { getAudioFeaturesOrMock } from "@/lib/mockAudioFeatures";

export async function GET() {
	let response;
	try {
		response = await currentlyPlayingSong();
	} catch (error) {
		console.error('[now-playing] Failed to fetch currently playing:', error);
		return NextResponse.json({ isPlaying: false, error: 'Token refresh failed' }, { status: 200 });
	}

	if (response.status === 204 || response.status > 400) {
		return NextResponse.json({ isPlaying: false }, { status: 200 });
	}

	const song = await response.json();

	if (song.item === null) {
		return NextResponse.json({ isPlaying: false }, { status: 200 });
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
		songUrl,
		title,
		trackId,
		audioFeatures: enhancedAudioFeatures,
	}, { status: 200 });
}
