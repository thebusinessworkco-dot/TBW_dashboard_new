import fs from 'fs';
import path from 'path';

// 1. Load environment variables
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
  console.error('ERROR: N8N_API_KEY is not defined in .env.local');
  process.exit(1);
}

async function run() {
  console.log(`=== Fetching Workflow ${WORKFLOW_ID} from n8n ===`);
  const getRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });

  if (!getRes.ok) {
    throw new Error(`Failed to fetch workflow: ${getRes.status} ${getRes.statusText}`);
  }

  const wf = await getRes.json();
  console.log(`Workflow Name: ${wf.name}`);
  console.log(`Active: ${wf.active}`);

  // Create local timestamped backup
  const backupFile = `backups/wf_${WORKFLOW_ID}_pre_fix_${Date.now()}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(wf, null, 2));
  console.log(`Saved backup to ${backupFile}`);

  // FIX 1: Disable Node 02 (Every Minute Session Check)
  const node02 = wf.nodes.find(n => n.name === '02 - Every Minute Session Check');
  if (node02) {
    node02.disabled = true;
    console.log('✓ Node 02 (Every Minute Session Check) set to disabled: true');
  } else {
    console.warn('⚠ Node 02 not found');
  }

  // FIX 2: Patch Node 04 (Parse Inbound) to support 'Hello', 'Hi', greetings, and auto-unstuck
  const node04 = wf.nodes.find(n => n.name === '04 - Parse Inbound');
  if (node04) {
    const code = node04.parameters.jsCode;
    // Replace the restrictive hello check:
    // const hello = /^hello\s+bot[!.\s]*$/i.test(msgText);
    const oldHelloRegex = /const hello = \/\^hello\\s\+bot\[!\.\\s\]\*\$\/i\.test\(msgText\);/;
    const newHelloBlock = `// Manual restart / greeting commands (Hello, Hi, Hey, Start, Menu, Restart, Namaste, Hello Bot)
const isGreetingOrRestart = /^(hello|hi|hey|start|menu|restart|namaste|halo)(\\s+bot)?$/i.test(msgText);
const hello = isGreetingOrRestart;`;

    // Replace shouldRestart condition:
    const oldShouldRestart = /const shouldRestart =\s*!s \|\|\s*s\.stage === 'timeout' \|\|\s*s\.stage === 'manual_closed' \|\|\s*hello;/;
    const newShouldRestartBlock = `const shouldRestart =
  !s ||
  s.stage === 'timeout' ||
  s.stage === 'manual_closed' ||
  isGreetingOrRestart ||
  (s.stage === 'human_wait' && !s.human_requested);`;

    let updatedCode = code;
    if (oldHelloRegex.test(updatedCode)) {
      updatedCode = updatedCode.replace(oldHelloRegex, newHelloBlock);
    } else {
      console.warn('⚠ Could not find exact oldHelloRegex in Node 04, checking alternate pattern...');
      updatedCode = updatedCode.replace(/const hello = [^;]+;/, newHelloBlock);
    }

    if (oldShouldRestart.test(updatedCode)) {
      updatedCode = updatedCode.replace(oldShouldRestart, newShouldRestartBlock);
    } else {
      console.warn('⚠ Could not find exact oldShouldRestart in Node 04, checking alternate pattern...');
      updatedCode = updatedCode.replace(/const shouldRestart =\s*[^;]+;/, newShouldRestartBlock);
    }

    node04.parameters.jsCode = updatedCode;
    console.log('✓ Node 04 (Parse Inbound) patched with greeting and auto-reset support');
  } else {
    console.warn('⚠ Node 04 not found');
  }

  // FIX 3: Patch Node 04c (Evaluate Takeover State)
  const node04c = wf.nodes.find(n => n.name === '04c - Evaluate Takeover State');
  if (node04c) {
    node04c.parameters.jsCode = `
// 04c - Evaluate Takeover State
const res = $input.first()?.json || {};
const inbound = $('04 - Parse Inbound').first().json || {};
const mem = $getWorkflowStaticData('global');
mem.sessions ??= {};
const s = mem.sessions[inbound.phone] || inbound.s;

// 1. Customer-Initiated Human Handover Check:
const isCustomerHandover = s?.human_requested === true;

