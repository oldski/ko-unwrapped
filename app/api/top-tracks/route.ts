import { NextResponse } from "next/server";
import { topTracks } from "@/lib/spotify";


export async function GET() {
	const items = await topTracks();
	
	const tracks = items.map((track) => ({
		title: track.name,
		artist: track.artists.map((artist) => artist.name).join(", "),
		url: track.external_urls.spotify,
		coverImage: track.album.images[1],
	}));
	
	return NextResponse.json(tracks, { status: 200 });
}
