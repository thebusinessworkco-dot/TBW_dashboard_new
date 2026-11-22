import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}
loadEnv();

const N8N_BASE = process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
const N8N_KEY = process.env.N8N_API_KEY;

async function fetchN8n(endpoint) {
  const url = `${N8N_BASE}/api/v1${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'X-N8N-API-KEY': N8N_KEY,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} on ${endpoint}`);
  }
  return res.json();
}

async function run() {
  const listData = await fetchN8n('/workflows?limit=100');
  const workflows = listData.data || listData;
  console.log(`Total workflows: ${workflows.length}`);
  
  const activeWfs = workflows.filter(w => w.active);
  console.log(`Active workflows (${activeWfs.length}):`);
  for (const w of activeWfs) {
    console.log(`- [${w.id}] "${w.name}" (active: ${w.active}, updatedAt: ${w.updatedAt})`);
    const full = await fetchN8n(`/workflows/${w.id}`);
    const triggers = (full.nodes || []).filter(n => 
      n.type.toLowerCase().includes('trigger') || 
      n.type.toLowerCase().includes('webhook') ||
      n.type.toLowerCase().includes('whatsapp')
    );
    console.log(`  Triggers / Webhooks (${triggers.length}):`);
    for (const t of triggers) {
      console.log(`    * [${t.name}] type: ${t.type}, path: ${t.parameters?.path || t.parameters?.webhookPath || 'N/A'}`);
    }
  }
}

run().catch(console.error);
