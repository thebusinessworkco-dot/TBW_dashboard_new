/**
 * PHASE 1: n8n Workflow Audit + Live Instagram Media Check
 */
import { createClient } from '@supabase/supabase-js';

const N8N_API_BASE = 'https://n8n.thebusinesswork.com';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

const IG_TOKEN = 'IGABABARr4cZAdBZAFpnajh1NnhkZAmI3bzhiS0JrQ3JnU2NCd1p3blI0VXdmdEtfRHcyM21SSzVSTkpCN1pZAZAEkxZAzNoYk5fSklmRUJsUEo3WUNha3RjTExrZAUpzc25TTnlRbmU5ZA2oySmVIMmlxb3Q3TmRJdUJvVW9aU2o0MHVzOAZDZD';

async function checkN8n() {
  console.log('=== n8n WORKFLOW AUDIT ===\n');
  
  // 1. Check workflow VBrjbhPeDypXt12q
  try {
    const res = await fetch(`${N8N_API_BASE}/api/v1/workflows/VBrjbhPeDypXt12q`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    const data = await res.json();
    console.log('Workflow ID: VBrjbhPeDypXt12q');
    console.log(`  Name: ${data.name}`);
    console.log(`  Active: ${data.active}`);
    console.log(`  Nodes count: ${data.nodes?.length}`);
    console.log(`  Updated: ${data.updatedAt}`);
    
    // Check relevant node names
    if (data.nodes) {
      const nodeNames = data.nodes.map(n => n.name);
      console.log(`  Node names: ${nodeNames.join(', ')}`);
      
      // Check for public comment reply node
      const publicReplyNodes = data.nodes.filter(n => 
        n.name?.toLowerCase().includes('public') || 
        n.name?.toLowerCase().includes('comment reply') ||
        n.name?.toLowerCase().includes('comment_reply')
      );
      console.log(`  Public reply nodes: ${publicReplyNodes.length}`);
      
      // Check webhook triggers
      const webhookNodes = data.nodes.filter(n => n.type?.includes('webhook'));
      console.log(`  Webhook nodes: ${webhookNodes.length}`);
      for (const wh of webhookNodes) {
        console.log(`    ${wh.name}: ${wh.type}, path: ${wh.parameters?.path || 'N/A'}`);
      }
    }
  } catch (err) {
    console.log('n8n workflow fetch error:', err.message);
  }

  // 2. Check recent executions
  try {
    const res = await fetch(`${N8N_API_BASE}/api/v1/executions?workflowId=VBrjbhPeDypXt12q&limit=10&status=error`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    const data = await res.json();
    console.log(`\n  Recent error executions: ${data.data?.length || 0}`);
    if (data.data) {
      for (const e of data.data.slice(0, 5)) {
        console.log(`    [${e.startedAt}] status: ${e.status}, finished: ${e.stoppedAt}`);
      }
    }
  } catch (err) {
    console.log('Executions fetch error:', err.message);
  }

  // 3. Check all executions count
  try {
    const res = await fetch(`${N8N_API_BASE}/api/v1/executions?workflowId=VBrjbhPeDypXt12q&limit=20`, {
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });
    const data = await res.json();
    console.log(`\n  Recent executions (all): ${data.data?.length || 0}`);
    if (data.data) {
      for (const e of data.data.slice(0, 10)) {
        console.log(`    [${e.startedAt}] status: ${e.status}`);
      }
    }
  } catch (err) {
    console.log('All execs fetch error:', err.message);
  }
}

async function checkLiveInstagramMedia() {
  console.log('\n\n=== LIVE INSTAGRAM MEDIA CHECK ===\n');
  
  try {
    // Check account
    const accRes = await fetch(`https://graph.instagram.com/v26.0/me?fields=id,username,name,media_count,followers_count`, {
      headers: { Authorization: `Bearer ${IG_TOKEN}` }
    });
    const acc = await accRes.json();
    if (acc.error) {
      console.log('IG Account Error:', acc.error.message);
      return;
    }
    console.log('Account:', JSON.stringify(acc));

    // Fetch all media
    const mediaRes = await fetch(`https://graph.instagram.com/v26.0/me/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,comments_count&limit=50`, {
      headers: { Authorization: `Bearer ${IG_TOKEN}` }
    });
    const mediaData = await mediaRes.json();
    if (mediaData.error) {
      console.log('IG Media Error:', mediaData.error.message);
      return;
    }
    
    console.log(`Total media items: ${mediaData.data?.length || 0}`);
    if (mediaData.data) {
      for (const m of mediaData.data) {
        const isReel = m.media_product_type === 'REELS' || m.media_type === 'VIDEO' || (m.permalink || '').includes('/reel/');
        console.log(`  [${isReel ? 'REEL' : m.media_type}] ID: ${m.id}, comments: ${m.comments_count || 0}, date: ${m.timestamp}, permalink: ${m.permalink}`);
        console.log(`    Caption: ${(m.caption || '').slice(0, 80)}`);
      }
    }

    // Check if there's a next page
    if (mediaData.paging?.next) {
      console.log('\n  (More media available on next page)');
    }
  } catch (err) {
    console.log('IG fetch error:', err.message);
  }
}

async function run() {
  await checkN8n();
  await checkLiveInstagramMedia();
}

run().catch(console.error);
