import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
}

async function testLogInbound() {
  const payload = {
    event_type: 'incoming_whatsapp_message',
    platform: 'whatsapp',
    phone: '918830387174',
    phone_number: '918830387174',
    whatsapp_id: '918830387174',
    contact_name: 'Dipesh',
    direction: 'inbound',
    sender_type: 'customer',
    content: 'Hii',
    external_message_id: 'wamid.test_dipesh_' + Date.now(),
    wa_message_id: 'wamid.test_dipesh_' + Date.now(),
    message_type: 'text',
    timestamp: new Date().toISOString(),
    metadata: {
      message_type: 'text'
    }
  };

  console.log('Sending inbound log for Dipesh (918830387174) to local/live dashboard API...');
  const secret = env.N8N_WEBHOOK_SECRET;
  const res = await fetch('https://dashboard.thebusinesswork.com/api/n8n/webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-Webhook-Secret': secret || '',
      'Authorization': `Bearer ${secret || ''}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Status:', res.status, 'Response:', JSON.stringify(data, null, 2));
}

testLogInbound().catch(console.error);