// Customer explicitly asking for a human gets exactly one acknowledgement and one queued owner alert.
const requestedNow = ['go_human', 'fallback_yes'].includes(inbound.choice);
if (requestedNow && s && !s.humanAckedAt) {
  s.human_requested = true;
  s.stage = 'human_wait';
  s.promptAt = 0;
  s.nudged = true;
  s.humanAckedAt = Date.now();
  const messages = {
    en: 'Your request has been forwarded to our team. We will reply as soon as possible. 😊',
    hi: 'आपकी रिक्वेस्ट हमारी टीम को भेज दी गई है। हम जल्द जवाब देंगे। 😊',
    hinglish: 'Aapki request hamari team ko bhej di hai. Hum jaldi reply karenge. 😊',
    mr: 'आपली विनंती आमच्या टीमकडे पाठवली आहे. आम्ही लवकरच उत्तर देऊ. 😊'
  };
  inbound.waPayload = { messaging_product:'whatsapp', to: inbound.phone, type:'text', text:{preview_url:false,body:messages[s.lang]||messages.en} };
  inbound.handled = true;
  inbound.action = 'send';
  inbound.s = s;
  return [{json:inbound}];
}

// 2. Handle network / DNS / server errors from Node 04b gracefully:
// If Node 04b experienced DNS failure (getaddrinfo EAI_AGAIN), timeout, or server error:
if (res?.error) {
  // If customer specifically requested a human agent, keep them in human_wait
  if (isCustomerHandover) {
    if (s) {
      s.stage = 'human_wait';
      s.promptAt = 0;
      s.nudged = true;
    }
    return [];
  }
  // Otherwise, network glitches reaching dashboard must NOT block normal conversation!
  if (s && s.stage === 'human_wait' && !s.human_requested) {
    s.stage = 'menu';
    s.promptAt = Date.now();
    s.nudged = false;
  }
  inbound.s = s;
  return [{ json: inbound }];
}

// 3. Strict Authorization Verification when dashboard responded successfully:
const hasValidSchema = res && typeof res === 'object' && res.success === true && res.data && typeof res.data === 'object';
const isExplicitlyAllowed = hasValidSchema &&
  res.data.can_respond === true &&
  res.data.manual_takeover !== true &&
  res.data.automation_paused !== true &&
  res.data.mode === 'ai';

if (!isExplicitlyAllowed || isCustomerHandover) {
  if (s) {
    s.stage = 'human_wait';
    s.promptAt = 0; // Suppress inactivity nudges
    s.nudged = true;
    if (isCustomerHandover) {
      s.human_requested = true;
    }
  }
  // Fail-closed: Stop automatic conversational replies completely
  return [];
}

// 4. Automation Resumption:
// If automation was paused by dashboard takeover (not by customer) and is now released:
if (s && s.stage === 'human_wait' && !s.human_requested) {
  s.stage = 'menu';
  s.promptAt = Date.now();
  s.nudged = false;
}

// CRITICAL: Propagate updated s into inbound so Node 08 receives the correct stage!
inbound.s = s;

return [{ json: inbound }];
`;
    console.log('✓ Node 04c (Evaluate Takeover State) patched with DNS fallback & state propagation');
  } else {
    console.warn('⚠ Node 04c not found');
  }

  // Push updated workflow to n8n
  console.log(`=== Pushing Patched Workflow ${WORKFLOW_ID} to n8n ===`);
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings
  };

  const putRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(putPayload)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`Failed to update workflow on n8n (${putRes.status}): ${errText}`);
  }

  const updatedWf = await putRes.json();
  console.log(`✓ SUCCESS: Workflow ${updatedWf.id} updated successfully!`);
  console.log(`Nodes count: ${updatedWf.nodes?.length}`);
  const updatedNode02 = updatedWf.nodes?.find(n => n.name === '02 - Every Minute Session Check');
  console.log(`Node 02 disabled state: ${updatedNode02?.disabled}`);

  // Also update exports/TBW_FRESH_v3.2_Dashboard_Integrated.json for repository consistency
  const exportPath = path.resolve('exports/TBW_FRESH_v3.2_Dashboard_Integrated.json');
  if (fs.existsSync(exportPath)) {
    const exportWf = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    const exp02 = exportWf.nodes.find(n => n.name === '02 - Every Minute Session Check');
    if (exp02) exp02.disabled = true;
    const exp04 = exportWf.nodes.find(n => n.name === '04 - Parse Inbound');
    if (exp04 && node04) exp04.parameters.jsCode = node04.parameters.jsCode;
    const exp04c = exportWf.nodes.find(n => n.name === '04c - Evaluate Takeover State');
    if (exp04c && node04c) exp04c.parameters.jsCode = node04c.parameters.jsCode;
    fs.writeFileSync(exportPath, JSON.stringify(exportWf, null, 2));
    console.log(`✓ Also synchronized local export file: ${exportPath}`);
  }
}

run().catch(err => {
  console.error('CRITICAL ERROR:', err);
  process.exit(1);
});
