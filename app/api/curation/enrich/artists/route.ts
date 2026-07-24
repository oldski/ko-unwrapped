import { NextResponse } from 'next/server';
import { enrichArtistGenres } from '@/lib/curation/enrichArtistGenres';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await enrichArtistGenres();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('❌ enrich/artists error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
