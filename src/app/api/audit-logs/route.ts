import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAuditLog } from '@/lib/audit';


export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database unavailable' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '25', 10)));
    const action = searchParams.get('action') || 'ALL';
    const entity = searchParams.get('entity') || 'ALL';
    const search = (searchParams.get('search') || '').trim();

    let query = supabase
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (action !== 'ALL') {
      query = query.eq('action', action);
    }

    if (entity !== 'ALL') {
      query = query.eq('target_entity', entity);
    }

    if (search) {
      // Filter by admin_email or target_id or action or metadata text
      query = query.or(`admin_email.ilike.%${search}%,target_id.ilike.%${search}%,action.ilike.%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data, count, error } = await query.range(from, to);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      logs: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, targetEntity, targetId, metadata, adminEmail } = body;

    if (!action || !targetEntity) {
      return NextResponse.json(
        { success: false, error: 'action and targetEntity are required' },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;

    const result = await recordAuditLog({
      action,
      targetEntity,
      targetId,
      metadata,
      adminEmail,
      ipAddress,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, log: result.data });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Audit log write failed' },
      { status: 500 }
    );
  }
}
