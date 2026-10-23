import fs from 'fs';

// Preload .env.local
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

import { evaluateCommentCheck, evaluateDmContext, saveReelRule } from '../src/lib/instagram/reel-automation.ts';

let passed = 0;
let total = 0;

function assert(condition, name) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    throw new Error(`Assertion failed: ${name}`);
  }
}

async function run() {
  console.log('==============================================================================');
  console.log('TESTING INSTAGRAM REELS COMMENT-TO-DM BUTTON FLOW & IDEMPOTENCY');
  console.log('==============================================================================');

  const testMediaId = '18352671520267494';
  const testUserId = '9999' + Math.floor(10000000 + Math.random() * 90000000);
  const testComment1 = '99990001' + Math.floor(Math.random() * 100000);
  const testComment2 = '99990002' + Math.floor(Math.random() * 100000);

  // 1. Ensure a test rule exists
  console.log('\n--- Part 1: Rule Configuration & Extended Metadata ---');
  const savedRule = await saveReelRule({
    media_id: testMediaId,
    title: 'Test Production Reel Automation',
    is_enabled: true,
    trigger_mode: 'any_comment',
    initial_dm_text: "Thanks for commenting on our Reel! 👋\nReply with 'Hi' or anything here to unlock your details! ✨",
    details_text: 'Here are your exclusive AI agent details!',
    follow_required: true,
    follow_instructions_text: 'Follow our Instagram page to unlock the details! 👋',
    follow_button_label: "I've Followed",
    post_unlock_primary_action: 'View Services',
    first_interactive_followup: 'Tap below to get instant details or explore our services:',
    whatsapp_prefill_text: 'Hi! I saw your test reel and want more details.'
  });

  assert(savedRule.media_id === testMediaId, 'Rule saved with correct media_id');
  assert(savedRule.follow_required === true, 'follow_required is true');
  assert(savedRule.initial_dm_text.includes("Reply with 'Hi'"), 'initial_dm_text does not force typing "Send Me Details"');

  // 2. Test Comment 1
  console.log('\n--- Part 2: Comment Check & First Private Reply ---');
  const res1 = await evaluateCommentCheck({
    event_type: 'comment',
    comment_id: testComment1,
    media_id: testMediaId,
    ig_user_id: testUserId,
    username: 'test_commenter',
    text: '🔥🔥 Nice video!',
    timestamp: new Date().toISOString()
  });

  assert(res1.approved === true, 'First comment from user is approved');
  assert(res1.reply_text.includes("Reply with 'Hi'"), 'First private reply contains low-friction invitation');
  assert(!res1.reply_text.includes('Reply “Send Me Details” here and I’ll share'), 'Old high-friction phrase eliminated');

  // 3. Test Exact Duplicate of Comment 1 (Webhook replay / race condition)
  console.log('\n--- Part 3: Duplicate Comment Delivery (Exact comment_id) ---');
  const resDup = await evaluateCommentCheck({
    event_type: 'comment',
    comment_id: testComment1,
    media_id: testMediaId,
    ig_user_id: testUserId,
    username: 'test_commenter',
    text: '🔥🔥 Nice video!',
    timestamp: new Date().toISOString()
  });

  assert(resDup.approved === false, 'Exact duplicate comment_id is atomically rejected (approved: false)');

  // 4. Test Second Comment from Same User on Same Reel within 24h
  console.log('\n--- Part 4: Second Comment from Same User on Same Reel (Multi-comment spam prevention) ---');
  const res2 = await evaluateCommentCheck({
    event_type: 'comment',
    comment_id: testComment2,
    media_id: testMediaId,
    ig_user_id: testUserId,
    username: 'test_commenter',
    text: '❤️❤️ Another comment 2 minutes later',
    timestamp: new Date().toISOString()
  });

  assert(res2.approved === false, 'Second comment from same user on same Reel is skipped (approved: false) to prevent duplicate DM spam');

  // 5. Test Comment from Same User on a DIFFERENT Reel
  console.log('\n--- Part 5: Comment from Same User on a Different Reel ---');
  const otherMediaId = '18999999999000000';
  await saveReelRule({
    media_id: otherMediaId,
    title: 'Second Different Reel',
    is_enabled: true,
    trigger_mode: 'any_comment',
    initial_dm_text: "Welcome to our second reel! Reply 'Hi' for info."
  });

  const resOther = await evaluateCommentCheck({
    event_type: 'comment',
    comment_id: '99990003' + Math.floor(Math.random() * 100000),
    media_id: otherMediaId,
    ig_user_id: testUserId,
    username: 'test_commenter',
    text: 'Interested in this second reel!',
    timestamp: new Date().toISOString()
  });

  assert(resOther.approved === true, 'Genuinely new comment on a different Reel IS approved (no cross-reel blockage)');

  // 6. Test Inbound DM Context Resolution
  console.log('\n--- Part 6: DM Context Resolution for Customer ---');
  // Latest pending campaign (from Part 5)
  const dmContextLatest = await evaluateDmContext({
    event_id: 'dm_evt_test_1',
    ig_user_id: testUserId,
    username: 'test_commenter',
    text: 'Hi 👋',
    is_first_dm: true
  });

  assert(dmContextLatest.approved === true, 'DM context successfully approved');
  assert(dmContextLatest.campaign !== null, 'Durable campaign resolved from customer context');
  assert(dmContextLatest.campaign.media_id === otherMediaId, 'Resolved most recent commented Reel media_id');

  // Explicit referral Reel isolation (customer clicking through specific Reel 1)
  const dmContextReel1 = await evaluateDmContext({
    event_id: 'dm_evt_test_2',
    ig_user_id: testUserId,
    username: 'test_commenter',
    referral_media_id: testMediaId,
    text: 'Hi from Reel 1 👋',
    is_first_dm: false
  });

  assert(dmContextReel1.campaign.media_id === testMediaId, 'Strict Reel isolation: resolved explicit referral media_id');
  assert(dmContextReel1.campaign.follow_required === true, 'Campaign preserves follow_required flag');
  assert(dmContextReel1.campaign.follow_instructions_text === 'Follow our Instagram page to unlock the details! 👋', 'Extended follow instructions preserved');
  assert(dmContextReel1.campaign.follow_button_label === "I've Followed", 'Extended button label preserved');

  // 7. Test Simulated n8n Node Execution for Verified Follow Reply
  console.log('\n--- Part 7: n8n Node Logic Simulation ---');
  const patchedWf = JSON.parse(fs.readFileSync('scripts/patched_v4_workflow.json', 'utf8'));

  // Test Node: IG - Build Verified Follow Reply
  const followNode = patchedWf.nodes.find(n => n.name === 'IG - Build Verified Follow Reply');
  assert(Boolean(followNode), 'Patched IG - Build Verified Follow Reply node exists in workflow');
  assert(followNode.parameters.jsCode.includes('https://www.instagram.com/thebusinesswork.co/'), 'Follow Our Page button includes official Instagram profile URL');
  assert(followNode.parameters.jsCode.includes('TBW_FOLLOW_CHECK'), 'I\'ve Followed button triggers TBW_FOLLOW_CHECK');
  assert(followNode.parameters.jsCode.includes('View Services'), 'Unlocked content includes View Services button');
  assert(followNode.parameters.jsCode.includes('AI Agents'), 'Unlocked content includes AI Agents button');

  // Test Node: IG - Prepare Private Reply
  const prepNode = patchedWf.nodes.find(n => n.name === 'IG - Prepare Private Reply');
  assert(Boolean(prepNode), 'Patched IG - Prepare Private Reply node exists in workflow');
  assert(!prepNode.parameters.jsCode.includes('Send Me Details” here and I’ll help'), 'Hardcoded Send Me Details string removed from private reply node');

  console.log('\n==============================================================================');
  console.log(`TEST SUMMARY: ${passed} OF ${total} TESTS PASSED (100% SUCCESS)`);
  console.log('==============================================================================');
}

run();
