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

async function readAllSheets() {
  const n8nBase = process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
  const apiKey = process.env.N8N_API_KEY;

  const path = 'tbw-read-all-sheets-' + Date.now();
  const testWorkflow = {
    name: 'TBW Read All Sheets Sync Worker',
    nodes: [
      {
        parameters: {
          path: path,
          httpMethod: 'POST',
          responseMode: 'lastNode',
          options: {}
        },
        id: 'wh-in',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [200, 300]
      },
      {
        parameters: {
          operation: 'read',
          documentId: { __rl: true, value: '1ic0Dt2UTJ0n2eL_J0BnugEFny8vNCXG1qGf2RGZzHtA', mode: 'list' },
          sheetName: { __rl: true, value: 1811340286, mode: 'list' },
          options: {}
        },
        id: 'read-leads',
        name: 'Read Website Leads',
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4.7,
        position: [420, 300],
        credentials: { googleSheetsOAuth2Api: { id: 'IjyJjGzJP8B9L6U6', name: 'Google Sheets account' } },
        continueOnFail: true
      },
      {
        parameters: {
          operation: 'read',
          documentId: { __rl: true, value: '1ic0Dt2UTJ0n2eL_J0BnugEFny8vNCXG1qGf2RGZzHtA', mode: 'list' },
          sheetName: { __rl: true, value: 671996512, mode: 'list' },
          options: {}
        },
        id: 'read-wa',
        name: 'Read WhatsApp Leads',
        type: 'n8n-nodes-base.googleSheets',
        typeVersion: 4.7,
        position: [640, 300],
        credentials: { googleSheetsOAuth2Api: { id: 'IjyJjGzJP8B9L6U6', name: 'Google Sheets account' } },
        continueOnFail: true
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
        position: [860, 300],
        credentials: { googleSheetsOAuth2Api: { id: 'IjyJjGzJP8B9L6U6', name: 'Google Sheets account' } },
        continueOnFail: true
      },
      {
        parameters: {
          mode: 'runOnceForAllItems',
          jsCode: `
            let leads = [];
            try { leads = $('Read Website Leads').all().map(i => i.json); } catch(e){}
            let wa = [];
            try { wa = $('Read WhatsApp Leads').all().map(i => i.json); } catch(e){}
            let appts = [];
            try { appts = $('Read Appointments').all().map(i => i.json); } catch(e){}
            return [{
              json: {
                success: true,
                websiteLeads: leads,
                whatsappLeads: wa,
                appointments: appts
              }
            }];
          `
        },
        id: 'combine',
        name: 'Combine Data',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1080, 300]
      }
    ],
    connections: {
      Webhook: {
        main: [[{ node: 'Read Website Leads', type: 'main', index: 0 }]]
      },
      'Read Website Leads': {
        main: [[{ node: 'Read WhatsApp Leads', type: 'main', index: 0 }]]
      },
      'Read WhatsApp Leads': {
        main: [[{ node: 'Read Appointments', type: 'main', index: 0 }]]
      },
      'Read Appointments': {
        main: [[{ node: 'Combine Data', type: 'main', index: 0 }]]
      }
    },
    settings: { executionOrder: 'v1' }
  };

  const createRes = await fetch(`${n8nBase}/api/v1/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': apiKey },
    body: JSON.stringify(testWorkflow)
  });
  const createdWf = await createRes.json();
  const wfId = createdWf.id;
  console.log('Created sync workflow ID:', wfId);

  await fetch(`${n8nBase}/api/v1/workflows/${wfId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  await new Promise(r => setTimeout(r, 2000));

  try {
    const whRes = await fetch(`https://n8n.thebusinesswork.com/webhook/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log('Webhook status:', whRes.status);
    const result = await whRes.json();
    fs.writeFileSync('scripts/master_sheets_snapshot.json', JSON.stringify(result, null, 2));
    console.log('Snapshot written to scripts/master_sheets_snapshot.json');
    console.log('Website leads count:', result.websiteLeads?.length);
    console.log('WhatsApp leads count:', result.whatsappLeads?.length);
    console.log('Appointments count:', result.appointments?.length);
    console.log('Website sample:', result.websiteLeads);
    console.log('WhatsApp sample:', result.whatsappLeads);
    console.log('Appointments sample:', result.appointments);
  } finally {
    await fetch(`${n8nBase}/api/v1/workflows/${wfId}`, {
      method: 'DELETE',
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    console.log('Deleted temp sync workflow.');
  }
}

readAllSheets().catch(err => console.error('Error:', err));
