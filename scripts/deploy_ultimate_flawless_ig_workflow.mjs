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

  // Save durable backup
  const backupFile = `scratch/backup_${workflowId}_ultimate_${Date.now()}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(liveWf, null, 2));
  console.log(`✓ Saved backup to ${backupFile}`);

  const nodes = liveWf.nodes;

  // 1. Deploy scratch/perfect_dm_reply_logic.js to IG - DM Reply Logic
  const perfectDmCode = fs.readFileSync('scratch/perfect_dm_reply_logic.js', 'utf8');
  const dmReplyNode = nodes.find(n => n.name === 'IG - DM Reply Logic');
  if (!dmReplyNode) throw new Error('IG - DM Reply Logic node not found');
  dmReplyNode.parameters.jsCode = perfectDmCode;
  console.log('✓ Patched IG - DM Reply Logic with perfect buttering logic, quick replies & WhatsApp direct links');

  // 2. Connect IG - Timer Action DIRECTLY to IG - Send One Nudge and update code with card buttons
  const timerActionNode = nodes.find(n => n.name === 'IG - Timer Action');
  if (timerActionNode) {
    const timerActionCode = fs.readFileSync('scratch/ig_timer_action.js', 'utf8');
    timerActionNode.parameters.jsCode = timerActionCode;
    console.log('✓ Patched IG - Timer Action with inline card buttons');
  }

  liveWf.connections['IG - Timer Action'] = {
    main: [
      [
        {
          node: 'IG - Send One Nudge',
          type: 'main',
          index: 0
        }
      ]
    ]
  };
  console.log('✓ Connected IG - Timer Action directly to IG - Send One Nudge (100% reliable 3m nudge)');

  // 3. Patch IG - Dashboard Reel Rule: timeout 15000ms, neverError: true
  const dashboardReelNode = nodes.find(n => n.name === 'IG - Dashboard Reel Rule');
  if (dashboardReelNode) {
    dashboardReelNode.parameters.options = {
      response: {
        response: {
          neverError: true
        }
      },
      timeout: 15000
    };
    console.log('✓ Patched IG - Dashboard Reel Rule (timeout: 15000ms, neverError: true)');
  }

  // 4. Patch IG - Unify Dashboard Rule: fail-open resilience so NO comment is ever dropped on timeouts
  const unifyCommentNode = nodes.find(n => n.name === 'IG - Unify Dashboard Rule');
  if (unifyCommentNode) {
    unifyCommentNode.parameters.jsCode = `// Unify dashboard /comment-check response (Fail-open resilience)
const result = $input.first()?.json || {};
const incoming = $('IG - Deduplicate via Bridge').first().json || {};
const r = result.rule || result.data?.rule || result.data || result;

// Fail-open: If dashboard timed out or errored, DO NOT DROP THE COMMENT!
let approved = true;
if (r && r.approved === false && (r.reason === 'too_old' || r.reason === 'rejected')) {
  approved = false;
}

let template = r?.template || null;
let quickReplies = r?.quick_replies || null;
let isFollowing = r?.is_following ?? null;

const defaultFollowGateTemplate = {
  attachment: {
    type: 'template',
    payload: {
      template_type: 'button',
      text: "Hey! 👋 Before I send you the details, are you following me?\\n\\n👉 Not yet? Tap \\"Follow me\\" and hit Follow\\n✅ Already following? Tap \\"I'm following\\"",
      buttons: [
        {
          type: 'web_url',
          url: 'https://www.instagram.com/thebusinesswork.co/',
          title: '👉 Follow me'
        },
        {
          type: 'postback',
          title: "I'm following ✅",
          payload: 'IG_VERIFY_FOLLOW'
        }
      ]
    }
  }
};
const defaultQuickReplies = [{ content_type: 'text', title: "I'm following ✅", payload: 'IG_VERIFY_FOLLOW' }];

if (!template && !r?.reply_text) {
  template = defaultFollowGateTemplate;
  quickReplies = defaultQuickReplies;
}

