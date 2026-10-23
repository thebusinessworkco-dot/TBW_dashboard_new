import fs from 'fs';
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

import { createClient } from '@supabase/supabase-js';
import { syncReelsFromMeta } from '../src/lib/instagram/reel-sync-service.ts';

async function reconcile() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('Reconciling existing database state...');

  // 1. Mark confirmed delivered comment intents as 'sent'
  const realCommentIds = [
    '18099033521408982',
    '18108204301958211',
    '18119671226080197',
    '18094133321680437'
  ];
  for (const cId of realCommentIds) {
    await supabase
      .from('instagram_comment_intents')
      .update({ private_reply_state: 'sent', updated_at: new Date().toISOString() })
      .eq('comment_id', cId);
  }
  console.log('Marked real comment intents as sent.');

  // 2. Mark confirmed follower context
  const confirmedFollowerUsers = ['1916579805988830', '3228059197364599'];
  for (const uId of confirmedFollowerUsers) {
    await supabase
      .from('instagram_customer_context')
      .update({ follow_status: 'follows', updated_at: new Date().toISOString() })
      .eq('ig_user_id', uId);
  }
  console.log('Marked verified follower contexts.');

  // 3. Trigger verified Meta Sync to officially update published media & pause deleted reels
  const syncResult = await syncReelsFromMeta({ maxPages: 5 });
  console.log('Meta Sync result:', syncResult.success, 'Published reels count:', syncResult.store.reels.length, 'Unavailable rules count:', syncResult.store.unavailable_rules?.length);

  // 4. Update rules counts
  await supabase
    .from('instagram_reel_rules')
    .update({
      comments_count: 3,
      private_replies_count: 3,
      verified_follows_count: 1,
      is_enabled: false,
    })
    .eq('media_id', '18352671520267494');

  await supabase
    .from('instagram_reel_rules')
    .update({
      comments_count: 1,
      private_replies_count: 1,
      verified_follows_count: 1,
      is_enabled: false,
    })
    .eq('media_id', '18395317168163106');

  console.log('Reconciliation complete!');
}

reconcile().catch(console.error);
