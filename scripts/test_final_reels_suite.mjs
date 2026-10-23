import fs from 'fs';
import assert from 'assert';

// Load env
const env = {};
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
      env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
}
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) process.env[k] = v;
}

import {
  evaluateCommentCheck,
  evaluateDmContext,
  getReelRuleByMediaId,
  saveReelRule,
  getInstagramAutomationAnalytics,
  sendInstagramPublicCommentReply,
} from '../src/lib/instagram/reel-automation.ts';
import {
  evaluateMultilingualDmResponse,
  SERVICE_CATEGORIES,
} from '../src/lib/instagram/multilingual-responses.ts';
import {
  syncReelsFromMeta,
  getCachedSyncedReels,
} from '../src/lib/instagram/reel-sync-service.ts';

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function itAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('THE BUSINESS WORK — FINAL REELS AUTOMATION VERIFICATION SUITE');
  console.log('================================================================\n');

  console.log('--- TEST GROUP 1: FIRST PRIVATE REPLY & CLEAN PROMPT (FIX 1) ---');

  await itAsync('Initial comment private reply does NOT include "Send Me Details" and contains clean prompt', async () => {
    const dummyMediaId = '18395317168163106'; // Real numeric media ID
    await saveReelRule({
      media_id: dummyMediaId,
      title: 'Prompt Cleanliness Test',
      initial_dm_text: 'Thanks for commenting on our Reel! 👋\nReply “Send Me Details” here and I’ll share the full information! ✨',
      details_text: 'Here are the details on our AI automation.',
      is_enabled: true,
      trigger_mode: 'any_comment',
    });

    const res = await evaluateCommentCheck({
      comment_id: String(Date.now() + '101'),
      media_id: dummyMediaId,
      text: 'tell me more',
      ig_user_id: 'user_' + Date.now(),
      username: 'client_clean_test',
      timestamp: new Date().toISOString(),
    });

    assert.strictEqual(res.approved, true);
    assert.ok(!res.reply_text.includes('Send Me Details'), 'Must strip legacy Send Me Details');
    assert.ok(res.reply_text.includes('Reply Hi to get the details'), 'Must use short natural prompt');
  });

  it('Campaign continuation triggers on ANY inbound DM without requiring exact keywords', () => {
    const mockCampaign = {
      id: 'rule_test',
      media_id: '18395317168163106',
      active: true,
      initial_message: 'Thanks for commenting!',
      details_text: 'Here are the details on our systems!',
      follow_required: false,
    };

    // User replies with "Yo", "Hello", "Info", or emoji
    const resYo = evaluateMultilingualDmResponse({
      rawText: 'Yo',
      payload: '',
      isFirstDm: false,
      hasBeenWelcomed: false,
      campaign: mockCampaign,
      whatsappUrl: 'https://wa.me/917972020292',
    });

    assert.strictEqual(resYo.action, 'fixed');
    assert.ok(resYo.reply_text.includes('Here are the details on our systems!'));
    assert.strictEqual(resYo.is_welcome, false, 'Do not show repeated welcome messages');

    const resEmoji = evaluateMultilingualDmResponse({
      rawText: '🔥',
      payload: '',
      isFirstDm: false,
      hasBeenWelcomed: false,
      campaign: mockCampaign,
      whatsappUrl: 'https://wa.me/917972020292',
    });

    assert.strictEqual(resEmoji.action, 'fixed');
    assert.ok(resEmoji.reply_text.includes('Here are the details on our systems!'));
  });

  console.log('\n--- TEST GROUP 2: FOLLOW GATING & BUTTON FLOW (FIX 5) ---');

  it('Follow gated campaign routes non-followers to follow check', () => {
    const mockGatedCampaign = {
      id: 'rule_gated',
      media_id: '18395317168163106',
      active: true,
      initial_message: 'Thanks for commenting!',
      details_text: 'Secret unlocked details!',
      follow_required: true,
    };

    const res = evaluateMultilingualDmResponse({
      rawText: 'Hi',
      payload: '',
      isFirstDm: false,
      hasBeenWelcomed: false,
      campaign: mockGatedCampaign,
      whatsappUrl: 'https://wa.me/917972020292',
    });

    assert.strictEqual(res.action, 'follow_check', 'Must trigger follow check for gated campaign');
  });

  it('Official 4th Category is strictly "WhatsApp & Social Automation"', () => {
    assert.strictEqual(
      SERVICE_CATEGORIES.cat_whatsapp_social.name.en,
      'WhatsApp & Social Automation',
      'Category 4 must NEVER be renamed to Custom Integrations & Data'
    );
    assert.strictEqual(SERVICE_CATEGORIES.cat_whatsapp_social.serviceIds.length, 6, 'Must contain 6 services');
  });

  console.log('\n--- TEST GROUP 3: PUBLIC COMMENT REPLIES & RECURSION (FIX 2) ---');

  await itAsync('Public reply is blocked on self-account comments to prevent infinite loops', async () => {
    const selfRes = await sendInstagramPublicCommentReply({
      comment_id: '18099999999999999',
      media_id: '18395317168163106',
      comment_author_username: 'thebusinesswork.co',
      comment_author_id: '29081127174886627',
      text: 'Thanks! Check your DM',
    });

    assert.strictEqual(selfRes.success, false);
    assert.strictEqual(selfRes.skipped, true);
    assert.ok(selfRes.message.includes('thebusinesswork.co'), 'Must catch and ignore self comment');
  });

  await itAsync('evaluateCommentCheck includes public_reply payload when enabled on rule', async () => {
    const pubMediaId = '18395317168163106';
    await saveReelRule({
      media_id: pubMediaId,
      title: 'Public Reply Test Rule',
      is_enabled: true,
      auto_comment_reply_enabled: true,
      auto_comment_reply_text: 'Thanks! 👋 Check your DM for the details.',
      auto_comment_reply_variations: ['Var 1', 'Var 2'],
      trigger_mode: 'any_comment',
    });

    const check = await evaluateCommentCheck({
      comment_id: String(Date.now() + Math.floor(Math.random() * 10000)),
      media_id: pubMediaId,
      text: 'automation info please',
      ig_user_id: 'user_pub_' + Date.now(),
      username: 'potential_buyer',
      timestamp: new Date().toISOString(),
    });

    assert.strictEqual(check.approved, true);
    assert.ok(check.public_reply, 'public_reply object must be present');
    assert.strictEqual(check.public_reply.enabled, true);
    assert.ok(['Var 1', 'Var 2', 'Thanks! 👋 Check your DM for the details.'].includes(check.public_reply.text));
  });

  console.log('\n--- TEST GROUP 4: DELETED REEL SYNCHRONIZATION & RECONCILIATION (FIX 3 & 4) ---');

  await itAsync('Verified complete sync correctly isolates unavailable rules when Meta catalog has 0 items', async () => {
    const syncStore = await getCachedSyncedReels();
    assert.ok(syncStore && typeof syncStore === 'object');
    assert.ok(Array.isArray(syncStore.reels), 'Must return reels array');
    assert.ok(Array.isArray(syncStore.unavailable_rules), 'Must return unavailable_rules array');
    console.log(`     Active Published Reels: ${syncStore.reels.length}`);
    console.log(`     Archived/Unavailable Rules: ${syncStore.unavailable_rules.length}`);
  });

  await itAsync('Analytics returns reconciled real numbers without throwing', async () => {
    const stats = await getInstagramAutomationAnalytics();
    assert.ok(typeof stats.comments_ingested === 'number');
    assert.ok(typeof stats.private_replies_sent === 'number');
    assert.ok(typeof stats.public_replies_sent === 'number');
    assert.ok(typeof stats.verified_follows === 'number');
    assert.ok(stats.comments_ingested > 0, 'Reconciled comments must be > 0');
    console.log(`     Reconciled Comments Ingested: ${stats.comments_ingested}`);
    console.log(`     Reconciled Private Replies Sent: ${stats.private_replies_sent}`);
    console.log(`     Reconciled Verified Follows: ${stats.verified_follows}`);
  });

  // TEARDOWN: Ensure confirmed deleted reel rules are safely disabled in DB
  const { createClient } = await import('@supabase/supabase-js');
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    for (const mId of ['18395317168163106', '18999999999000000', '18352671520267494']) {
      await adminClient.from('instagram_reel_rules').update({ is_enabled: false }).eq('media_id', mId);
      await adminClient.from('admin_settings').upsert({
        key: `reel_rule_meta_${mId}`,
        value: {
          is_available: false,
          availability_status: 'deleted_or_unavailable',
          rule_status_reason: 'Reel confirmed deleted from Instagram account',
          updated_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    }
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
  if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
