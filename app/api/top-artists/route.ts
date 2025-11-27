import { NextResponse } from "next/server";
import { getTopArtistsTimeRange } from "@/lib/spotify";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const timeRange = (searchParams.get('time_range') as 'short_term' | 'medium_term' | 'long_term') || 'long_term';
		const limitParam = searchParams.get('limit');
		const limit = limitParam ? parseInt(limitParam) : 20;

		const { items } = await getTopArtistsTimeRange(timeRange, limit);

		const artists = items.map((artist) => ({
			id: artist.id,
			name: artist.name,
			url: artist.external_urls.spotify,
			popularity: artist.popularity,
			genres: artist.genres || [],
			coverImage: artist.images ? artist.images[1] : null,
			followers: artist.followers?.total || 0,
		}));

		return NextResponse.json(artists, { status: 200 });
	} catch (error) {
		console.error('Error fetching top artists:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch top artists' },
			{ status: 500 }
		);
	}
}