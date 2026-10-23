// ==============================================================================
// THE BUSINESS WORK — COMPREHENSIVE V4 INSTAGRAM REELS & DM AUTOMATION TEST SUITE
// Verifies all 19 required production-safety scenarios:
// 1. Reel 1 vs Reel 2 isolation (Reel 1 never returns Reel 2 details)
// 2. any_comment mode (accepts any comment)
// 3. keywords mode (accepts matching keyword, rejects non-matching)
// 4. Duplicate comment webhook rejection
// 5. Expired comment rejection (> 7 days)
// 6. Already-answered comment (consumed intent)
// 7. User with no prior DM (is_first_dm: true)
// 8. Customer sending Send Me Details (TBW_DETAILS)
// 9. Follow check: true unlocks details
// 10. Follow check: false prompts to follow
// 11. Follow check: unknown fails closed without unlocking
// 12. Missing WhatsApp phone (never outputs placeholder digits; bio fallback)
// 13. Configured WhatsApp phone (generates valid https://wa.me/...)
// 14. Expired messaging window / context (> 24h)
// 15. Human takeover active (approved: false, reply_allowed: false)
// 16. Direct DM FAQ handling
// 17. Complex AI path detection
// 18. Reels ON/OFF toggle behavior
// 19. Header Auth validation (X-TBW-Webhook-Secret)
// ==============================================================================

