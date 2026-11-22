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

async function checkRecentExecs() {
  const res = await fetch('https://n8n.thebusinesswork.com/api/v1/executions?limit=60', {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  const list = data.data || [];
  for (const ex of list) {
    if (ex.id >= 12160) {
      console.log(`ID: ${ex.id} | Mode: ${ex.mode} | Status: ${ex.status} | Started: ${ex.startedAt}`);
    }
  }
}
checkRecentExecs().catch(console.error);
