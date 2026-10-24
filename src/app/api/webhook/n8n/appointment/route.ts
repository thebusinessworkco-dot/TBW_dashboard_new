import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyIncomingN8nWebhook } from '@/lib/auth/webhook-auth';

export async function POST(request: Request) {
  try {
    const auth = verifyIncomingN8nWebhook(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized caller' }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const adminSupabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // Extract appointment data supporting both flat and nested structures
    const appt = payload.appointment || payload;
    const customerName = String(appt.name || appt.customer_name || appt.customerName || appt.client_name || 'Client').trim();
    const rawPhone = String(appt.phone_number || appt.phone || appt.contact_info || appt.client_phone || '').trim();
    const contactInfo = rawPhone || customerName;

    const rawSource = String(payload.source || payload.channel || appt.platform || 'whatsapp').toLowerCase();
    const platform = rawSource.includes('insta') ? 'instagram' : 'whatsapp';
    const serviceRequested = String(appt.service_requested || appt.service || appt.title || 'Consultation via Automation').trim();

    // Parse appointment date and time
    let appointmentDate = appt.appointment_date || appt.appointmentDate || '';
    let appointmentTime = appt.appointment_time || appt.appointmentTime || '';

    if (!appointmentDate && (appt.start_at || appt.scheduled_time || appt.start)) {
      const startIso = appt.start_at || appt.scheduled_time || appt.start;
      const d = new Date(startIso);
      if (!isNaN(d.getTime())) {
        appointmentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d); // YYYY-MM-DD
        const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
        appointmentTime = timeFmt.format(d);
        if (appt.end_at || appt.end) {
          const e = new Date(appt.end_at || appt.end);
          if (!isNaN(e.getTime())) {
            appointmentTime += ` - ${timeFmt.format(e)}`;
          }
        }
      }
    }

    if (!appointmentDate) {
      appointmentDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    }
    if (!appointmentTime) {
      appointmentTime = '11:00 AM';
    }

    const calendarEventId = appt.calendar_event_id || appt.calendarEventId || appt.eventId || `AUTO_${Date.now()}`;
    const calendarEventLink = appt.calendar_event_url || appt.calendarEventLink || appt.eventLink || '';
    const status = (appt.status && ['confirmed', 'completed', 'cancelled', 'pending'].includes(String(appt.status).toLowerCase()))
      ? String(appt.status).toLowerCase()
      : 'confirmed';

    const notesParts: string[] = [];
    if (calendarEventLink) notesParts.push(`Google Calendar: ${calendarEventLink}`);
    if (appt.notes) notesParts.push(appt.notes);
    const notes = notesParts.length > 0 ? notesParts.join(' | ') : null;

    if (adminSupabase) {
      try {
        const { data: existing } = await adminSupabase
          .from('admin_appointments')
          .select('id')
          .eq('google_calendar_event_id', calendarEventId)
          .maybeSingle();

        if (existing) {
          await adminSupabase.from('admin_appointments').update({
            customer_name: customerName,
            contact_info: contactInfo,
            platform,
            service_requested: serviceRequested,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            status,
            notes,
            updated_at: nowIso,
          }).eq('id', existing.id);
        } else {
          await adminSupabase.from('admin_appointments').insert({
            customer_name: customerName,
            contact_info: contactInfo,
            platform,
            service_requested: serviceRequested,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            status,
            notes,
            google_calendar_event_id: calendarEventId,
            created_at: nowIso,
            updated_at: nowIso,
            is_demo: false,
          });
        }
      } catch (dbErr) {
        console.warn('Appointment DB upsert warning:', dbErr);
      }
    }

    return NextResponse.json({ success: true, processed: true, timestamp: nowIso });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Appointment processing failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
