import { NextResponse } from 'next/server';
import { resolvePastedReelUrl } from '@/lib/instagram/reel-sync-service';

/**
 * REEL LINK RESOLUTION ENDPOINT: /api/instagram/reels/resolve-link
 * POST: Accepts { url: string }, normalizes shortcode, verifies account ownership,
 * and resolves real numeric Meta Media ID.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Instagram Reel URL string is required' },
        { status: 400 }
      );
    }

    const result = await resolvePastedReelUrl(url);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          canManualFallback: result.canManualFallback || false,
        },
        { status: 200 } // Return 200 with error details for graceful UI display
      );
    }

    return NextResponse.json(
      {
        success: true,
        reel: result.reel,
        existingRule: result.existingRule || null,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to resolve Reel URL';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