import { spawn } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ------------------------------------------------------------------------------
// n8n V4 Code Node Simulator
// Re-executes the exact JavaScript snippet from 'IG - DM State + Booking Input'
// ------------------------------------------------------------------------------
function simulateN8nDmStateNode(eventPayload, staticData = {}) {
  const e = eventPayload;
  if (e.approved !== true || e.event_type !== 'dm' || e.mode !== 'ai' || e.reply_allowed !== true || !/^\d{5,40}$/.test(String(e.ig_user_id || ''))) {
    return null;
  }
  staticData.igProSessions ??= {};
  const key = e.ig_user_id;
  const now = Date.now();
  const past = staticData.igProSessions[key] || {};
  const s = { ...past, updated: now };
  const raw = String(e.text || '').trim().slice(0, 950);
  const payload = String(e.quick_reply_payload || '').trim();
  const wa = (() => {
    const v = String(e.whatsapp_url || e.settings?.whatsapp_url || '').trim();
    return /^https:\/\/wa\.me\/\d{8,15}(?:\?text=[^\s]{0,500})?$/i.test(v) ? v : '';
  })();
  const waLine = wa ? '\nWhatsApp: ' + wa : '\nFor a personal consultation, use the WhatsApp link in our Instagram bio.';

  const items = [
    ['AI Agents & Chatbots', 'AI Sales Agents, Customer Support Agents...'],
    ['CRM & Sales Automation', 'CRM Setup, Lead Management...'],
    ['Business Workflow Automation', 'Form-to-CRM, Email Automation...'],
    ['WhatsApp & Social Automation', 'WhatsApp Business Automation...']
  ];
  const chips = (...xs) => xs.map(x => ({ content_type: 'text', title: x[0], payload: x[1] })).slice(0, 8);
  const menuChips = chips(['AI Agents', 'TBW_SVC_1'], ['CRM & Sales', 'TBW_SVC_2'], ['Workflows', 'TBW_SVC_3'], ['WhatsApp / Social', 'TBW_SVC_4'], ['Contact Us', 'TBW_CONTACT']);
  const details = chips(['Send Me Details', 'TBW_DETAILS'], ['Our Services', 'TBW_MENU'], ['WhatsApp', 'TBW_CONTACT']);

  let action = 'fixed';
  let reply = '';
  let quick_replies = [];
  let campaign = null;

  const c = e.campaign && typeof e.campaign === 'object' && e.campaign.active === true ? e.campaign : null;
  if (c && String(c.media_id || '') && /^\d{5,80}$/.test(String(c.media_id))) s.campaign = c;
  else if (!c && e.clear_campaign === true) delete s.campaign;
  campaign = c || ((s.campaign && s.campaign.active === true) ? s.campaign : null);

  const isFirst = e.is_first_dm === true || (!past.welcomed && e.is_first_dm !== false);
  const wantsDetails = payload === 'TBW_DETAILS' || /^(send me details|details|send details|i want details|send me the details)$/i.test(raw);
  const retryFollow = payload === 'TBW_FOLLOW_RECHECK' || /^(i followed|i've followed|i am following|following|done following|check follow)$/i.test(raw);
  const isMenu = payload === 'TBW_MENU' || /^(menu|services|service|start|main menu|help)$/i.test(raw);
  const contact = payload === 'TBW_CONTACT' || /\b(price|pricing|cost|quote|quotation|demo|appointment|book|booking|consultation|call me|contact|whatsapp|human|agent|talk to someone|speak to someone)\b/i.test(raw);
  const selected = payload.match(/^TBW_SVC_([1-4])$/) || raw.match(/^([1-4])$/);

  const faq = [
    { re: /\b(what do you do|about your company|about your business|who are you)\b/i, answer: 'We build practical AI and automation systems to help businesses manage leads, customer messages and everyday work.' },
    { re: /\b(what is (an? )?ai agent|ai chatbot|chatbots? do)\b/i, answer: 'An AI agent can answer customer questions, qualify leads and help with support or bookings. We tailor it to your business.' }
  ];
  const complex = /(integrat|custom|architecture|api|webhook|erp|security|multi.step|database|n8n|migration|specific requirement|technical|complicated|scalab|compliance|how would|how can you build)/i.test(raw) || raw.length > 180;

  if (campaign && (wantsDetails || retryFollow || payload === 'TBW_REEL_DETAILS')) {
    if (campaign.follow_required === true) {
      action = 'follow_check';
      reply = '';
    } else {
      reply = String(campaign.details_text || campaign.final_message || 'Thanks for your interest! Our team can share more details.').trim().slice(0, 750) + waLine;
      quick_replies = chips(['Our Services', 'TBW_MENU'], ['WhatsApp', 'TBW_CONTACT']);
    }
    s.awaitingDetails = false;
  } else if (campaign && isFirst) {
    const title = String(campaign.initial_message || 'Thanks for commenting on our Reel! 👋').trim().slice(0, 500);
    reply = title + '\nTap Send Me Details below and we will help you.';
    quick_replies = details;
    s.awaitingDetails = true;
  } else if (selected) {
    const idx = Number(selected[1]) - 1;
    reply = '✨ ' + items[idx][0] + '\n' + items[idx][1] + '\n\nFor a tailored demo or pricing, contact our team.' + waLine;
    quick_replies = chips(['All Services', 'TBW_MENU'], ['WhatsApp', 'TBW_CONTACT']);
  } else if (contact) {
    reply = 'Sure! 👋 For pricing, demos, appointments and detailed enquiries, our team can help you on WhatsApp.' + waLine;
    quick_replies = chips(['Our Services', 'TBW_MENU']);
  } else if (isMenu) {
    reply = 'Here are our 4 service categories. Tap any option to explore:\n1. AI Agents & Chatbots\n2. CRM & Sales Automation\n3. Business Workflow Automation\n4. WhatsApp & Social Automation' + waLine;
    quick_replies = menuChips;
  } else if (isFirst) {
    reply = 'Hello! 👋 Welcome to The Business Work.\nWe help businesses save time through smart automation. What would you like to explore?' + waLine;
    quick_replies = menuChips;
  } else if (wantsDetails && !campaign) {
    reply = 'Happy to help! 🙂 Choose a service below, or reach our team directly for personalised details.' + waLine;
    quick_replies = menuChips;
  } else {
    const found = faq.find(q => q.re.test(raw));
    if (found) {
      reply = found.answer + waLine;
      quick_replies = chips(['Our Services', 'TBW_MENU'], ['WhatsApp', 'TBW_CONTACT']);
    } else if (complex) {
      action = 'ai';
    } else {
      reply = 'Thanks for your question! 😊 We can help you explore the right automation. Select a service or chat with our team for personal advice.' + waLine;
      quick_replies = menuChips;
    }
  }

  s.welcomed = true;
  staticData.igProSessions[key] = s;

  return {
    ...e,
    action,
    reply,
    quick_replies,
    campaign,
    whatsapp_url: wa,
    waLine,
    follow_required: campaign?.follow_required === true,
  };
}

// ------------------------------------------------------------------------------
// n8n Follow Verification Node Simulator
// ------------------------------------------------------------------------------
function simulateFollowNode(dmStateOutput, metaProfileResponse) {
  const b = dmStateOutput;
  const profile = metaProfileResponse || {};
  const follows = profile.is_user_follow_business === true;
  const notFollows = profile.is_user_follow_business === false;
  const wa = b.waLine || '';
  const c = b.campaign || {};
  let reply = '';
  let quick_replies = [];

  if (follows) {
    reply = String(c.details_text || c.final_message || 'Thanks for following! Here are the details you asked for.').trim().slice(0, 740) + wa;
    quick_replies = [{ content_type: 'text', title: 'Our Services', payload: 'TBW_MENU' }, { content_type: 'text', title: 'WhatsApp', payload: 'TBW_CONTACT' }];
  } else if (notFollows) {
    reply = 'Thanks for your interest! 💛 Please follow @thebusinesswork.co first. Then tap “I Followed” and we will check again. Your requested details will be waiting.';
    quick_replies = [{ content_type: 'text', title: 'I Followed', payload: 'TBW_FOLLOW_RECHECK' }, { content_type: 'text', title: 'WhatsApp', payload: 'TBW_CONTACT' }];
  } else {
    reply = 'I could not verify your follow status right now. Please try “Check Again” shortly. I will not send the gated details until verification works.';
    quick_replies = [{ content_type: 'text', title: 'Check Again', payload: 'TBW_FOLLOW_RECHECK' }, { content_type: 'text', title: 'WhatsApp', payload: 'TBW_CONTACT' }];
  }
  return {
    ...b,
    action: 'fixed',
    reply,
    quick_replies,
    follow_status: follows ? 'follows' : notFollows ? 'not_following' : 'unknown',
  };
}

// ------------------------------------------------------------------------------
// Main Test Runner
// ------------------------------------------------------------------------------
async function main() {
  console.log('==============================================================================');
  console.log('TBW V4 PRO INSTAGRAM REELS & DM AUTOMATION COMPREHENSIVE TEST SUITE');
  console.log('==============================================================================\n');

  // Set up temp directory for isolated VPS service testing
  const scratchDir = resolve(process.cwd(), 'scratch', 'vps_test_env');
  if (existsSync(scratchDir)) rmSync(scratchDir, { recursive: true, force: true });
  mkdirSync(resolve(scratchDir, 'data'), { recursive: true });

  const testSecret = 'MiDWVYhAWZsVRoDX_test_secret';
  const testPort = 3302;

  console.log(`Starting isolated VPS Python Event API on 127.0.0.1:${testPort}...`);
  const pythonProc = spawn('python', ['scripts/vps_ig_event_api_v4.py'], {
    env: {
      ...process.env,
      IG_EVENT_ROOT: scratchDir,
      IG_EVENT_BIND: '127.0.0.1',
      IG_EVENT_PORT: String(testPort),
      IG_EVENT_SECRET: testSecret,
      WHATSAPP_BUSINESS_PHONE: '',
    },
    stdio: 'pipe',
  });

  await new Promise((resolve, reject) => {
    let started = false;
    pythonProc.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('serving on')) {
        started = true;
        resolve();
      }
    });
    pythonProc.stderr.on('data', (d) => {
      console.error('Python Stderr:', d.toString());
    });
    pythonProc.on('error', reject);
    pythonProc.on('exit', (code) => {
      if (!started) reject(new Error(`Python process exited prematurely with code ${code}`));
    });
    setTimeout(() => {
      if (!started) resolve(); // fallback
    }, 1500);
  });

  const vpsUrl = `http://127.0.0.1:${testPort}`;

  try {
    // --------------------------------------------------------------------------
    // Test Scenario 19: Header Auth Validation
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 19: Header Auth Validation (X-TBW-Webhook-Secret) ---');
    const unauthorizedRes = await fetch(`${vpsUrl}/comment-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'comment' }),
    });
    assert(unauthorizedRes.status === 401 || unauthorizedRes.status === 403, 'Unauthorized request without X-TBW-Webhook-Secret rejected with 401/403');

    const authorizedHealth = await fetch(`${vpsUrl}/healthz`);
    assert(authorizedHealth.status === 200, '/healthz is reachable and returns 200');

    // --------------------------------------------------------------------------
    // Setup 2 Isolated Reel Rules in VPS SQLite
    // Reel 1 (any_comment, follow_required: true)
    // Reel 2 (keywords: ['VIP', 'DISCOUNT'], follow_required: false)
    // --------------------------------------------------------------------------
    console.log('\n--- Setup: Seed Isolated Reel 1 and Reel 2 ---');
    // Seed via Python into isolated SQLite
    const seedProc = spawn('python', ['-c', `
import sqlite3, json, time, os
db = sqlite3.connect(os.path.join('${scratchDir.replace(/\\/g, '/')}', 'data', 'instagram.sqlite3'))
now = int(time.time())
db.execute('''INSERT OR REPLACE INTO instagram_reel_rules 
  (id, media_id, title, enabled, trigger_mode, keywords, initial_dm_text, details_text, follow_required, whatsapp_prefill, updated_at) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
  ('rule_reel_1', '1799900000000001', 'Reel 1: AI Automation Launch', 1, 'any_comment', '[]', 
   'Thanks for commenting on Reel 1! Reply “Send Me Details” for Reel 1 details.',
   'REEL_1_CONTENT_ONLY: AI Agents & Full Automation Stack Blueprint 🚀', 1, 'Inquired about Reel 1', now))

db.execute('''INSERT OR REPLACE INTO instagram_reel_rules 
  (id, media_id, title, enabled, trigger_mode, keywords, initial_dm_text, details_text, follow_required, whatsapp_prefill, updated_at) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
  ('rule_reel_2', '1799900000000002', 'Reel 2: VIP CRM Discounts', 1, 'keywords', json.dumps(['VIP', 'DISCOUNT']), 
   'Thanks for commenting on Reel 2! Reply “Send Me Details” for Reel 2 VIP perks.',
   'REEL_2_CONTENT_ONLY: Exclusive 30% Off CRM Pipeline Setup 🏷️', 0, 'Inquired about Reel 2', now))

db.commit()
db.close()
`]);
    await new Promise((resolve) => seedProc.on('close', resolve));
    console.log('  ✓ Seeded Reel 1 (any_comment, gated) and Reel 2 (keywords, ungated) into SQLite');

    // --------------------------------------------------------------------------
    // Test Scenario 2: any_comment Mode
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 2: any_comment Mode (Reel 1) ---');
    const comment1Res = await fetch(`${vpsUrl}/comment-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'comment',
        comment_id: '99000000000001',
        media_id: '1799900000000001',
        ig_user_id: '1000000001',
        username: 'user_alice',
        text: 'This looks amazing, great video!',
        timestamp: new Date().toISOString(),
      }),
    });
    const comment1Data = await comment1Res.json();
    assert(comment1Data.approved === true, 'Reel 1 with any_comment mode approved casual comment');
    assert(comment1Data.reply_text.includes('Reel 1 details'), 'Approved reply_text matches Reel 1 initial DM text');
    assert(comment1Data.rule_id === 'rule_reel_1', 'Assigned exact rule_reel_1');

    // --------------------------------------------------------------------------
    // Test Scenario 3: keywords Mode (Reel 2)
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 3: keywords Mode (Reel 2) ---');
    const comment2Reject = await fetch(`${vpsUrl}/comment-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'comment',
        comment_id: '99000000000002',
        media_id: '1799900000000002',
        ig_user_id: '1000000002',
        username: 'user_bob',
        text: 'Random comment without keyword',
        timestamp: new Date().toISOString(),
      }),
    });
    const comment2RejectData = await comment2Reject.json();
    assert(comment2RejectData.approved === false, 'Reel 2 rejected comment without matching keywords');

    const comment2Approve = await fetch(`${vpsUrl}/comment-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'comment',
        comment_id: '99000000000003',
        media_id: '1799900000000002',
        ig_user_id: '1000000002',
        username: 'user_bob',
        text: 'Please send me the VIP offer please!',
        timestamp: new Date().toISOString(),
      }),
    });
    const comment2ApproveData = await comment2Approve.json();
    assert(comment2ApproveData.approved === true, 'Reel 2 approved comment containing keyword "VIP"');
    assert(comment2ApproveData.reply_text.includes('Reel 2 VIP perks'), 'Assigned exact Reel 2 initial reply text');

    // --------------------------------------------------------------------------
    // Test Scenario 4: Duplicate Comment Webhook Rejection (Idempotency)
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Duplicate Comment Webhook Rejection ---');
    const comment1Dup = await fetch(`${vpsUrl}/comment-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'comment',
        comment_id: '99000000000001', // Same comment ID as earlier
        media_id: '1799900000000001',
        ig_user_id: '1000000001',
        username: 'user_alice',
        text: 'This looks amazing, great video!',
        timestamp: new Date().toISOString(),
      }),
    });
    const comment1DupData = await comment1Dup.json();
    assert(comment1DupData.approved === false, 'Duplicate comment_id atomically rejected (prevents duplicate private replies)');

    // --------------------------------------------------------------------------
    // Test Scenario 5: Expired Comments Rejection (> 7 Days)
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Expired Comments Rejection (> 7 Days) ---');
    const eightDaysAgo = new Date(Date.now() - 8 * 86400000).toISOString();
    const commentExpired = await fetch(`${vpsUrl}/comment-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'comment',
        comment_id: '99000000000004',
        media_id: '1799900000000001',
        ig_user_id: '1000000003',
        username: 'user_charlie',
        text: 'Old comment from last week',
        timestamp: eightDaysAgo,
      }),
    });
    const commentExpiredData = await commentExpired.json();
    assert(commentExpiredData.approved === false, 'Comment older than 7 days rejected per Meta Graph policy');

    // --------------------------------------------------------------------------
    // Test Scenario 1 & 8: Reel 1 vs Reel 2 Isolation & "Send Me Details"
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 1 & 8: Strict Reel Isolation & "Send Me Details" (Contract B /dm-context) ---');
    // Customer 1000000001 (Alice) previously commented on Reel 1
    // When Alice sends "Send Me Details", /dm-context must return Reel 1's campaign ONLY!
    const dmContextAlice = await fetch(`${vpsUrl}/dm-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'dm',
        event_id: 'msg_alice_001',
        ig_user_id: '1000000001',
        username: 'user_alice',
        text: 'Send Me Details',
        quick_reply_payload: 'TBW_DETAILS',
      }),
    });
    const aliceData = await dmContextAlice.json();
    assert(aliceData.approved === true, 'Alice DM context approved');
    assert(aliceData.campaign !== null, 'Alice has active campaign context');
    assert(aliceData.campaign.id === 'rule_reel_1', 'Alice correctly resolved to rule_reel_1');
    assert(aliceData.campaign.details_text.includes('REEL_1_CONTENT_ONLY'), 'Alice receives Reel 1 details');
    assert(!aliceData.campaign.details_text.includes('REEL_2_CONTENT_ONLY'), 'ISOLATION VERIFIED: Reel 1 NEVER contains Reel 2 details!');
    assert(aliceData.campaign.follow_required === true, 'Reel 1 follow_required is true');

    // Customer 1000000002 (Bob) previously commented on Reel 2
    // Bob sends "Send Me Details", /dm-context must return Reel 2's campaign ONLY!
    const dmContextBob = await fetch(`${vpsUrl}/dm-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'dm',
        event_id: 'msg_bob_001',
        ig_user_id: '1000000002',
        username: 'user_bob',
        text: 'Send Me Details',
        quick_reply_payload: 'TBW_DETAILS',
      }),
    });
    const bobData = await dmContextBob.json();
    assert(bobData.approved === true, 'Bob DM context approved');
    assert(bobData.campaign.id === 'rule_reel_2', 'Bob correctly resolved to rule_reel_2');
    assert(bobData.campaign.details_text.includes('REEL_2_CONTENT_ONLY'), 'Bob receives Reel 2 details');
    assert(!bobData.campaign.details_text.includes('REEL_1_CONTENT_ONLY'), 'ISOLATION VERIFIED: Reel 2 NEVER leaks Reel 1 details!');
    assert(bobData.campaign.follow_required === false, 'Reel 2 follow_required is false');

    // --------------------------------------------------------------------------
    // Test Scenario 9, 10, 11: Follow Check (True, False, Unknown)
    // --------------------------------------------------------------------------
    console.log('\n--- Scenarios 9, 10, 11: Follow Check Gate in n8n ---');
    // Scenario 9: Follower = true -> Content Unlocked
    const n8nAliceState = simulateN8nDmStateNode(aliceData);
    assert(n8nAliceState.action === 'follow_check', 'Alice triggers follow_check action due to follow_required: true');
    const aliceUnlocked = simulateFollowNode(n8nAliceState, { is_user_follow_business: true });
    assert(aliceUnlocked.reply.includes('REEL_1_CONTENT_ONLY'), 'Follower verified true unlocks Reel 1 gated content');
    assert(aliceUnlocked.follow_status === 'follows', 'follow_status logged as "follows"');

    // Scenario 10: Follower = false -> Prompt to follow
    const bobNotFollower = simulateFollowNode(n8nAliceState, { is_user_follow_business: false });
    assert(bobNotFollower.reply.includes('Please follow @thebusinesswork.co first'), 'Non-follower receives polite follow request');
    assert(!bobNotFollower.reply.includes('REEL_1_CONTENT_ONLY'), 'Gated content is NOT unlocked for non-follower');
    assert(bobNotFollower.quick_replies[0].payload === 'TBW_FOLLOW_RECHECK', 'Provides “I Followed” recheck CTA');
    assert(bobNotFollower.follow_status === 'not_following', 'follow_status logged as "not_following"');

    // Scenario 11: Follower = unknown / API Error -> Fails closed
    const unknownFollower = simulateFollowNode(n8nAliceState, { error: 'Meta rate limit / token issue' });
    assert(unknownFollower.reply.includes('could not verify your follow status right now'), 'Verification error fails closed safely');
    assert(!unknownFollower.reply.includes('REEL_1_CONTENT_ONLY'), 'Gated content is NEVER unlocked when verification is unknown');
    assert(unknownFollower.follow_status === 'unknown', 'follow_status logged as "unknown"');

    // --------------------------------------------------------------------------
    // Test Scenario 12 & 13: WhatsApp Link Generation & Fallback
    // --------------------------------------------------------------------------
    console.log('\n--- Scenarios 12 & 13: WhatsApp Link Generation & Bio Fallback ---');
    // 12. Missing number fallback:
    assert(aliceData.whatsapp_url === '', 'When no number is configured, whatsapp_url is strictly empty');
    assert(n8nAliceState.waLine.includes('link in our Instagram bio'), 'Zero digits configured fallbacks to Instagram bio reference');
    assert(!n8nAliceState.waLine.includes('wa.me/'), 'Never emits placeholder or broken digits');

    // 13. Configured WhatsApp number:
    const updatePhoneProc = spawn('python', ['-c', `
import sqlite3, time, os
db = sqlite3.connect(os.path.join('${scratchDir.replace(/\\/g, '/')}', 'data', 'instagram.sqlite3'))
now = int(time.time())
db.execute("INSERT OR REPLACE INTO instagram_settings (key, value, updated_at) VALUES ('whatsapp_business_phone', '919876543210', ?)", (now,))
db.commit()
db.close()
`]);
    await new Promise((resolve) => updatePhoneProc.on('close', resolve));

    const dmContextConfiguredPhone = await fetch(`${vpsUrl}/dm-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'dm',
        event_id: 'msg_bob_002',
        ig_user_id: '1000000002',
        username: 'user_bob',
        text: 'Send Me Details',
        quick_reply_payload: 'TBW_DETAILS',
      }),
    });
    const bobPhoneData = await dmContextConfiguredPhone.json();
    assert(bobPhoneData.whatsapp_url.startsWith('https://wa.me/919876543210'), 'Valid E.164 digits produce https://wa.me/ link');
    assert(bobPhoneData.whatsapp_url.includes('text='), 'Includes URL-encoded per-Reel prefill text');

    // --------------------------------------------------------------------------
    // Test Scenario 7: User with No Prior DM (First DM Welcome)
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 7: First DM Welcome Flow ---');
    const firstDmEvent = {
      ...aliceData,
      is_first_dm: true,
      text: 'Hi there',
      quick_reply_payload: '',
    };
    const firstDmState = simulateN8nDmStateNode(firstDmEvent, {});
    assert(firstDmState.reply.includes('Tap Send Me Details below'), 'First DM invites customer with "Tap Send Me Details" CTA');
    assert(firstDmState.quick_replies[0].payload === 'TBW_DETAILS', 'Quick reply chip has TBW_DETAILS payload');

    // --------------------------------------------------------------------------
    // Test Scenario 14: Expired Customer Context (> 24 Hours)
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 14: Expired Customer Context (> 24 Hours) ---');
    const expireContextProc = spawn('python', ['-c', `
import sqlite3, time, os
db = sqlite3.connect(os.path.join('${scratchDir.replace(/\\/g, '/')}', 'data', 'instagram.sqlite3'))
now = int(time.time())
db.execute("UPDATE instagram_customer_context SET expires_at=? WHERE user_id='1000000001'", (now - 100,))
db.commit()
db.close()
`]);
    await new Promise((resolve) => expireContextProc.on('close', resolve));

    const dmExpiredContext = await fetch(`${vpsUrl}/dm-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'dm',
        event_id: 'msg_alice_003',
        ig_user_id: '1000000001',
        username: 'user_alice',
        text: 'Hello again',
      }),
    });
    const expiredContextData = await dmExpiredContext.json();
    assert(expiredContextData.campaign === null, 'Expired context returns campaign: null');
    assert(expiredContextData.clear_campaign === true, 'clear_campaign flag is set to true');

    // --------------------------------------------------------------------------
    // Test Scenario 15: Human Takeover Safety Gate
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 15: Human Takeover Mode ---');
    const setHumanModeProc = spawn('python', ['-c', `
import sqlite3, time, os
db = sqlite3.connect(os.path.join('${scratchDir.replace(/\\/g, '/')}', 'data', 'instagram.sqlite3'))
now = int(time.time())
db.execute("INSERT OR REPLACE INTO instagram_modes (user_id, mode, updated_at) VALUES ('1000000001', 'human', ?)", (now,))
db.commit()
db.close()
`]);
    await new Promise((resolve) => setHumanModeProc.on('close', resolve));

    const dmHumanTakeover = await fetch(`${vpsUrl}/dm-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'dm',
        event_id: 'msg_alice_004',
        ig_user_id: '1000000001',
        username: 'user_alice',
        text: 'Can I talk to someone?',
      }),
    });
    const humanData = await dmHumanTakeover.json();
    assert(humanData.approved === false, 'Human takeover disabled bot auto-replies (approved: false)');
    assert(humanData.reply_allowed === false, 'reply_allowed is false');
    assert(humanData.mode === 'human', 'mode is "human"');

    // --------------------------------------------------------------------------
    // Test Scenario 16: Direct DM FAQ Handling
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 16: Direct DM FAQ Handling ---');
    const returningSession = { igProSessions: { '1000000099': { welcomed: true } } };
    const faqEvent = {
      approved: true,
      event_type: 'dm',
      mode: 'ai',
      reply_allowed: true,
      ig_user_id: '1000000099',
      username: 'faq_user',
      text: 'What do you do?',
      quick_reply_payload: '',
      is_first_dm: false,
      campaign: null,
      whatsapp_url: 'https://wa.me/919876543210',
    };
    const faqState = simulateN8nDmStateNode(faqEvent, returningSession);
    assert(faqState.action === 'fixed', 'Standard FAQ handled locally as fixed reply');
    assert(faqState.reply.includes('We build practical AI and automation systems'), 'Returns accurate company FAQ response');

    // --------------------------------------------------------------------------
    // Test Scenario 17: Complex AI Path Routing
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 17: Complex Technical Query Routes to Gemini AI ---');
    const complexEvent = {
      approved: true,
      event_type: 'dm',
      mode: 'ai',
      reply_allowed: true,
      ig_user_id: '1000000099',
      username: 'tech_lead',
      text: 'How can you build a custom ERP database webhook migration architecture in n8n for multi-step inventory sync?',
      quick_reply_payload: '',
      is_first_dm: false,
      campaign: null,
      whatsapp_url: 'https://wa.me/919876543210',
    };
    const complexState = simulateN8nDmStateNode(complexEvent, returningSession);
    assert(complexState.action === 'ai', 'Complex technical query correctly routes action to "ai" for Gemini processing');

    // --------------------------------------------------------------------------
    // Test Scenario 18: Reels ON/OFF Toggle Behavior
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 18: Reels ON/OFF Toggle Behavior ---');
    const toggleOffProc = spawn('python', ['-c', `
import sqlite3, time, os
db = sqlite3.connect(os.path.join('${scratchDir.replace(/\\/g, '/')}', 'data', 'instagram.sqlite3'))
now = int(time.time())
db.execute("UPDATE instagram_reel_rules SET enabled=0 WHERE id='rule_reel_1'", ())
db.commit()
db.close()
`]);
    await new Promise((resolve) => toggleOffProc.on('close', resolve));

    const commentDisabledRule = await fetch(`${vpsUrl}/comment-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'comment',
        comment_id: '99000000000099',
        media_id: '1799900000000001',
        ig_user_id: '1000000099',
        username: 'user_david',
        text: 'Commenting on disabled Reel',
        timestamp: new Date().toISOString(),
      }),
    });
    const disabledData = await commentDisabledRule.json();
    assert(disabledData.approved === false, 'Toggling Reel rule OFF immediately silences comment-to-DM triggers');

    // --------------------------------------------------------------------------
    // Test Scenario 6: Already-Answered Comment (Consumed Intent)
    // --------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Already-Answered / Consumed Comment Rejection ---');
    const markConsumedProc = spawn('python', ['-c', `
import sqlite3, time, os
db = sqlite3.connect(os.path.join('${scratchDir.replace(/\\/g, '/')}', 'data', 'instagram.sqlite3'))
now = int(time.time())
db.execute("INSERT OR REPLACE INTO instagram_comment_intents (comment_id, media_id, user_id, state, created_at, expires_at) VALUES ('99000000000055', '1799900000000002', '1000000055', 'consumed', ?, ?)", (now, now + 86400))
db.commit()
db.close()
`]);
    await new Promise((resolve) => markConsumedProc.on('close', resolve));

    const consumedCommentRes = await fetch(`${vpsUrl}/comment-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TBW-Webhook-Secret': testSecret,
      },
      body: JSON.stringify({
        event_type: 'comment',
        comment_id: '99000000000055',
        media_id: '1799900000000002',
        ig_user_id: '1000000055',
        username: 'user_consumed',
        text: 'VIP',
        timestamp: new Date().toISOString(),
      }),
    });
    const consumedData = await consumedCommentRes.json();
    assert(consumedData.approved === false, 'Consumed comment intent rejected (one private reply per comment guaranteed)');

  } finally {
    pythonProc.kill();
    // Cleanup scratch
    if (existsSync(scratchDir)) rmSync(scratchDir, { recursive: true, force: true });
  }

  console.log('\n==============================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==============================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
