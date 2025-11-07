import { NextResponse } from "next/server";
import { getAudioFeatures } from "@/lib/spotify";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const ids = searchParams.get('ids');

        if (!ids) {
            return NextResponse.json(
                { error: 'Track IDs are required' },
                { status: 400 }
            );
        }

        const trackIds = ids.split(',').filter(id => id.trim().length > 0);

        if (trackIds.length === 0) {
            return NextResponse.json(
                { error: 'Valid track IDs are required' },
                { status: 400 }
            );
        }

        console.log('Fetching audio features for:', trackIds);
        const audioFeatures = await getAudioFeatures(trackIds);
        console.log('Audio features response:', audioFeatures);

        return NextResponse.json(audioFeatures);
    } catch (error: any) {
        console.error('Error fetching audio features:', error);
        console.error('Error message:', error?.message);
        console.error('Error stack:', error?.stack);
        return NextResponse.json(
            {
                error: 'Failed to fetch audio features',
                details: error?.message || 'Unknown error'
            },
            { status: 500 }
        );
    }
}
