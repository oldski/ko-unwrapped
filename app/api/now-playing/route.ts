import { NextResponse } from "next/server";
import {currentlyPlayingSong, getAudioFeatures} from "@/lib/spotify";
import { getAudioFeaturesOrMock } from "@/lib/mockAudioFeatures";

export async function GET() {
	const response = await currentlyPlayingSong();

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

	// Fetch audio features for the currently playing track
	let audioFeatures = null;
	try {
		const features = await getAudioFeatures([trackId]);
		audioFeatures = features.audio_features?.[0] || null;
	} catch (error) {
		// Silently fail - will use mock features below
	}

	// Use real features if available, otherwise generate intelligent mock features
	const enhancedAudioFeatures = getAudioFeaturesOrMock(audioFeatures, {
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