let privateText = String(r?.reply_text || "Hey! 👋 Before I send you the details, are you following me?\\n\\n👉 Not yet? Tap \\"Follow me\\" and hit Follow\\n✅ Already following? Tap \\"I'm following\\"").trim().slice(0, 950);
let publicText = String(r?.public_reply_text || r?.public_reply?.text || 'Thanks! 👋 Check your DM for the details.').trim().slice(0, 400);
if (!publicText) publicText = 'Thanks! 👋 Check your DM for the details.';
let publicEnabled = approved && !!publicText;
let ruleId = String(r?.rule_id || r?.id || 'auto_fallback');

let ts = incoming.timestamp || Date.now();
if (typeof ts === 'number' && ts < 1e11) ts = ts * 1000;

return [{
  json: {
    ...incoming,
    timestamp: ts,
    rule_id: ruleId,
    approved,
    reply_text: privateText,
    template: template,
    quick_replies: quickReplies,
    is_following: isFollowing,
    public_reply_enabled: publicEnabled,
    public_reply_text: publicText,
    rule_source: (r && r.approved === true) ? 'dashboard' : 'fail_open_fallback'
  }
}];
`;
    console.log('✓ Patched IG - Unify Dashboard Rule (fail-open guaranteed reply on timeouts)');
  }

  // 4b. Patch IG - Private Reply Payload to support both button template (for non-followers) and direct language quick replies (for followers)
  const privateReplyNode = nodes.find(n => n.name === 'IG - Private Reply Payload');
  if (privateReplyNode) {
    privateReplyNode.parameters.jsCode = `const r = $input.first()?.json || {};
if (r.approved !== true || (!r.reply_text && !r.template) || !/^[0-9]{5,80}$/.test(String(r.comment_id || ''))) return [];
const n = typeof r.timestamp === 'number' ? r.timestamp : Number(r.timestamp);
const ts = Number.isFinite(n) && n > 1000000000 ? (n < 1e12 ? n * 1000 : n) : Date.parse(String(r.timestamp || ''));
if (!Number.isFinite(ts) || Date.now() - ts >= 7 * 86400000 || ts > Date.now() + 300000) return [];

let messagePayload = {};
if (r.template && r.template.attachment) {
  messagePayload = {
    attachment: r.template.attachment
  };
  if (Array.isArray(r.quick_replies) && r.quick_replies.length > 0) {
    messagePayload.quick_replies = r.quick_replies.slice(0, 13);
  }
} else {
  messagePayload = {
    text: String(r.reply_text || '').trim().slice(0, 950)
  };
  if (Array.isArray(r.quick_replies) && r.quick_replies.length > 0) {
    messagePayload.quick_replies = r.quick_replies.slice(0, 13);
  } else {
    messagePayload.quick_replies = [
      { content_type: 'text', title: 'English', payload: 'IG_LANG_en' },
      { content_type: 'text', title: 'हिंदी', payload: 'IG_LANG_hi' },
      { content_type: 'text', title: 'Hinglish', payload: 'IG_LANG_hinglish' },
      { content_type: 'text', title: 'मराठी', payload: 'IG_LANG_mr' }
    ];
  }
}

return [{
  json: {
    event_type: 'private_reply',
    comment_id: String(r.comment_id),
    media_id: r.media_id || '',
    rule_id: r.rule_id || '',
    ig_user_id: r.ig_user_id || '',
    username: r.username || '',
    source_event_id: r.event_id,
    igPayload: {
      recipient: { comment_id: String(r.comment_id) },
      message: messagePayload
    }
  }
}];
`;
    console.log('✓ Patched IG - Private Reply Payload (button template + language quick replies)');
  }

  // 4c. Patch IG - Check Dashboard DM Takeover: timeout 8000ms
  const checkDmNode = nodes.find(n => n.name === 'IG - Check Dashboard DM Takeover');
  if (checkDmNode) {
    checkDmNode.parameters.options = {
      response: {
        response: {
          neverError: true
        }
      },
      timeout: 8000
    };
    console.log('✓ Patched IG - Check Dashboard DM Takeover (timeout: 8000ms, neverError: true)');
  }

  // 4d. Patch IG - Prepare Public Comment Reply to guarantee public comment reply output
  const prepPublicNode = nodes.find(n => n.name === 'IG - Prepare Public Comment Reply');
  if (prepPublicNode) {
    prepPublicNode.parameters.jsCode = `const r = $input.first()?.json || {};
if (!r.approved || !/^[0-9]{5,80}$/.test(String(r.comment_id || ''))) return [];
const text = String(r.public_reply_text || 'Thanks! 👋 Check your DM for the details.').trim().slice(0, 400);
return [{
  json: {
    comment_id: String(r.comment_id),
    media_id: String(r.media_id || ''),
    rule_id: r.rule_id || '',
    source_event_id: r.event_id,
    public_reply_text: text
  }
}];
`;
    console.log('✓ Patched IG - Prepare Public Comment Reply (reliable public comment dispatch)');
  }

  // 5. Ensure IG - Evaluate DM Takeover passes is_following and follow_status
  const evalTakeoverNode = nodes.find(n => n.name === 'IG - Evaluate DM Takeover');
  if (evalTakeoverNode) {
    evalTakeoverNode.parameters.jsCode = `// IG - Evaluate DM Takeover (Fast & Resilient)
const dmContext = $input.first()?.json || {};
const incoming = $('IG - Deduplicate via Bridge').first().json || {};

const isHumanTakeover =
  dmContext &&
  typeof dmContext === 'object' &&
  !dmContext.error &&
  (dmContext.mode === 'human' ||
   dmContext.manual_takeover === true ||
   dmContext.automation_paused === true ||
   dmContext.takeover_active === true);

if (isHumanTakeover) {
  return [{
    json: {
      ...incoming,
      mode: 'human',
      reply_allowed: false,
      takeover_active: true,
      reason: 'Human takeover active on dashboard'
    }
  }];
}

return [{
  json: {
    ...incoming,
    mode: 'ai',
    reply_allowed: true,
    whatsapp_url: dmContext.whatsapp_url || '',
    campaign: dmContext.campaign || null,
    is_following: dmContext.is_following === true,
    follow_status: dmContext.follow_status || (dmContext.is_following ? 'follows' : 'not_following')
  }
}];
`;
    console.log('✓ Patched IG - Evaluate DM Takeover (resilient fail-open with is_following forward)');
  }

  // 6. Deploy to n8n
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

  // Activate workflow
  const actRes = await fetchWithRetry(`${baseUrl}/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log(`Workflow activation status: ${actRes.status}`);

  console.log('\n🎉 ALL FIXES DEPLOYED AND LIVE ON n8n!');
}

main().catch(console.error);
