import { NextResponse } from "next/server";
import { getRecentlyPlayed } from "@/lib/spotify";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam) : 50;

        console.log('Fetching recently played with limit:', limit);
        const recentlyPlayed = await getRecentlyPlayed(limit);
        console.log('Recently played response:', recentlyPlayed);

        return NextResponse.json(recentlyPlayed);
    } catch (error: any) {
        console.error('Error fetching recently played:', error);
        console.error('Error message:', error?.message);
        console.error('Error stack:', error?.stack);
        return NextResponse.json(
            {
                error: 'Failed to fetch recently played tracks',
                details: error?.message || 'Unknown error'
            },
            { status: 500 }
        );
    }
}