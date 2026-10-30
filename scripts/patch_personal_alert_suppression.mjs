import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

async function main() {
  console.log('Fetching workflow IMtvrfNi2mBjwxOS...');
  const res = await fetch('https://n8n.thebusinesswork.com/api/v1/workflows/IMtvrfNi2mBjwxOS', {
    headers: { 'X-N8N-API-KEY': env.N8N_API_KEY }
  });
  const data = await res.json();

  // 1. Patch 04c
  const n04c = data.nodes.find(n => n.name === '04c - Evaluate Takeover State');
  let c04c = n04c.parameters.jsCode;

  const suppressCode04c = `
// ─── ADMIN / PERSONAL NUMBERS ALERT SUPPRESSION ───
const EXCLUDED_ALERT_PHONES = ['7821840347', '8604600292', '7972020292'];
const isPersonalNumber = EXCLUDED_ALERT_PHONES.some(p => String(original.phone || '').endsWith(p));
if (isPersonalNumber) {
  original.adminAlertPayload = null;
  original.shouldAlertOnStart = false;
}
`;

  if (!c04c.includes('EXCLUDED_ALERT_PHONES')) {
    c04c = c04c.replace(
      '// ─── DASHBOARD CONTACT CHECK',
      suppressCode04c + '\n// ─── DASHBOARD CONTACT CHECK'
    );
    c04c = c04c.replace(
      'if (!original.adminAlertPayload) {',
      'if (!isPersonalNumber && !original.adminAlertPayload) {'
    );
  }

  // 2. Patch 12c
  const n12c = data.nodes.find(n => n.name === '12c - Process AI Response');
  let c12c = n12c.parameters.jsCode;
  const suppressCode12c = `
  // Suppress alerts for personal numbers
  const EXCLUDED_ALERT_PHONES = ['7821840347', '8604600292', '7972020292'];
  if (EXCLUDED_ALERT_PHONES.some(p => String(x.phone || '').endsWith(p))) {
    x.adminAlertPayload = null;
    x.aiHumanAlert = null;
  }
`;
  if (!c12c.includes('EXCLUDED_ALERT_PHONES')) {
    c12c = c12c.replace(
      'const _sessionContext = x;',
      suppressCode12c + '\nconst _sessionContext = x;'
    );
  }

  // Validate JavaScript syntax
  new Function(c04c);
  console.log('Node 04c code syntax: VALID');
  new Function(c12c);
  console.log('Node 12c code syntax: VALID');

  n04c.parameters.jsCode = c04c;
  n12c.parameters.jsCode = c12c;

  console.log('Deploying updated workflow to n8n...');
  const putRes = await fetch('https://n8n.thebusinesswork.com/api/v1/workflows/IMtvrfNi2mBjwxOS', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': env.N8N_API_KEY
    },
    body: JSON.stringify({
      name: data.name,
      nodes: data.nodes,
      connections: data.connections,
      settings: data.settings
    })
  });

  const putData = await putRes.json();
  if (putRes.ok) {
    console.log('SUCCESS: Deployed personal alert suppression to live WhatsApp workflow (IMtvrfNi2mBjwxOS)!');
  } else {
    console.error('ERROR deploying to n8n:', putData);
  }
}

main().catch(console.error);
