import { NextResponse } from 'next/server';
import { getInstagramAutomationAnalytics } from '@/lib/instagram/reel-automation';

/**
 * GET /api/instagram/analytics
 * Returns reconciled event counts across all Reels, intents, and follower contexts.
 */
export async function GET() {
  try {
    const analytics = await getInstagramAutomationAnalytics();
    return NextResponse.json({ success: true, analytics }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal analytics error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
