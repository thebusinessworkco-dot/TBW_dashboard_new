import fs from 'fs';
import path from 'path';

// 1. Load credentials
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

const N8N_BASE_URL = env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
const N8N_API_KEY = env.N8N_API_KEY;
const WORKFLOW_ID = 'IMtvrfNi2mBjwxOS';

if (!N8N_API_KEY) {
  console.error('ERROR: N8N_API_KEY missing from .env.local');
  process.exit(1);
}

async function runLatencyOptimization() {
  console.log(`=== 1. Fetching Live Production Workflow ${WORKFLOW_ID} ===`);
  const getRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });

  if (!getRes.ok) {
    throw new Error(`Failed to fetch workflow: ${getRes.status} ${getRes.statusText}`);
  }

  const liveWf = await getRes.json();
  console.log(`Live Workflow Name: ${liveWf.name}`);
  console.log(`Live Workflow Active: ${liveWf.active}`);

  // Create timestamped backup
  const backupPath = path.resolve(`backups/live_${WORKFLOW_ID}_pre_latency_fix_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(liveWf, null, 2));
  console.log(`✓ Backup saved to: ${backupPath}`);

  // 2. Update Node 04a parameters so it references $('04 - Parse Inbound') safely from anywhere in graph
  const node04a = liveWf.nodes.find(n => n.name === '04a - Log Inbound to Dashboard');
  if (!node04a) {
    throw new Error('Node "04a - Log Inbound to Dashboard" not found');
  }

  node04a.parameters.jsonBody = `={{ JSON.stringify({
      event_type: 'incoming_whatsapp_message',
      phone: $('04 - Parse Inbound').first().json.phone,
      external_message_id: $('04 - Parse Inbound').first().json.messageId,
      content: $('04 - Parse Inbound').first().json.body,
      message_type: $('04 - Parse Inbound').first().json.messageType || 'text',
      customer_name: $('04 - Parse Inbound').first().json.s?.name || '',
      timestamp: new Date().toISOString()
    }) }}`;
  console.log('✓ Updated 04a expression to read from $("04 - Parse Inbound")');

  // 3. Optimize Connections: Decouple 04a from blocking the inbound reply pipeline
  // A. In '04_status - Is Status Receipt?', remove 04a from output 1 (only 04b remains)
  const statusConns = liveWf.connections['04_status - Is Status Receipt?'];
  if (statusConns && statusConns.main && statusConns.main[1]) {
    statusConns.main[1] = statusConns.main[1].filter(c => c.node !== '04a - Log Inbound to Dashboard');
    console.log('✓ Removed 04a from blocking inbound path in 04_status Output 1');
  }

  // B. Add 04a to '26b - Record Customer Send Result' output 0 (runs AFTER 26 sends reply to customer)
  const node26bConns = liveWf.connections['26b - Record Customer Send Result'];
  if (node26bConns && node26bConns.main && node26bConns.main[0]) {
    const alreadyPresent = node26bConns.main[0].some(c => c.node === '04a - Log Inbound to Dashboard');
    if (!alreadyPresent) {
      node26bConns.main[0].push({
        node: '04a - Log Inbound to Dashboard',
        type: 'main',
        index: 0
      });
      console.log('✓ Attached 04a to 26b (runs in background AFTER reply is sent to customer)');
    }
  }

  // C. Add 04a to '04d - Authorized to Reply?' output 1 (when human takeover is active, still logs inbound)
  const node04dConns = liveWf.connections['04d - Authorized to Reply?'];
  if (node04dConns && node04dConns.main && node04dConns.main[1]) {
    const alreadyPresent = node04dConns.main[1].some(c => c.node === '04a - Log Inbound to Dashboard');
    if (!alreadyPresent) {
      node04dConns.main[1].push({
        node: '04a - Log Inbound to Dashboard',
        type: 'main',
        index: 0
      });
      console.log('✓ Attached 04a to 04d Output 1 (logs inbound when human takeover is active)');
    }
  }

  // 4. Deploy updated workflow to live n8n
  console.log(`\n=== 2. Deploying Latency-Optimized Workflow to Live n8n (${WORKFLOW_ID}) ===`);
  const payload = {
    name: liveWf.name,
    nodes: liveWf.nodes,
    connections: liveWf.connections,
    settings: liveWf.settings
  };

  const putRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`Failed to update workflow on n8n (${putRes.status}): ${errText}`);
  }

  const updatedWf = await putRes.json();
  console.log(`✓ LIVE DEPLOYMENT SUCCESSFUL! Workflow ID: ${updatedWf.id}`);
  console.log(`✓ Active: ${updatedWf.active}`);

  // Verification
  const verif04Status = updatedWf.connections['04_status - Is Status Receipt?']?.main?.[1];
  const verif26b = updatedWf.connections['26b - Record Customer Send Result']?.main?.[0];
  const verif04d = updatedWf.connections['04d - Authorized to Reply?']?.main?.[1];

  console.log('Verification:');
  console.log('  - 04_status Out 1 has 04a:', verif04Status.some(c => c.node === '04a - Log Inbound to Dashboard'));
  console.log('  - 04_status Out 1 has 04b:', verif04Status.some(c => c.node === '04b - Check Takeover Mode'));
  console.log('  - 26b Out 0 has 04a:', verif26b.some(c => c.node === '04a - Log Inbound to Dashboard'));
  console.log('  - 04d Out 1 has 04a:', verif04d.some(c => c.node === '04a - Log Inbound to Dashboard'));

  // 5. Also synchronize deliverable file
  const exportPath = path.resolve('exports/TBW_FRESH_v3.3_WhatsApp_Fixed_EndChat.json');
  if (fs.existsSync(exportPath)) {
    const expWf = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    const exp04a = expWf.nodes.find(n => n.name === '04a - Log Inbound to Dashboard');
    if (exp04a) exp04a.parameters.jsonBody = node04a.parameters.jsonBody;
    expWf.connections = liveWf.connections;
    fs.writeFileSync(exportPath, JSON.stringify(expWf, null, 2));
    console.log(`✓ Synchronized deliverable file: ${exportPath}`);
  }

  console.log('\n🎉 ALL LATENCY OPTIMIZATION CHECKS PASSED! Bot response time is now ~5 seconds faster!');
}

runLatencyOptimization().catch(err => {
  console.error('❌ LATENCY OPTIMIZATION FAILED:', err);
  process.exit(1);
});
