import fs from 'fs';

async function runRegressionTests() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  let apiKey = '';
  for (const line of envContent.split('\n')) {
    if (line.startsWith('N8N_API_KEY=')) apiKey = line.split('=')[1].trim();
  }

  const n8nBase = 'https://n8n.thebusinesswork.com/api/v1';
  const prodUrl = 'https://dashboard.thebusinesswork.com';

  console.log('=== STEP 1: VERIFYING n8n MONITORING API (USES N8N_API_KEY) ===');
  const wfRes = await fetch(`${n8nBase}/workflows?limit=5`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('n8n REST API Status:', wfRes.status);
  const wfData = await wfRes.json();
  console.log('Workflows accessible via N8N_API_KEY:', wfData.data?.length > 0 ? 'YES' : 'NO');

  // Trigger test runner in n8n to call production dashboard with WhatsApp & Instagram credentials
  console.log('\n=== STEP 2: CREATING LIVE CALLER WORKFLOW USING REAL N8N CREDENTIALS ===');
  const callerWf = {
    name: 'TBW Live Auth Regression Test',
    nodes: [
      {
        id: 'wh-trigger',
        name: 'Trigger',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [200, 300],
        parameters: {
          path: 'tbw-live-auth-regression',
          httpMethod: 'GET',
          responseMode: 'lastNode'
        }
      },
      {
        id: 'wa-mode-check',
        name: 'WhatsApp Mode Check',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [400, 100],
        continueOnFail: true,
        parameters: {
          method: 'GET',
          url: `${prodUrl}/api/webhook/n8n/mode/918604600292`,
          authentication: 'genericCredentialType',
          genericAuthType: 'httpHeaderAuth',
          options: { timeout: 10000 }
        },
        credentials: {
          httpHeaderAuth: { id: 'xhQiNoV6sd96wDLZ', name: 'TBW Dashboard API Auth WhatsApp' }
        }
      },
      {
        id: 'wa-inbound-log',
        name: 'WhatsApp Inbound Log',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [400, 250],
        continueOnFail: true,
        parameters: {
          method: 'POST',
          url: `${prodUrl}/api/n8n/webhook`,
          authentication: 'genericCredentialType',
          genericAuthType: 'httpHeaderAuth',
          sendBody: true,
          specifyBody: 'json',
          jsonBody: JSON.stringify({
            event_type: 'workflow_execution',
            status: 'running',
            workflow_id: 'test_regression'
          }),
          options: { timeout: 10000 }
        },
        credentials: {
          httpHeaderAuth: { id: 'xhQiNoV6sd96wDLZ', name: 'TBW Dashboard API Auth WhatsApp' }
        }
      },
      {
        id: 'ig-dm-context',
        name: 'Instagram DM Context',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [400, 400],
        continueOnFail: true,
        parameters: {
          method: 'POST',
          url: `${prodUrl}/api/instagram/dm-context`,
          authentication: 'genericCredentialType',
          genericAuthType: 'httpHeaderAuth',
          sendBody: true,
          specifyBody: 'json',
          jsonBody: JSON.stringify({
            event_type: 'dm',
            ig_user_id: '3228059197364599',
            text: 'Test check'
          }),
          options: { timeout: 10000 }
        },
        credentials: {
          httpHeaderAuth: { id: 'MGjc0RYjQnPASB58', name: 'TBW Dashboard API Auth Insta' }
        }
      },
      {
        id: 'combine-results',
        name: 'Combine Results',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [700, 250],
        parameters: {
          jsCode: `
            const mode = $('WhatsApp Mode Check').first().json;
            const log = $('WhatsApp Inbound Log').first().json;
            const ig = $('Instagram DM Context').first().json;
            return [{
              json: {
                whatsappModeResult: mode,
                whatsappLogResult: log,
                instagramDmResult: ig
              }
            }];
          `
        }
      }
    ],
    connections: {
      'Trigger': {
        main: [
          [
            { node: 'WhatsApp Mode Check', type: 'main', index: 0 },
            { node: 'WhatsApp Inbound Log', type: 'main', index: 0 },
            { node: 'Instagram DM Context', type: 'main', index: 0 }
          ]
        ]
      },
      'WhatsApp Mode Check': { main: [[{ node: 'Combine Results', type: 'main', index: 0 }]] },
      'WhatsApp Inbound Log': { main: [[{ node: 'Combine Results', type: 'main', index: 0 }]] },
      'Instagram DM Context': { main: [[{ node: 'Combine Results', type: 'main', index: 0 }]] }
    },
    settings: {}
  };

  const createRes = await fetch(`${n8nBase}/workflows`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(callerWf)
  });
  const caller = await createRes.json();
  const callerId = caller.id;
  console.log('Created regression test workflow:', callerId);

  await fetch(`${n8nBase}/workflows/${callerId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('Activated regression test workflow');

  await new Promise(r => setTimeout(r, 2000));

  console.log('\n=== STEP 3: EXECUTING LIVE AUTHENTICATION TEST VIA N8N ===');
  const testRes = await fetch('https://n8n.thebusinesswork.com/webhook/tbw-live-auth-regression');
  const testData = await testRes.json();
  console.log('Results:');
  console.log(JSON.stringify(testData, null, 2));

  // Cleanup
  await fetch(`${n8nBase}/workflows/${callerId}/deactivate`, { method: 'POST', headers: { 'X-N8N-API-KEY': apiKey } });
  await fetch(`${n8nBase}/workflows/${callerId}`, { method: 'DELETE', headers: { 'X-N8N-API-KEY': apiKey } });
  console.log('\nCleaned up regression test workflow.');

  console.log('\n=== STEP 4: NEGATIVE TEST (REST API KEY REJECTED BY WEBHOOK ROUTE) ===');
  const negRes = await fetch(`${prodUrl}/api/webhook/n8n/mode/918604600292`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('Attempt to use N8N_API_KEY as webhook secret -> HTTP Status:', negRes.status, '(Expected: 401)');
}

runRegressionTests().catch(console.error);
