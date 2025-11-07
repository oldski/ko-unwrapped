import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⏰ Cron job triggered - syncing listening history...');

    // Call the sync endpoint
    const host = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
    const response = await fetch(`${host}/api/sync/listening-history`, {
      method: 'POST',
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Cron sync successful:', data);
      return NextResponse.json({
        success: true,
        message: 'Cron sync completed',
        data,
      });
    } else {
      console.error('❌ Cron sync failed:', data);
      return NextResponse.json(
        {
          success: false,
          error: 'Sync failed',
          details: data,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
