import fs from 'fs';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  }
});

async function patch() {
  const url = `${env.N8N_API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/api/v1/workflows/VBrjbhPeDypXt12q`;
  const getRes = await fetch(url, { headers: { 'X-N8N-API-KEY': env.N8N_API_KEY } });
  const wf = await getRes.json();

  const node = wf.nodes.find(n => n.name === 'Trigger WhatsApp Session Monitor');
  if (node) {
    node.continueOnFail = true;
    node.parameters.options ??= {};
    node.parameters.options.timeout = 4000;
    console.log('Set continueOnFail: true and timeout: 4000 on Trigger WhatsApp Session Monitor.');
  }

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': env.N8N_API_KEY
    },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: wf.settings || {}
    })
  });

  if (putRes.ok) {
    console.log('Successfully updated Trigger WhatsApp Session Monitor on live workflow!');
  } else {
    console.error('Update failed:', await putRes.text());
  }
}

patch().catch(console.error);
