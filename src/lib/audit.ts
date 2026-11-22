import { createAdminClient } from '@/lib/supabase/admin';

export interface RecordAuditParams {
  action: string;
  targetEntity: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  adminEmail?: string;
  adminUserId?: string;
  ipAddress?: string;
}

/**
 * Records an immutable administrative audit log entry in Supabase.
 * Strips any sensitive credentials, tokens or passwords from metadata.
 */
export async function recordAuditLog(params: RecordAuditParams) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      console.warn('[AUDIT_LOG] Supabase admin client not initialized');
      return { success: false, error: 'Database unavailable' };
    }

    // Sanitize metadata to never store secrets or tokens
    const sanitizedMetadata: Record<string, unknown> = {};
    if (params.metadata && typeof params.metadata === 'object') {
      for (const [key, val] of Object.entries(params.metadata)) {
        if (/token|secret|password|key|auth|bearer/i.test(key)) {
          sanitizedMetadata[key] = '[REDACTED]';
        } else {
          sanitizedMetadata[key] = val;
        }
      }
    }

    const payload = {
      action: params.action,
      target_entity: params.targetEntity,
      target_id: params.targetId || null,
      metadata: sanitizedMetadata,
      admin_email: params.adminEmail || 'thebusinesswork.co@gmail.com',
      admin_user_id: params.adminUserId || '92318d7c-0b0d-40a2-942f-002d425fcb73',
      ip_address: params.ipAddress || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('admin_audit_logs')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[AUDIT_LOG_ERROR]', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: unknown) {
    console.error('[AUDIT_LOG_EXCEPTION]', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Audit log write failed',
    };
  }
}
