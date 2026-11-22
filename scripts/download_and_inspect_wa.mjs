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
  const wfId = 'VBrjbhPeDypXt12q';
  console.log(`Fetching workflow ${wfId}...`);
  const wf = await fetchN8n(`/workflows/${wfId}`);
  fs.writeFileSync('backups/live_VBrjbhPeDypXt12q_current.json', JSON.stringify(wf, null, 2));
  console.log(`Saved live workflow to backups/live_VBrjbhPeDypXt12q_current.json (${wf.nodes.length} nodes)`);

  // Inspect WhatsApp Trigger and downstream nodes
  const waTrigger = wf.nodes.find(n => n.type.toLowerCase().includes('whatsapptrigger'));
  console.log(`\nWhatsApp Trigger:`, waTrigger ? waTrigger.name : 'NOT FOUND');
  if (waTrigger) {
    console.log(`Parameters:`, JSON.stringify(waTrigger.parameters, null, 2));
  }

  // Trace connections from Incoming WhatsApp Message
  const connections = wf.connections;
  console.log(`\nDirect connections from WhatsApp Trigger:`);
  console.log(JSON.stringify(connections[waTrigger?.name], null, 2));

  // Find all nodes in the WhatsApp chain
  const waNodes = wf.nodes.filter(n => 
    n.name.toLowerCase().includes('whatsapp') || 
    n.name.toLowerCase().includes('wa') ||
    n.name.toLowerCase().includes('message') ||
    n.name.toLowerCase().includes('menu') ||
    n.name.toLowerCase().includes('slot') ||
    n.name.toLowerCase().includes('booking') ||
    n.name.toLowerCase().includes('appointment') ||
    n.name.toLowerCase().includes('welcome')
  );
  console.log(`\nKey related nodes (${waNodes.length}):`);
  for (const n of waNodes) {
    console.log(`- [${n.name}] type: ${n.type}`);
  }
}

run().catch(console.error);
