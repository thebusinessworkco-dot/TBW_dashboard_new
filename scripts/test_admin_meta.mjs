import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
let token = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('WHATSAPP_TOKEN=')) token = line.slice(15).trim().replace(/^['"]|['"]$/g, '');
}

async function testAdmin() {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '918604600292',
    type: 'text',
    text: { preview_url: true, body: '🔔 Admin Alert Test from The Business Work' }
  };
  console.log('Sending test to 918604600292 via v26.0...');
  const res = await fetch('https://graph.facebook.com/v26.0/1392092143987065/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log('Result:', JSON.stringify(data));
}
testAdmin().catch(console.error);
