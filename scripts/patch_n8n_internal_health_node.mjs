import https from 'https';
import fs from 'fs';

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjYTU2YzhhMy04ODQ4LTRmMDQtYjUxZC1lYjBmMGYzNGE1ZjkiLCJpc3MiOiJuOG4iLCJqdGkiOiI5NDc5YzNlMC0wMDcwLTQ1YmItOTVkNC0zNjRiYTY0YmIxYjIiLCJpYXQiOjE3OTI3NjkwMTgsImF1ZCI6InB1YmxpYy1hcGkifQ.mRpbUE_EyBBDcJf7EP-5e4J1usyCXxE5xapr9D6To3U';
const WORKFLOW_ID = 'VBrjbhPeDypXt12q';

const agent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true
});

async function n8nRequestWithRetry(path, method = 'GET', body = null, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : null;
        const opts = {
          hostname: 'n8n.thebusinesswork.com',
          port: 443,
          path: path,
          method: method,
          agent: agent,
          timeout: 45000,
          headers: {
            'X-N8N-API-KEY': API_KEY,
            'Content-Type': 'application/json'
          }
        };
        if (postData) {
          opts.headers['Content-Length'] = Buffer.byteLength(postData);
        } else if (method === 'POST' || method === 'PUT') {
          opts.headers['Content-Length'] = 0;
        }

        const req = https.request(opts, (res) => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        });

        req.on('timeout', () => {
          req.destroy(new Error('Request timed out'));
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
      });

      return res;
    } catch (err) {
      console.warn(`[Attempt ${attempt}/${maxRetries}] Request to ${path} failed: ${err.message}. Retrying in 3s...`);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function patchHealthNode() {
  console.log('=== APPLYING FIX 1: UPDATE MONITOR HEALTHZ NODE TO INTERNAL LOOPBACK ===\n');

  // 1. Fetch live workflow
  console.log('1. Fetching live workflow VBrjbhPeDypXt12q...');
  const res = await n8nRequestWithRetry(`/api/v1/workflows/${WORKFLOW_ID}`);
  if (res.status !== 200 || !res.data) {
    throw new Error(`Failed to fetch workflow: HTTP ${res.status}`);
  }

  const wf = res.data.data || res.data;
  console.log(`Retrieved workflow: "${wf.name}" (${wf.nodes.length} nodes, active: ${wf.active})`);

  // 2. Create timestamped backup
  const backupPath = `backups/live_VBrjbhPeDypXt12q_pre_healthz_fix_${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(wf, null, 2));
  console.log(`2. Backup saved to: ${backupPath}`);

  // 3. Find and inspect node "Monitor - n8n Healthz"
  const targetNode = wf.nodes.find(n => n.name === 'Monitor - n8n Healthz');
  if (!targetNode) {
    throw new Error('Node "Monitor - n8n Healthz" not found in workflow!');
  }

  console.log('Current parameters of target node:');
  console.log(JSON.stringify(targetNode.parameters, null, 2));

  // 4. Update URL to internal loopback
  const oldUrl = targetNode.parameters.url;
  targetNode.parameters.url = 'http://127.0.0.1:5678/healthz';
  console.log(`\nUpdated URL: "${oldUrl}" -> "${targetNode.parameters.url}"`);

  // 5. Deploy updated workflow
  console.log('\n3. Deploying updated workflow to n8n...');
  const updatePayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const updateRes = await n8nRequestWithRetry(`/api/v1/workflows/${WORKFLOW_ID}`, 'PUT', updatePayload);
  console.log('Update status:', updateRes.status);
  if (updateRes.status !== 200) {
    throw new Error(`Failed to update workflow: HTTP ${updateRes.status}`);
  }

  // 6. Refresh activation seamlessly
  if (wf.active) {
    console.log('Refreshing activation seamlessly...');
    await n8nRequestWithRetry(`/api/v1/workflows/${WORKFLOW_ID}/deactivate`, 'POST');
    await n8nRequestWithRetry(`/api/v1/workflows/${WORKFLOW_ID}/activate`, 'POST');
    console.log('Workflow reactivation complete.');
  }

  console.log('\n✅ FIX 1 APPLIED SUCCESSFULLY WITH ZERO DOWNTIME!');
}

patchHealthNode().catch(console.error);
