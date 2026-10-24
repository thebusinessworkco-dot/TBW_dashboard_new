import { NextResponse } from 'next/server';
import { evaluateCommentCheck } from '@/lib/instagram/reel-automation';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';

/**
 * CONTRACT A: POST /api/instagram/comment-check
 * Evaluates incoming Instagram comments for Reel-to-DM automation.
 * Supports Header Auth: 'x-n8n-api-key', 'X-TBW-Webhook-Secret', or 'Authorization: Bearer <secret>'.
 */
export async function POST(request: Request) {
  try {
    const auth = verifyIncomingN8nWebhook(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized caller' }, { status: 401 });
    }

    const payload = await request.json();
    const result = await evaluateCommentCheck(payload);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ approved: false, error: msg }, { status: 500 });
  }
}
