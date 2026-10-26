import { NextResponse } from 'next/server';
import { deleteContactSafely } from '@/lib/whatsapp/session-manager';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const phone = body.phone || id;
    const adminEmail = body.admin_email || 'thebusinesswork.co@gmail.com';

    // 1. Check if contact has active appointments before deletion
    const adminSupabase = createAdminClient();
    const cleanPhone = String(phone).replace(/\D/g, '');
    let confirmedAppointments: Array<{ id: string; appointment_date: string; appointment_time: string; service_requested: string }> = [];

    if (adminSupabase && cleanPhone) {
      try {
        const { data: appts } = await adminSupabase
          .from('admin_appointments')
          .select('id, appointment_date, appointment_time, service_requested')
          .or(`contact_info.eq.${cleanPhone},contact_info.eq.+${cleanPhone}`)
          .eq('status', 'confirmed');

        if (appts) {
          confirmedAppointments = appts;
        }
      } catch {
        // Fallback
      }
    }

    // 2. Execute safe deletion
    const result = await deleteContactSafely(cleanPhone || id, adminEmail);

    return NextResponse.json({
      success: true,
      message: 'Contact profile and active sessions successfully deleted from active CRM.',
      contact_id: result.contactId,
      phone: result.normalizedPhone,
      confirmed_appointments_preserved: confirmedAppointments.length,
      appointments_preserved_notice:
        confirmedAppointments.length > 0
          ? `${confirmedAppointments.length} confirmed Google Calendar appointment(s) remain safely preserved and protected.`
          : 'No active appointments affected.',
      deleted_at: new Date().toISOString(),
      future_treatment: 'Subsequent inbound messages from this number will be treated strictly as NEW_CUSTOMER.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete contact';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
