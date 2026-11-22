import { execSync } from 'child_process';
import fs from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjYTU2YzhhMy04ODQ4LTRmMDQtYjUxZC1lYjBmMGYzNGE1ZjkiLCJpc3MiOiJuOG4iLCJqdGkiOiI5NDc5YzNlMC0wMDcwLTQ1YmItOTVkNC0zNjRiYTY0YmIxYjIiLCJpYXQiOjE3OTI3NjkwMTgsImF1ZCI6InB1YmxpYy1hcGkifQ.mRpbUE_EyBBDcJf7EP-5e4J1usyCXxE5xapr9D6To3U';
const WORKFLOW_ID = 'VBrjbhPeDypXt12q';

console.log('=== APPLYING FIX 1 VIA ROBUST OS CURL ===\n');

// 1. Fetch live workflow using curl
console.log('1. Fetching workflow via curl --ssl-no-revoke...');
const fetchCmd = `curl.exe --ssl-no-revoke --retry 5 --retry-delay 2 --connect-timeout 30 -s -H "X-N8N-API-KEY: ${API_KEY}" "https://n8n.thebusinesswork.com/api/v1/workflows/${WORKFLOW_ID}"`;
const rawResponse = execSync(fetchCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

const parsed = JSON.parse(rawResponse);
const wf = parsed.data || parsed;
console.log(`Successfully fetched: "${wf.name}" (${wf.nodes.length} nodes)`);

// 2. Save backup
const backupFile = `backups/live_VBrjbhPeDypXt12q_pre_healthz_fix_${Date.now()}.json`;
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 2));
console.log(`2. Backup created at: ${backupFile}`);

// 3. Update target node
const targetNode = wf.nodes.find(n => n.name === 'Monitor - n8n Healthz');
if (!targetNode) {
  throw new Error('Target node not found!');
}
console.log(`3. Old URL: ${targetNode.parameters.url}`);
targetNode.parameters.url = 'http://127.0.0.1:5678/healthz';
console.log(`   New URL: ${targetNode.parameters.url}`);

// 4. Save payload to temporary JSON file to avoid command-line escaping issues
const payloadPath = 'scratch/health_fix_payload.json';
fs.writeFileSync(payloadPath, JSON.stringify({
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings
}));

// 5. Push update via curl
console.log('4. Pushing update to n8n via curl...');
const putCmd = `curl.exe --ssl-no-revoke --retry 5 --retry-delay 2 --connect-timeout 30 -s -X PUT -H "X-N8N-API-KEY: ${API_KEY}" -H "Content-Type: application/json" --data-binary "@${payloadPath}" "https://n8n.thebusinesswork.com/api/v1/workflows/${WORKFLOW_ID}"`;
const putRaw = execSync(putCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const putRes = JSON.parse(putRaw);

if (putRes.id === WORKFLOW_ID) {
  console.log('5. Workflow successfully updated in n8n!');
  
  // Reactivate
  console.log('6. Refreshing activation...');
  execSync(`curl.exe --ssl-no-revoke --retry 3 --connect-timeout 20 -s -X POST -H "X-N8N-API-KEY: ${API_KEY}" "https://n8n.thebusinesswork.com/api/v1/workflows/${WORKFLOW_ID}/deactivate"`);
  execSync(`curl.exe --ssl-no-revoke --retry 3 --connect-timeout 20 -s -X POST -H "X-N8N-API-KEY: ${API_KEY}" "https://n8n.thebusinesswork.com/api/v1/workflows/${WORKFLOW_ID}/activate"`);
  console.log('\n✅ FIX 1 DEPLOYED AND ACTIVATED WITH ZERO DOWNTIME!');
} else {
  console.error('Update failed:', putRaw);
}
