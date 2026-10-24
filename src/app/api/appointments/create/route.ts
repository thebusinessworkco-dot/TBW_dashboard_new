import { NextResponse } from 'next/server';
import { createAppointmentInGoogleSheetsAndCalendar } from '@/lib/sheets/google-sheets-sync';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const customerName = String(body.customerName || body.clientName || '').trim();
    const phone = String(body.phone || body.contactInfo || '').trim();
    const service = String(body.service || body.serviceRequested || 'Consultation').trim();
    const appointmentDate = String(body.appointmentDate || body.date || '').trim();
    const startTimeIST = String(body.startTimeIST || body.time || '11:00 AM').trim();
    const endTimeIST = String(body.endTimeIST || '11:30 AM').trim();
    const source = (body.source || body.platform || 'whatsapp') as 'whatsapp' | 'instagram' | 'dashboard';
    const notes = String(body.notes || '').trim();

    if (!customerName) {
      return NextResponse.json({ success: false, error: 'Customer name is required' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone or contact information is required' }, { status: 400 });
    }
    if (!appointmentDate) {
      return NextResponse.json({ success: false, error: 'Appointment date is required (YYYY-MM-DD)' }, { status: 400 });
    }

    // Convert IST date and time to ISO strings
    // Format of appointmentDate is YYYY-MM-DD
    // Format of startTimeIST is e.g. "11:00 AM" or "02:30 PM"
    const parseTime = (timeStr: string) => {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return { hours: 11, minutes: 0 };
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = (match[3] || 'AM').toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return { hours: h, minutes: m };
    };

    const s = parseTime(startTimeIST);
    const e = parseTime(endTimeIST);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startTimeISO = `${appointmentDate}T${pad(s.hours)}:${pad(s.minutes)}:00+05:30`;
    const endTimeISO = `${appointmentDate}T${pad(e.hours)}:${pad(e.minutes)}:00+05:30`;

    const result = await createAppointmentInGoogleSheetsAndCalendar({
      customerName,
      phone,
      service,
      appointmentDate,
      startTimeIST,
      endTimeIST,
      startTimeISO,
      endTimeISO,
      source,
      notes,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      calendarEventId: result.calendarEventId,
      calendarEventLink: result.calendarEventLink,
      appointment: {
        customerName,
        phone,
        service,
        appointmentDate,
        startTimeIST,
        endTimeIST,
        status: 'confirmed',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create appointment';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
