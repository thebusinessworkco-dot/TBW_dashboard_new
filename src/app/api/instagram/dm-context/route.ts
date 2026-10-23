import { NextResponse } from 'next/server';
import { evaluateDmContext } from '@/lib/instagram/reel-automation';

/**
 * CONTRACT B: POST /api/instagram/dm-context
 * Resolves durable pending Reel campaign for customer, validates human takeover,
 * and generates live wa.me redirection link.
 * Strict Isolation: Reel 1 NEVER returns Reel 2's details!
 * Returns flat top-level JSON object.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const customSecret = request.headers.get('x-tbw-webhook-secret') || request.headers.get('x-n8n-api-key') || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();

    const expectedSecret = process.env.N8N_WEBHOOK_SECRET || process.env.N8N_API_KEY;
    if (expectedSecret) {
      if (bearer !== expectedSecret && customSecret !== expectedSecret) {
        return NextResponse.json({ approved: false, error: 'Unauthorized caller' }, { status: 401 });
      }
    }

    const payload = await request.json();
    const result = await evaluateDmContext(payload);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ approved: false, error: msg }, { status: 500 });
  }
}
