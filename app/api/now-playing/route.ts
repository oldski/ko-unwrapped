import { NextResponse } from "next/server";
import {currentlyPlayingSong, getAudioFeatures} from "@/lib/spotify";

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

	// Fetch audio features for the currently playing track
	let audioFeatures = null;
	try {
		const features = await getAudioFeatures([trackId]);
		audioFeatures = features.audio_features?.[0] || null;
	} catch (error) {
		// Silently fail - audio features are optional enhancement
		// The app will still work with default BPM/energy values
	}

	return NextResponse.json({
		album,
		albumImageUrl,
		artist,
		isPlaying,
		songUrl,
		title,
		trackId,
		audioFeatures,
	}, { status: 200 });
}
