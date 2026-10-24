import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanAppts() {
  console.log('Cleaning up test appointment from Supabase...');
  await supabase.from('admin_appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Clearing test row from Appointments worksheet via Google Sheets API in n8n...');
  // We can call clear endpoint on Appointments!A2:Z
  // Let's create a quick one-off call or clear via HTTP
  const n8nBase = process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
  const apiKey = process.env.N8N_API_KEY;

  const path = 'tbw-clear-test-appt-' + Date.now();
  const clearWf = {
    name: 'TBW Clear Test Appt',
    nodes: [
      {
        parameters: { path, httpMethod: 'POST', responseMode: 'lastNode' },
        id: 'wh',
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [200, 300]
      },
      {
        parameters: {
          method: 'POST',
          url: 'https://sheets.googleapis.com/v4/spreadsheets/1ic0Dt2UTJ0n2eL_J0BnugEFny8vNCXG1qGf2RGZzHtA/values/Appointments!A2:Z:clear',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'googleSheetsOAuth2Api',
          options: {}
        },
        id: 'clear',
        name: 'Clear Row',
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
      Webhook: { main: [[{ node: 'Clear Row', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  const cRes = await fetch(`${n8nBase}/api/v1/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-N8N-API-KEY': apiKey },
    body: JSON.stringify(clearWf)
  });
  const cData = await cRes.json();
  await fetch(`${n8nBase}/api/v1/workflows/${cData.id}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  await new Promise(r => setTimeout(r, 2000));

  await fetch(`https://n8n.thebusinesswork.com/webhook/${path}`, { method: 'POST' });
  await fetch(`${n8nBase}/api/v1/workflows/${cData.id}`, {
    method: 'DELETE',
    headers: { 'X-N8N-API-KEY': apiKey }
  });

  console.log('Appointments sheet cleared back to header-only state.');
}

cleanAppts().catch(console.error);
