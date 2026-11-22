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
  const backupFile = `scratch/backup_${workflowId}_follow_gate_${Date.now()}.json`;
  fs.writeFileSync(backupFile, JSON.stringify(liveWf, null, 2));
  console.log(`✓ Saved backup to ${backupFile}`);

  const nodes = liveWf.nodes;

  // 1. Patch IG - Conversation
  const convNode = nodes.find(n => n.name === 'IG - Conversation');
  if (!convNode) throw new Error('IG - Conversation node not found');

  let code = convNode.parameters.jsCode;

  // In timer handling: add check for s.stage === 'awaiting_follow' and !s.language
  code = code.replace(
    'if(!s||s.closed||s.handoverPending||s.humanBlocked||s.manualHold||s.nudgeAttempted||s.sessionId!==e.session_id||s.lastInboundAt!==e.expected_last_inbound_at)continue;',
    'if(!s||s.closed||s.handoverPending||s.humanBlocked||s.manualHold||s.nudgeAttempted||s.stage==="awaiting_follow"||!s.language||s.sessionId!==e.session_id||s.lastInboundAt!==e.expected_last_inbound_at)continue;'
  );

  // Add follow gate check before if (fresh)
  const targetFresh = 'if(fresh){emit(langMenu());continue;}';
  const followGateCheck = `// Follow Gate Check: When user clicks "I'm following" or session is awaiting follow
 const isFollowVerify = click === 'IG_VERIFY_FOLLOW' || 
   ['followed', "i'm following", 'im following', "i'm following ✅", "im following ✅"].includes(n);

 const campaign = ctx.campaign || {};
 const requiresFollow = campaign.follow_required === true || campaign.require_follow === true;

 if (isFollowVerify || s.stage === 'awaiting_follow') {
   const isFollowing = ctx.is_following === true || ctx.follow_status === 'follows' || s.is_following === true;
   if (!isFollowing) {
     s.stage = 'awaiting_follow';
     s.promptAt = 0; // Prevent timer nudge from sending service links!
     const followLink = 'https://www.instagram.com/thebusinesswork.co/';
     const warnText = "Hey! 👋 We checked, but couldn't verify your follow yet!\\n\\nPlease make sure to follow @thebusinesswork.co first, then tap \\"I'm following ✅\\" below to unlock the details. ✨";
     emit({
       kind: 'send',
       send_type: 'dm_reply',
       ig_user_id: id,
       username: e.username || s.username || '',
       source_event_id: e.event_id,
       session_id: s.sessionId,
       last_inbound_at: s.lastInboundAt,
       language: s.language || 'en',
       category: s.category || '',
       service: s.service || '',
       url: CFG.graphMessages,
       igPayload: {
         recipient: { id },
         message: {
           attachment: {
             type: 'template',
             payload: {
               template_type: 'button',
               text: warnText,
               buttons: [
                 { type: 'web_url', url: followLink, title: '👉 Follow me' },
                 { type: 'postback', title: "I'm following ✅", payload: 'IG_VERIFY_FOLLOW' }
               ]
             }
           },
           quick_replies: [
             { content_type: 'text', title: "I'm following ✅", payload: 'IG_VERIFY_FOLLOW' }
           ]
         }
       },
       display_text: warnText,
       template: null,
       inboundDash: e.inboundDash || null,
       sequence: 'card'
     });
     continue;
   } else {
     // User is verified!
     s.is_following = true;
     s.stage = 'language';
     s.promptAt = now;
     emit(langMenu());
     continue;
   }
 }

 if(fresh){emit(langMenu());continue;}`;

  code = code.replace(targetFresh, followGateCheck);

  // Remove old ineffective follow checks
  code = code.replace(
    ` const campaign=ctx.campaign||{};
 if(campaign.require_follow===true&&ctx.is_following!==true){
  const verifying=click==='IG_VERIFY_FOLLOW'||['followed',"i'm following",'im following'].includes(n);
  const link='https://www.instagram.com/thebusinesswork.co/';
  emit(reply((verifying?t().unverified:t().follow)+'\\n'+link+'\\n'+t().nav,[urlButton('Instagram',link),post('FOLLOWED','IG_VERIFY_FOLLOW'),post(t().end,'IG_END')]));continue;
 }
 if(click==='IG_VERIFY_FOLLOW'||['followed',"i'm following",'im following'].includes(n)){emit(cats());continue;}`,
    ' // Follow verification already handled upfront at entrance\n if(isFollowVerify){emit(s.language?cats():langMenu());continue;}'
  );

  // Validate syntax
  new Function(code);
  convNode.parameters.jsCode = code;
  console.log('✓ Successfully patched and validated IG - Conversation');

  // 2. Patch IG - Session Sweep to never nudge users in awaiting_follow
  const sweepNode = nodes.find(n => n.name === 'IG - Session Sweep');
  if (sweepNode) {
    let sweepCode = sweepNode.parameters.jsCode;
    sweepCode = sweepCode.replace(
      'if(s.closed)continue;',
      'if(s.closed||s.stage==="awaiting_follow"||!s.language)continue;'
    );
    new Function(sweepCode);
    sweepNode.parameters.jsCode = sweepCode;
    console.log('✓ Successfully patched and validated IG - Session Sweep');
  }

  // 3. Deploy update to live workflow
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

  console.log('\nALL FOLLOW GATE LOGIC SUCCESSFULLY DEPLOYED LIVE!');
}

main().catch(console.error);

