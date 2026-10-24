import { NextResponse } from 'next/server';
import { sendInstagramPublicCommentReply } from '@/lib/instagram/reel-automation';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';

/**
 * CONTRACT: POST /api/instagram/send-public-reply
 * Public Comment Reply Trigger with recursion guards, rate limits, and audit logs.
 */
export async function POST(request: Request) {
  try {
    const auth = verifyIncomingN8nWebhook(request, true);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized caller' }, { status: 401 });
    }

    const payload = await request.json();
    const result = await sendInstagramPublicCommentReply(payload);

    return NextResponse.json(result, { status: result.success || result.skipped ? 200 : 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Public comment reply execution failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
