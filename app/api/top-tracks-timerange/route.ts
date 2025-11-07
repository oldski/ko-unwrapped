import { NextResponse } from "next/server";
import { getTopTracksTimeRange } from "@/lib/spotify";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const timeRange = searchParams.get('time_range') as 'short_term' | 'medium_term' | 'long_term' || 'long_term';
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam) : 50;

        const topTracks = await getTopTracksTimeRange(timeRange, limit);

        return NextResponse.json(topTracks);
    } catch (error) {
        console.error('Error fetching top tracks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch top tracks' },
            { status: 500 }
        );
    }
}
