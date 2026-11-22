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

async function list() {
  const res = await fetch('https://n8n.thebusinesswork.com/api/v1/executions?workflowId=VBrjbhPeDypXt12q&limit=25', {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const d = await res.json();
  for (const x of d.data || []) {
    console.log(`ID: ${x.id} | Status: ${x.status} | Mode: ${x.mode} | Started: ${x.startedAt}`);
  }
}

list().catch(console.error);
