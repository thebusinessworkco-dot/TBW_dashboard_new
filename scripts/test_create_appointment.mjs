import fs from 'fs';

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

async function testCreateAppointment() {
  // Let's create a test appointment for tomorrow
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dateStr = tomorrow.toISOString().split('T')[0];
  const startTimeISO = `${dateStr}T11:00:00+05:30`;
  const endTimeISO = `${dateStr}T11:30:00+05:30`;

  const payload = {
    action: 'create_appointment',
    appointment: {
      customerName: 'Aman Test Client',
      phone: '+918604600292',
      service: 'AI Agents & Chatbots Consultation',
      appointmentDate: dateStr,
      startTimeIST: '11:00 AM',
      endTimeIST: '11:30 AM',
      startTimeISO,
      endTimeISO,
      durationMinutes: 30,
      source: 'WhatsApp',
      notes: 'Initial requirements discussion for automation.'
    }
  };

  console.log('Dispatching test appointment creation to n8n sync engine...');
  const res = await fetch('https://n8n.thebusinesswork.com/webhook/tbw-google-sheets-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  console.log('Create appt response status:', res.status);
  const data = await res.json();
  console.log('Create appt result:', JSON.stringify(data, null, 2));
}

testCreateAppointment().catch(console.error);
