import { NextResponse } from 'next/server';
import { evaluateDmContext } from '@/lib/instagram/reel-automation';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';

/**
 * CONTRACT B: POST /api/instagram/dm-context
 * Resolves durable pending Reel campaign for customer, validates human takeover,
 * and generates live wa.me redirection link.
 * Strict Isolation: Reel 1 NEVER returns Reel 2's details!
 * Returns flat top-level JSON object.
 */
export async function POST(request: Request) {
  try {
    const auth = verifyIncomingN8nWebhook(request);
    if (!auth.authorized) {
      return NextResponse.json({ approved: false, error: auth.reason || 'Unauthorized caller' }, { status: 401 });
    }

    const payload = await request.json();
    const result = await evaluateDmContext(payload);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ approved: false, error: msg }, { status: 500 });
  }
}
