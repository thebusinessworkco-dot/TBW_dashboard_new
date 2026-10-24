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

async function testHttpSheets() {
  const n8nBase = process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
  const apiKey = process.env.N8N_API_KEY;

  const path = 'tbw-test-http-sheets-' + Date.now();
  const testWf = {
    name: 'TBW Test HTTP Sheets',
    nodes: [
      {
        parameters: { path: path, httpMethod: 'GET', responseMode: 'lastNode' },
        id: 'wh',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [200, 300]
      },
      {
        parameters: {
          method: 'GET',
          url: 'https://sheets.googleapis.com/v4/spreadsheets/1ic0Dt2UTJ0n2eL_J0BnugEFny8vNCXG1qGf2RGZzHtA/values/Appointments!A1:Z',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'googleSheetsOAuth2Api',
          options: {}
        },
        id: 'http-sheet',
        name: 'Get Appointments via HTTP',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [420, 300],
        credentials: {
          googleSheetsOAuth2Api: {
            id: 'IjyJjGzJP8B9L6U6',
            name: 'Google Sheets account'
          }
        }
      }
    ],
    connections: {
      Webhook: {
        main: [[{ node: 'Get Appointments via HTTP', type: 'main', index: 0 }]]
      }
    },
    settings: { executionOrder: 'v1' }
  };

  const createRes = await fetch(`${n8nBase}/api/v1/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': apiKey },
    body: JSON.stringify(testWf)
  });
  const created = await createRes.json();
  const id = created.id;
  console.log('Created wf:', id);

  await fetch(`${n8nBase}/api/v1/workflows/${id}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  await new Promise(r => setTimeout(r, 2000));

  try {
    const res = await fetch(`https://n8n.thebusinesswork.com/webhook/${path}`);
    console.log('Result status:', res.status);
    const data = await res.json();
    console.log('Result data:', JSON.stringify(data, null, 2));
  } finally {
    await fetch(`${n8nBase}/api/v1/workflows/${id}`, {
      method: 'DELETE',
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    console.log('Deleted test wf.');
  }
}

testHttpSheets().catch(console.error);
