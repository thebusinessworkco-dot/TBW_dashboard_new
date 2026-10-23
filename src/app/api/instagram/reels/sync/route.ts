import { NextResponse } from 'next/server';
import { getCachedSyncedReels, syncReelsFromMeta } from '@/lib/instagram/reel-sync-service';

/**
 * REELS SYNC ENDPOINT: /api/instagram/reels/sync
 * GET: returns cached synced reels (or forces sync if ?force=true)
 * POST: forces sync from Meta Graph API
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (force) {
      const result = await syncReelsFromMeta({ maxPages: 5 });
      return NextResponse.json(result, { status: result.success ? 200 : 200 });
    }

    const store = await getCachedSyncedReels();
    return NextResponse.json({ success: true, store }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to sync Instagram reels';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const maxPages = Number(body?.maxPages) || 5;

    const result = await syncReelsFromMeta({ maxPages });
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to force sync reels';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
