import { NextResponse } from 'next/server';
import { rankCandidates, type RankCandidatesInput } from '@/lib/curation/candidateScorer';
import { getSession } from '@/lib/auth/getSession';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}
function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'number');
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();

    if (!isStringArray(body?.seedTrackIds) || body.seedTrackIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'seedTrackIds must be a non-empty array of strings' },
        { status: 400 }
      );
    }

    const input: RankCandidatesInput = { seedTrackIds: body.seedTrackIds };

    if (
      Array.isArray(body.durationTargetMs) &&
      body.durationTargetMs.length === 2 &&
      typeof body.durationTargetMs[0] === 'number' &&
      typeof body.durationTargetMs[1] === 'number'
    ) {
      input.durationTargetMs = [body.durationTargetMs[0], body.durationTargetMs[1]];
    }
    if (isStringArray(body.genreAllow)) input.genreAllow = body.genreAllow;
    if (isStringArray(body.genreDeny)) input.genreDeny = body.genreDeny;
    if (isStringArray(body.tagAllow)) input.tagAllow = body.tagAllow;
    if (isNumberArray(body.hourOfDayFilter)) input.hourOfDayFilter = body.hourOfDayFilter;
    if (
      Array.isArray(body.popularityRange) &&
      body.popularityRange.length === 2 &&
      typeof body.popularityRange[0] === 'number' &&
      typeof body.popularityRange[1] === 'number'
    ) {
      input.popularityRange = [body.popularityRange[0], body.popularityRange[1]];
    }
    if (isStringArray(body.excludeTrackIds)) input.excludeTrackIds = body.excludeTrackIds;
    if (typeof body.alternatesCount === 'number' && body.alternatesCount > 0) {
      input.alternatesCount = Math.min(30, Math.floor(body.alternatesCount));
    }

    const result = await rankCandidates(input);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('❌ candidates error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
