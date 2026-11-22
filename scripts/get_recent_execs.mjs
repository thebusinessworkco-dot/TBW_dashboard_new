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

async function run() {
  const res = await fetch('https://n8n.thebusinesswork.com/api/v1/executions?limit=15', {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  console.log('Executions:');
  for (const ex of data.data || []) {
    const duration = ex.stoppedAt ? (new Date(ex.stoppedAt).getTime() - new Date(ex.startedAt).getTime()) + 'ms' : 'running...';
    console.log(`ID: ${ex.id} | Status: ${ex.status} | Mode: ${ex.mode} | Started: ${ex.startedAt} | Duration: ${duration} | WF: ${ex.workflowId}`);
  }
}
run().catch(console.error);
