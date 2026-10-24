/**
 * PHASE 1: Complete Database & Production Audit
 * Inspects all Instagram automation tables for data integrity
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mkeostxsprhhknmznpke.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZW9zdHhzcHJoaGtubXpucGtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjU3MDUzOCwiZXhwIjoyMTA4MTQ2NTM4fQ.GQyMhloxnGMumQywYGw5-cSUOn-BxOSSaQjOsh0JjKU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function audit() {
  console.log('=== PHASE 1: COMPLETE DATABASE AUDIT ===\n');

  // 1. Reel Rules
  console.log('--- 1. INSTAGRAM REEL RULES ---');
  const { data: rules, error: rulesErr } = await supabase
    .from('instagram_reel_rules')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (rulesErr) console.log('Error:', rulesErr.message);
  else {
    console.log(`Total rules: ${rules.length}`);
    for (const r of rules) {
      console.log(`  Rule: ${r.title}`);
      console.log(`    media_id: ${r.media_id}`);
      console.log(`    is_enabled: ${r.is_enabled}`);
      console.log(`    comments_count: ${r.comments_count}`);
      console.log(`    private_replies_count: ${r.private_replies_count}`);
      console.log(`    verified_follows_count: ${r.verified_follows_count}`);
      console.log(`    failed_sends_count: ${r.failed_sends_count}`);
      console.log(`    created_at: ${r.created_at}`);
      console.log(`    updated_at: ${r.updated_at}`);
    }
  }

  // 2. Comment Intents (ALL)
  console.log('\n--- 2. INSTAGRAM COMMENT INTENTS ---');
  const { data: intents, error: intentsErr } = await supabase
    .from('instagram_comment_intents')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (intentsErr) console.log('Error:', intentsErr.message);
  else {
    console.log(`Total intents: ${intents.length}`);
    const stateCounts = {};
    const mediaIdCounts = {};
    const sourceAttrib = {};
    for (const i of intents) {
      stateCounts[i.private_reply_state] = (stateCounts[i.private_reply_state] || 0) + 1;
      mediaIdCounts[i.media_id] = (mediaIdCounts[i.media_id] || 0) + 1;
      sourceAttrib[i.source_attribution || 'unknown'] = (sourceAttrib[i.source_attribution || 'unknown'] || 0) + 1;
    }
    console.log('  State distribution:', JSON.stringify(stateCounts));
    console.log('  Media ID distribution:', JSON.stringify(mediaIdCounts));
    console.log('  Source attribution:', JSON.stringify(sourceAttrib));
    
    // Check for suspicious patterns
    const userIds = new Set(intents.map(i => i.ig_user_id).filter(Boolean));
    console.log(`  Unique user IDs: ${userIds.size}`);
    
    // Check for test-like comment_ids (non-numeric, short)
    const suspiciousIntents = intents.filter(i => !/^\d{10,}$/.test(i.comment_id));
    if (suspiciousIntents.length > 0) {
      console.log(`  ⚠️ SUSPICIOUS INTENTS (non-standard comment_id format): ${suspiciousIntents.length}`);
      for (const s of suspiciousIntents) {
        console.log(`    comment_id: ${s.comment_id}, media_id: ${s.media_id}, state: ${s.private_reply_state}, text: ${(s.comment_text || '').slice(0,50)}`);
      }
    }
    
    // Print last 10 intents
    console.log('\n  Last 10 intents:');
    for (const i of intents.slice(0, 10)) {
      console.log(`    [${i.created_at}] comment_id: ${i.comment_id}, media: ${i.media_id}, user: ${i.ig_user_id}, state: ${i.private_reply_state}, text: ${(i.comment_text || '').slice(0,40)}`);
    }
  }

  // 3. Customer Context
  console.log('\n--- 3. INSTAGRAM CUSTOMER CONTEXT ---');
  const { data: contexts, error: ctxErr } = await supabase
    .from('instagram_customer_context')
    .select('*')
    .order('last_event_at', { ascending: false });
  
  if (ctxErr) console.log('Error:', ctxErr.message);
  else {
    console.log(`Total customer contexts: ${contexts.length}`);
    const followStatuses = {};
    for (const c of contexts) {
      followStatuses[c.follow_status || 'null'] = (followStatuses[c.follow_status || 'null'] || 0) + 1;
    }
    console.log('  Follow status distribution:', JSON.stringify(followStatuses));
    
    for (const c of contexts) {
      console.log(`  User: ${c.ig_user_id}, follow_status: ${c.follow_status}, pending_media: ${c.pending_media_id}, first_dm: ${c.first_dm_at}, last_event: ${c.last_event_at}, expires: ${c.context_expires_at}`);
    }
  }

  // 4. Automation Events
  console.log('\n--- 4. INSTAGRAM AUTOMATION EVENTS ---');
  const { data: events, error: eventsErr } = await supabase
    .from('instagram_automation_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (eventsErr) console.log('Error:', eventsErr.message);
  else {
    console.log(`Total events (last 50): ${events.length}`);
    const eventTypeCounts = {};
    for (const e of events) {
      eventTypeCounts[e.event_type] = (eventTypeCounts[e.event_type] || 0) + 1;
    }
    console.log('  Event types:', JSON.stringify(eventTypeCounts));
    for (const e of events.slice(0, 20)) {
      console.log(`  [${e.created_at}] type: ${e.event_type}, media: ${e.media_id}, user: ${e.ig_user_id}, success: ${e.provider_success}, error: ${e.error_message || '-'}`);
    }
  }

  // 5. Admin Settings - reel_rule_meta_*
  console.log('\n--- 5. ADMIN SETTINGS (reel_rule_meta_*) ---');
  const { data: metaSettings, error: metaErr } = await supabase
    .from('admin_settings')
    .select('key, value, updated_at')
    .like('key', 'reel_rule_meta_%');
  
  if (metaErr) console.log('Error:', metaErr.message);
  else {
    console.log(`Total meta settings: ${metaSettings.length}`);
    for (const s of metaSettings) {
      console.log(`  ${s.key}:`, JSON.stringify(s.value));
    }
  }

  // 6. Check synced reels cache
  console.log('\n--- 6. SYNCED REELS CACHE ---');
  const { data: cacheData, error: cacheErr } = await supabase
    .from('admin_settings')
    .select('value, updated_at')
    .eq('key', 'instagram_synced_reels')
    .maybeSingle();
  
  if (cacheErr) console.log('Error:', cacheErr.message);
  else if (cacheData) {
    const cache = cacheData.value;
    console.log(`  last_synced_at: ${cache.last_synced_at}`);
    console.log(`  account: ${JSON.stringify(cache.account)}`);
    console.log(`  reels count: ${cache.reels?.length || 0}`);
    console.log(`  unavailable_rules count: ${cache.unavailable_rules?.length || 0}`);
    if (cache.reels?.length > 0) {
      for (const r of cache.reels) {
        console.log(`    Reel: ${r.media_id}, shortcode: ${r.shortcode}, available: ${r.is_available}`);
      }
    }
    if (cache.unavailable_rules?.length > 0) {
      for (const r of cache.unavailable_rules) {
        console.log(`    Unavailable: ${r.media_id}, reason: ${r.rule_status_reason}`);
      }
    }
  } else {
    console.log('  No synced reels cache found');
  }

  // 7. Check if migration 20261024 columns exist
  console.log('\n--- 7. MIGRATION STATUS CHECK ---');
  const { data: colCheck, error: colErr } = await supabase
    .from('instagram_reel_rules')
    .select('auto_comment_reply_enabled, is_available, availability_status, public_replies_count')
    .limit(1);
  
  if (colErr) {
    console.log(`  Migration 20261024 NOT applied: ${colErr.message}`);
  } else {
    console.log(`  Migration 20261024 columns EXIST`);
  }

  const { data: intentColCheck, error: intentColErr } = await supabase
    .from('instagram_comment_intents')
    .select('public_reply_status, public_reply_text')
    .limit(1);
  
  if (intentColErr) {
    console.log(`  Intent public reply columns NOT applied: ${intentColErr.message}`);
  } else {
    console.log(`  Intent public reply columns EXIST`);
  }

  console.log('\n=== AUDIT COMPLETE ===');
}

audit().catch(console.error);
