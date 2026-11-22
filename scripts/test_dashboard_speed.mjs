import fs from 'fs';

async function test(name, url, method = 'GET', body = null) {
  const t0 = Date.now();
  try {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-webhook-secret': 'tbw_n8n_sec_prod_9941a87e02b3'
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    const duration = Date.now() - t0;
    console.log(`[${name}] Status: ${res.status} | Time: ${duration}ms | Preview: ${text.slice(0, 100)}`);
  } catch (err) {
    console.log(`[${name}] FAILED after ${Date.now() - t0}ms: ${err.message}`);
  }
}

async function run() {
  await test('Check AI / Human Mode', 'https://dashboard.thebusinesswork.com/api/webhook/n8n/mode/917821840347');
  await test('Log Inbound to Dashboard', 'https://dashboard.thebusinesswork.com/api/n8n/webhook', 'POST', {
    event_type: 'incoming_whatsapp_message',
    phone: '917821840347',
    content: 'ping test',
    timestamp: new Date().toISOString()
  });
  await test('WA - Dashboard State Event', 'https://dashboard.thebusinesswork.com/api/webhook/n8n/event', 'POST', {
    event_type: 'whatsapp_state',
    phone: '917821840347',
    stage: 'test',
    timestamp: new Date().toISOString()
  });
}

run().catch(console.error);
