import fs from 'fs';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

const envContent = fs.readFileSync('.env.local', 'utf8');
let apiKey = '';
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    if (k === 'N8N_API_KEY') apiKey = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  }
}

async function findFirstExec() {
  const res = await fetch('https://n8n.thebusinesswork.com/api/v1/executions?limit=50', {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  const webhookExecs = (data.data || []).filter(ex => ex.id >= 12115 && ex.mode === 'webhook');
  for (const ex of webhookExecs) {
    const d = await (await fetch(`https://n8n.thebusinesswork.com/api/v1/executions/${ex.id}?includeData=true`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    })).json();
    const run = d.data?.resultData?.runData || {};
    const langNode = run['Language + Name + Business + Purpose'];
    const alert = langNode?.[0]?.data?.main?.[0]?.[0]?.json?.adminAlertPayload;
    const stage = langNode?.[0]?.data?.main?.[0]?.[0]?.json?.sessionStage;
    const phone = langNode?.[0]?.data?.main?.[0]?.[0]?.json?.phone;
    const isNew = run['New WhatsApp Lead?'];
    console.log(`Exec ${ex.id} (${phone}): stage=${stage}, alertPayload=${alert ? 'YES' : 'null'}`);
    if (alert) {
      console.log(`  Payload:`, JSON.stringify(alert));
    }
  }
}
findFirstExec().catch(console.error);
