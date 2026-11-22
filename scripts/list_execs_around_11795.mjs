import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
let apiKey = '';
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const k = line.slice(0, idx).trim();
    if (k === 'N8N_API_KEY') {
      apiKey = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

async function listExecs() {
  const res = await fetch('https://n8n.thebusinesswork.com/api/v1/executions?workflowId=VBrjbhPeDypXt12q&limit=30', {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  if (res.ok) {
    const d = await res.json();
    console.log('Executions around 11795:');
    for (const e of d.data || []) {
      if (Number(e.id) >= 11785 && Number(e.id) <= 11800) {
        console.log(`ID: ${e.id}, Status: ${e.status}, Mode: ${e.mode}, Started: ${e.startedAt}`);
      }
    }
  }
}

listExecs().catch(console.error);
