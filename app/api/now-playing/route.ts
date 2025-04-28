import { NextResponse } from "next/server";
import {currentlyPlayingSong} from "@/lib/spotify";

export async function GET() {
	const response = await currentlyPlayingSong();
	
	if (response.status === 204 || response.status > 400) {
		return NextResponse.json({ isPlaying: false }, { status: 200 });
	}
	
	const song = await response.json();
	
	console.log(1, song)
	if (song.item === null) {
		return NextResponse.json({ isPlaying: false }, { status: 200 });
	}
	
	const isPlaying = song.is_playing;
	const title = song.item.name;
	const artist = song.item.artists.map((artist: any) => artist.name).join(", ");
	const album = song.item.album.name;
	const albumImageUrl = song.item.album.images[0].url;
	const songUrl = song.item.external_urls.spotify;
	
	return NextResponse.json({
		album,
		albumImageUrl,
		artist,
		isPlaying,
		songUrl,
		title,
	}, { status: 200 });
}
