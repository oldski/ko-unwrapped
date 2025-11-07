import { NextResponse } from "next/server";
import { getAudioAnalysis } from "@/lib/spotify";

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ trackId: string }> }
) {
    try {
        const { trackId } = await params;

        if (!trackId) {
            return NextResponse.json(
                { error: 'Track ID is required' },
                { status: 400 }
            );
        }

        console.log('Fetching audio analysis for track:', trackId);
        const audioAnalysis = await getAudioAnalysis(trackId);

        return NextResponse.json(audioAnalysis);
    } catch (error: any) {
        console.error('Error fetching audio analysis:', error);
        return NextResponse.json(
            { error: 'Failed to fetch audio analysis', details: error.message },
            { status: 500 }
        );
    }
}
