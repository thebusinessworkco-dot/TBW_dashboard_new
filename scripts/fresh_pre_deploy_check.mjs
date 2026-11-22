// Fresh pre-deployment check and verification
import fs from 'fs';
import path from 'path';

// Load .env.local
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

const N8N_BASE_URL = process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'VBrjbhPeDypXt12q';

const PRIOR_BACKUP = path.resolve('backups/live_VBrjbhPeDypXt12q_current.json');
const FRESH_BACKUP = path.resolve('backups/live_VBrjbhPeDypXt12q_fresh_pre_deploy.json');
const PATCHED_FILE = path.resolve('backups/tbw_v4_pro_whatsapp_fixed.json');

async function runPreDeployCheck() {
  console.log('================================================================');
  console.log('FRESH PRE-DEPLOYMENT LIVE WORKFLOW VERIFICATION & INTEGRITY CHECK');
  console.log('================================================================\n');

  // 1. Fetch current live workflow from production
  console.log('1. Fetching live production workflow from n8n...');
  const start = Date.now();
  const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    method: 'GET',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch live workflow (${res.status}): ${res.statusText}`);
  }

  const liveWf = await res.json();
  const fetchDuration = Date.now() - start;
  console.log(`   Live workflow fetched in ${fetchDuration}ms: "${liveWf.name}" (${liveWf.nodes?.length} nodes, Active: ${liveWf.active})`);

  // 2. Save fresh backup
  fs.writeFileSync(FRESH_BACKUP, JSON.stringify(liveWf, null, 2), 'utf8');
  console.log(`✅ 2. Fresh backup saved to: ${FRESH_BACKUP}`);

  // 3. Compare fresh live workflow against earlier backup
  console.log('\n3. Comparing fresh live workflow against earlier backup...');
  const priorWf = JSON.parse(fs.readFileSync(PRIOR_BACKUP, 'utf8'));

  const liveStr = JSON.stringify({ nodes: liveWf.nodes, connections: liveWf.connections });
  const priorStr = JSON.stringify({ nodes: priorWf.nodes, connections: priorWf.connections });

  const hasChangedSinceBackup = liveStr !== priorStr;
  if (hasChangedSinceBackup) {
    console.warn('⚠️ WARNING: Live workflow has changed since prior backup was taken!');
    // Detailed diff
    priorWf.nodes.forEach(pn => {
      const ln = liveWf.nodes.find(n => n.id === pn.id);
      if (!ln) console.log(`   - Node deleted in live: ${pn.name}`);
      else if (JSON.stringify(pn) !== JSON.stringify(ln)) console.log(`   - Node modified in live: ${pn.name}`);
    });
  } else {
    console.log('✅ PASS: Live workflow is 100% IDENTICAL to prior backup. No intermediate changes occurred in production.');
  }

  // 4. Verify fresh live workflow against patched version
  console.log('\n4. Verifying fresh live workflow against patched version...');
  const patchedWf = JSON.parse(fs.readFileSync(PATCHED_FILE, 'utf8'));

  const diffNodes = [];
  liveWf.nodes.forEach(ln => {
    const fn = patchedWf.nodes.find(n => n.id === ln.id);
    if (!fn) diffNodes.push({ name: ln.name, status: 'MISSING_IN_PATCH' });
    else if (JSON.stringify(ln) !== JSON.stringify(fn)) diffNodes.push({ name: ln.name, id: ln.id, status: 'MODIFIED' });
  });

  console.log(`   Total Live Nodes: ${liveWf.nodes.length}`);
  console.log(`   Total Patched Nodes: ${patchedWf.nodes.length}`);
  console.log(`   Modified Nodes Count: ${diffNodes.length}`);
  diffNodes.forEach(d => console.log(`   - [${d.status}] ${d.name} (${d.id})`));

  const connectionsIdentical = JSON.stringify(liveWf.connections) === JSON.stringify(patchedWf.connections);
  console.log(`   Connections Map Identical: ${connectionsIdentical}`);

  if (diffNodes.length === 2 && connectionsIdentical &&
      diffNodes.some(d => d.name === 'Language + Name + Business + Purpose') &&
      diffNodes.some(d => d.name === 'Build Booking Confirmation')) {
    console.log('✅ PASS: Exactly the intended 2 code nodes will be patched. Zero collateral modifications.');
  } else {
    throw new Error('Verification failed: Unexpected node differences detected!');
  }

  console.log('\n================================================================');
  console.log('PRE-DEPLOYMENT VERIFICATION PASSED: SYSTEM READY FOR GO/NO-GO');
  console.log('================================================================\n');
}

runPreDeployCheck().catch(err => {
  console.error('Pre-deploy check failed:', err);
  process.exit(1);
});
