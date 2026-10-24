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

async function testOptions() {
  const n8nBase = process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
  const apiKey = process.env.N8N_API_KEY;

  // Let's test a workflow where the Appointments read has onError: "continueErrorOutput"
  // When continueErrorOutput is set, node has 2 outputs: main output and error output!
  const path = 'tbw-test-empty-opt-' + Date.now();
  const testWf = {
    name: 'TBW Test Empty Sheet Handling',
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
          operation: 'read',
          documentId: { __rl: true, value: '1ic0Dt2UTJ0n2eL_J0BnugEFny8vNCXG1qGf2RGZzHtA', mode: 'list' },
          sheetName: { __rl: true, value: 949713765, mode: 'list' },
          options: {}
        },
        id: 'read-appts',
        name: 'Read Appointments',
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4.7,
        position: [400, 300],
        credentials: { googleSheetsOAuth2Api: { id: 'IjyJjGzJP8B9L6U6', name: 'Google Sheets account' } },
        onError: 'continueErrorOutput'
      },
      {
        parameters: {
          mode: 'runOnceForAllItems',
          jsCode: 'return [{ json: { success: true, count: $input.all().length, items: $input.all().map(i => i.json) } }];'
        },
        id: 'code-success',
        name: 'Handle Success Output',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [650, 200]
      },
      {
        parameters: {
          mode: 'runOnceForAllItems',
          jsCode: 'return [{ json: { success: true, count: 0, items: [], note: "empty_sheet" } }];'
        },
        id: 'code-empty',
        name: 'Handle Empty Output',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [650, 400]
      }
    ],
    connections: {
      Webhook: {
        main: [[{ node: 'Read Appointments', type: 'main', index: 0 }]]
      },
      'Read Appointments': {
        main: [
          // Index 0 is standard output
          [{ node: 'Handle Success Output', type: 'main', index: 0 }],
          // Index 1 is error output when onError: "continueErrorOutput"
          [{ node: 'Handle Empty Output', type: 'main', index: 0 }]
        ]
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

testOptions().catch(console.error);
