import { NextResponse } from 'next/server';
import { getInstagramAutomationAnalytics } from '@/lib/instagram/reel-automation';

/**
 * GET /api/instagram/analytics
 * Returns reconciled event counts across all Reels, intents, and follower contexts.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRangeParam = searchParams.get('timeRange');
    const timeRange = (timeRangeParam === 'today' || timeRangeParam === '7d' || timeRangeParam === '30d')
      ? timeRangeParam
      : 'all';

    const analytics = await getInstagramAutomationAnalytics({ timeRange });
    return NextResponse.json({ success: true, analytics }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal analytics error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
