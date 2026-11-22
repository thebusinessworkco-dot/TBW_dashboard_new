import fs from 'fs';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
});

async function main() {
  const base = env.N8N_API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const res = await fetch(`${base}/api/v1/workflows/VBrjbhPeDypXt12q`, {
    headers: { 'X-N8N-API-KEY': env.N8N_API_KEY }
  });
  const wf = await res.json();
  const whs = wf.nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
  console.log('Webhooks in VBrjbhPeDypXt12q:');
  for (const w of whs) {
    console.log(`- "${w.name}" | path: "${w.parameters?.path}" | method: "${w.parameters?.httpMethod}"`);
  }
}
main().catch(console.error);
