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

async function testRead() {
  const n8nBase = process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
  const apiKey = process.env.N8N_API_KEY;

  const path = 'tbw-test-read-sheets-' + Date.now();
  const testWorkflow = {
    name: 'TBW Test Read Google Sheets',
    nodes: [
      {
        parameters: {
          path: path,
          httpMethod: 'GET',
          responseMode: 'lastNode',
          options: {}
        },
        id: 'node-webhook-1',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [250, 300]
      },
      {
        parameters: {
          operation: 'read',
          documentId: {
            __rl: true,
            value: '1ic0Dt2UTJ0n2eL_J0BnugEFny8vNCXG1qGf2RGZzHtA',
            mode: 'list'
          },
          sheetName: {
            __rl: true,
            value: 1811340286,
            mode: 'list'
          },
          options: {}
        },
        id: 'node-sheets-1',
        name: 'Read Leads Sheet',
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4.7,
        position: [480, 300],
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
        main: [
          [
            {
              node: 'Read Leads Sheet',
              type: 'main',
              index: 0
            }
          ]
        ]
      }
    },
    settings: {
      executionOrder: 'v1'
    }
  };

  const createRes = await fetch(`${n8nBase}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey
    },
    body: JSON.stringify(testWorkflow)
  });
  const createdWf = await createRes.json();
  const wfId = createdWf.id;
  console.log('Created workflow ID:', wfId);

  // Activate workflow
  await fetch(`${n8nBase}/api/v1/workflows/${wfId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('Waiting 2s for activation...');
  await new Promise(r => setTimeout(r, 2000));

  try {
    const whRes = await fetch(`https://n8n.thebusinesswork.com/webhook/${path}`);
    console.log('Webhook status:', whRes.status);
    const whData = await whRes.json();
    console.log('Rows count:', Array.isArray(whData) ? whData.length : 'not array');
    console.log('Sample rows:', JSON.stringify(whData).substring(0, 500));
  } finally {
    await fetch(`${n8nBase}/api/v1/workflows/${wfId}`, {
      method: 'DELETE',
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    console.log('Deleted test workflow.');
  }
}

testRead().catch(err => console.error('Error:', err));
