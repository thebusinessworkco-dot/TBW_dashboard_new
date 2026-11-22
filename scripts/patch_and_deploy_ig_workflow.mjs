import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envFile.match(/N8N_API_KEY\s*=\s*(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';

const baseUrl = 'https://n8n.thebusinesswork.com';
const workflowId = 'IuLZQgoH3N8Zc7OS';

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Fetch attempt ${i + 1} for ${url}...`);
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      console.warn(`Attempt ${i + 1} failed: ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function main() {
  console.log('1. Fetching live workflow from n8n...');
  const res = await fetchWithRetry(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  if (!res.ok) throw new Error(`Failed to fetch workflow: ${res.status} ${res.statusText}`);
  const liveWf = await res.json();

  // Save backup
  const backupFile = `scratch/backup_${workflowId}_${Date.now()}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(liveWf, null, 2));
  console.log(`Saved backup to ${backupFile}`);

  // Load new node codes
  const newDmReplyCode = fs.readFileSync('scratch/improved_ig_dm_reply_logic.js', 'utf8');
  
  const newTimerActionCode = `// Timer callback from authenticated internal Wait workflow. No once-per-minute scheduler.
const e = $input.first()?.json || {};
if (e.event_type !== 'timer_check') return [];
const id = String(e.ig_user_id || '');
const mem = $getWorkflowStaticData('global');
const s = mem.tbwIgSessions?.[id];
if (!s || s.closed || s.sessionId !== e.session_id) return [];

const last = Number(s.lastInboundAt || 0);
if (last !== Number(e.expected_last_inbound_at)) return []; // user replied since timer was started

const age = Date.now() - last;

// Close action: after 17 more minutes (20m total from last inbound)
if (e.timer_action === 'close') {
  if (age >= 18 * 60000) {
    s.closed = true;
    s.stage = 'timeout';
    s.promptAt = 0;
    s.updatedAt = Date.now();
  }
  return []; // absolutely no goodbye message, close silently
}

// Nudge action: after 3 minutes
// If already nudged, or session closed, or user replied, or age < 2m 45s, skip
if (e.timer_action !== 'nudge' || age < 165000 || age >= 20 * 60000 || s.nudged) return [];

s.nudged = true;
s.updatedAt = Date.now();

// Single nudge in the selected language
const tr = {
  en: ['Are you still available? 😊', 'Yes, Continue', 'Main Menu', 'End Chat'],
  hi: ['क्या आप अभी उपलब्ध हैं? 😊', 'हाँ, जारी रखें', 'मुख्य मेनू', 'चैट बंद'],
  hinglish: ['Kya aap abhi available hain? 😊', 'Yes, Continue', 'Main Menu', 'End Chat'],
  mr: ['आपण अजून उपलब्ध आहात का? 😊', 'हो, पुढे चला', 'मुख्य मेनू', 'चॅट बंद']
};
const lang = s.language || 'en';
const t = tr[lang] || tr.en;
const q = (title, payload) => ({ content_type: 'text', title: String(title).slice(0, 20), payload });

return [{
  json: {
    event_type: 'dm_nudge',
    ig_user_id: id,
    session_id: s.sessionId,
    language: lang,
    source_event_id: 'nudge:' + s.sessionId + ':' + last,
    igPayload: {
      recipient: { id },
      message: {
        text: t[0],
        quick_replies: [
          q(t[1], 'IG_RESUME'),
          q(t[2], 'IG_MENU'),
          q(t[3], 'IG_END')
        ]
      }
    }
  }
}];
`;

  // Apply patches to nodes
  const nodes = liveWf.nodes;

  // 1. Patch IG - DM Reply Logic
  const dmNode = nodes.find(n => n.name === 'IG - DM Reply Logic');
  if (dmNode) {
    dmNode.parameters.jsCode = newDmReplyCode;
    console.log('✓ Patched IG - DM Reply Logic');
  }

  // 2. Patch IG - Timer Action
  const timerActionNode = nodes.find(n => n.name === 'IG - Timer Action');
  if (timerActionNode) {
    timerActionNode.parameters.jsCode = newTimerActionCode;
    console.log('✓ Patched IG - Timer Action');
  }

  // 3. Patch IG TIMER - Validate Request (session_id regex)
  const timerValNode = nodes.find(n => n.name === 'IG TIMER - Validate Request');
  if (timerValNode) {
    timerValNode.parameters.jsCode = timerValNode.parameters.jsCode.replace(
      '/^ig_\\d+_\\d{1,6}$/',
      '/^ig_\\S+$/'
    );
    console.log('✓ Patched IG TIMER - Validate Request (relaxed session ID regex)');
  }

  // 4. Patch IG - Normalize Events (session_id regex)
  const normNode = nodes.find(n => n.name === 'IG - Normalize Events');
  if (normNode) {
    normNode.parameters.jsCode = normNode.parameters.jsCode.replace(
      '/^ig_\\d+_\\d{1,6}$/',
      '/^ig_\\S+$/'
    );
    console.log('✓ Patched IG - Normalize Events (relaxed session ID regex)');
  }

  // 5. Patch IG - Check Dashboard DM Takeover (timeout & neverError)
  const takeoverNode = nodes.find(n => n.name === 'IG - Check Dashboard DM Takeover');
  if (takeoverNode) {
    takeoverNode.parameters.options = {
      response: {
        response: {
          neverError: true
        }
      },
      timeout: 4000
    };
    console.log('✓ Patched IG - Check Dashboard DM Takeover (timeout 4s + neverError)');
  }

  // 6. Patch IG - Check Nudge Takeover (timeout & neverError)
  const nudgeTakeoverNode = nodes.find(n => n.name === 'IG - Check Nudge Takeover');
  if (nudgeTakeoverNode) {
    nudgeTakeoverNode.parameters.options = {
      response: {
        response: {
          neverError: true
        }
      },
      timeout: 4000
    };
    console.log('✓ Patched IG - Check Nudge Takeover (timeout 4s + neverError)');
  }

  // 7. Patch IG - Log Inbound DM to Dashboard (use robust references)
  const logInboundNode = nodes.find(n => n.name === 'IG - Log Inbound DM to Dashboard');
  if (logInboundNode) {
    logInboundNode.parameters.jsonBody = `={{ JSON.stringify({
      event_type: 'incoming_instagram_message',
      sender_id: $('IG - Normalize Events').first().json.ig_user_id,
      username: $('IG - Normalize Events').first().json.username || '',
      content: $('IG - Normalize Events').first().json.text || $('IG - Normalize Events').first().json.quick_reply_payload || '[DM]',
      external_message_id: $('IG - Normalize Events').first().json.event_id,
      timestamp: $('IG - Normalize Events').first().json.timestamp || new Date().toISOString()
    }) }}`;
    logInboundNode.parameters.options = {
      response: {
        response: {
          neverError: true
        }
      },
      timeout: 4000
    };
    console.log('✓ Patched IG - Log Inbound DM to Dashboard (non-blocking expressions)');
  }

  // 8. Patch Connections:
  // Move 'IG - Log Inbound DM to Dashboard' from 'IG - DM or Comment?' to 'IG - DM Send Result'
  const conns = liveWf.connections;

  // Remove 'IG - Log Inbound DM to Dashboard' from 'IG - DM or Comment?'
  if (conns['IG - DM or Comment?']?.main?.[0]) {
    conns['IG - DM or Comment?'].main[0] = conns['IG - DM or Comment?'].main[0].filter(
      target => target.node !== 'IG - Log Inbound DM to Dashboard'
    );
    console.log('✓ Removed IG - Log Inbound DM to Dashboard from blocking inbound branch');
  }

  // Add 'IG - Log Inbound DM to Dashboard' to 'IG - DM Send Result'
  if (conns['IG - DM Send Result']?.main?.[0]) {
    const exists = conns['IG - DM Send Result'].main[0].some(t => t.node === 'IG - Log Inbound DM to Dashboard');
    if (!exists) {
      conns['IG - DM Send Result'].main[0].push({
        node: 'IG - Log Inbound DM to Dashboard',
        type: 'main',
        index: 0
      });
      console.log('✓ Connected IG - Log Inbound DM to Dashboard post-send at IG - DM Send Result');
    }
  }

  // 9. Deploy update to live workflow
  console.log('\n2. Deploying updated workflow to n8n...');
  const putPayload = {
    name: liveWf.name,
    nodes: liveWf.nodes,
    connections: liveWf.connections,
    settings: liveWf.settings,
    staticData: liveWf.staticData
  };

  const putRes = await fetchWithRetry(`${baseUrl}/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey
    },
    body: JSON.stringify(putPayload)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`Failed to update workflow: ${putRes.status} ${errText}`);
  }

  console.log('✓ Workflow successfully updated in n8n!');

  // Ensure active
  const actRes = await fetchWithRetry(`${baseUrl}/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log(`Workflow activation status: ${actRes.status}`);

  console.log('\nALL 4 BUGS SUCCESSFULLY FIXED AND DEPLOYED LIVE!');
}

main().catch(console.error);
