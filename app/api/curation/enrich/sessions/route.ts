import { NextResponse } from 'next/server';
import { extractSessions } from '@/lib/curation/extractSessions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await extractSessions();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('❌ enrich/sessions error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
