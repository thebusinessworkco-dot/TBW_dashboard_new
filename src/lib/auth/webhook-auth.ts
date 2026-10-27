/**
 * Validates incoming webhook requests from n8n (WhatsApp, Instagram, Monitoring).
 *
 * Rules:
 * 1. N8N_WEBHOOK_SECRET is exclusively used for incoming n8n-to-dashboard webhook authentication.
 * 2. N8N_API_KEY is strictly reserved for dashboard-to-n8n REST API calls.
 * 3. Supports all existing valid header names:
 *    - 'x-n8n-api-key' (sent by n8n Generic Header Auth credentials)
 *    - 'x-tbw-webhook-secret'
 *    - 'authorization' (Bearer <secret> or raw <secret>)
 *    - 'x-internal-secret'
 */
export function verifyIncomingN8nWebhook(
  request: Request,
  allowInternalSecret = false
): { authorized: boolean; reason?: string } {
  const isProduction = process.env.NODE_ENV === 'production';
  const expectedWebhookSecret = process.env.N8N_WEBHOOK_SECRET || (!isProduction ? process.env.N8N_API_KEY : undefined);
  const expectedInternalSecret = allowInternalSecret ? process.env.INTERNAL_API_SECRET : undefined;

  if (!expectedWebhookSecret && !expectedInternalSecret) {
    return {
      authorized: false,
      reason: 'Server misconfiguration: N8N_WEBHOOK_SECRET is not configured on the server.',
    };
  }

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const customKey = request.headers.get('x-n8n-api-key') || '';
  const n8nSecret = request.headers.get('x-n8n-secret') || '';
  const tbwSecret = request.headers.get('x-tbw-webhook-secret') || '';
  const internalHeader = request.headers.get('x-internal-secret') || '';

  const candidates = [customKey, n8nSecret, tbwSecret, bearerToken, internalHeader].filter(Boolean);

  const isAuthorized = candidates.some(
    (cand) =>
      (expectedWebhookSecret && cand === expectedWebhookSecret) ||
      (expectedInternalSecret && cand === expectedInternalSecret)
  );

  if (!isAuthorized) {
    return {
      authorized: false,
      reason: 'Unauthorized n8n caller',
    };
  }

  return { authorized: true };
}
