import { NextResponse } from 'next/server';
import { sendInstagramPublicCommentReply } from '@/lib/instagram/reel-automation';

/**
 * CONTRACT: POST /api/instagram/send-public-reply
 * Public Comment Reply Trigger with recursion guards, rate limits, and audit logs.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const customSecret = request.headers.get('x-tbw-webhook-secret') || request.headers.get('x-n8n-api-key') || request.headers.get('x-internal-secret') || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();

    const expectedSecrets = [
      process.env.N8N_WEBHOOK_SECRET,
      process.env.N8N_API_KEY,
      process.env.INTERNAL_API_SECRET,
    ].filter(Boolean);

    if (expectedSecrets.length > 0) {
      const isAuthorized = expectedSecrets.some((s) => bearer === s || customSecret === s);
      if (!isAuthorized) {
        return NextResponse.json({ error: 'Unauthorized caller' }, { status: 401 });
      }
    }

    const payload = await request.json();
    const result = await sendInstagramPublicCommentReply(payload);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Public comment reply execution failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
