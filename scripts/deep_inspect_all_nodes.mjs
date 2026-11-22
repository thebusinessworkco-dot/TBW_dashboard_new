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

async function run() {
  const listRes = await fetch(`${N8N_BASE}/api/v1/workflows?limit=100`, {
    headers: { 'X-N8N-API-KEY': N8N_KEY }
  });
  const list = await listRes.json();
  const workflows = list.data || list;

  const deepReports = [];

  for (const item of workflows) {
    const res = await fetch(`${N8N_BASE}/api/v1/workflows/${item.id}`, {
      headers: { 'X-N8N-API-KEY': N8N_KEY }
    });
    const wf = await res.json();
    
    const nodeTypes = (wf.nodes || []).map(n => ({
      name: n.name,
      type: n.type,
      notes: n.notes || '',
      parameters: n.parameters
    }));

    deepReports.push({
      id: wf.id,
      name: wf.name,
      active: wf.active,
      createdAt: wf.createdAt,
      updatedAt: wf.updatedAt,
      settings: wf.settings,
      nodeCount: (wf.nodes || []).length,
      nodes: nodeTypes
    });
  }

  fs.writeFileSync('scripts/n8n_deep_audit_nodes.json', JSON.stringify(deepReports, null, 2), 'utf8');
  console.log(`Deep node audit written for all ${deepReports.length} workflows.`);
}

run().catch(console.error);
