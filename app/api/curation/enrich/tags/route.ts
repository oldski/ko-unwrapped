import { NextResponse } from 'next/server';
import { tagWithLLM } from '@/lib/curation/tagWithLLM';
import { getSession } from '@/lib/auth/getSession';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    let limit = 250;
    try {
      const body = await request.json();
      if (typeof body?.limit === 'number' && body.limit > 0) {
        limit = Math.floor(body.limit);
      }
    } catch {
      // Empty body is fine.
    }
    const result = await tagWithLLM(limit);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('❌ enrich/tags error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
