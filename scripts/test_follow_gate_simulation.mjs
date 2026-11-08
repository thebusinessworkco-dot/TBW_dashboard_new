import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyMatch = envFile.match(/N8N_API_KEY\s*=\s*(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';

async function test() {
  const res = await fetch('https://n8n.thebusinesswork.com/api/v1/workflows/IuLZQgoH3N8Zc7OS', {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  const node = data.nodes.find(n => n.name === 'IG - Conversation');
  const code = node.parameters.jsCode;

  function runSimulation(e, ctx, initialSession = null) {
    const mem = { ig4: { sessions: initialSession ? { [e.ig_user_id]: initialSession } : {}, leads: {}, manualIds: {} } };
    const $getWorkflowStaticData = () => mem;
    const $input = {
      all: () => [{
        json: {
          body: ctx,
          data: ctx,
          statusCode: 200
        }
      }]
    };
    const $ = (nodeName) => ({
      itemMatching: () => ({ json: e })
    });

    const fn = new Function('e', 'ctx', '$input', '$getWorkflowStaticData', '$', code);
    return fn(e, ctx, $input, $getWorkflowStaticData, $);
  }

  const e1 = {
    event_type: 'dm',
    event_id: 'evt_1',
    ig_user_id: '123456789',
    text: "I'm following ✅",
    quick_reply_payload: 'IG_VERIFY_FOLLOW',
    bridge_reply_allowed: true,
    timestamp: new Date().toISOString()
  };
  const ctx1 = {
    approved: true,
    reply_allowed: true,
    mode: 'ai',
    is_following: false,
    follow_status: 'not_following',
    campaign: { follow_required: true }
  };
  const inputJson = {
    state: null
  };
  const mem = { ig4: { sessions: {}, leads: {}, manualIds: {} } };
  const $getWorkflowStaticData = () => mem;
  const $input = { all: () => [{ json: inputJson }] };
  const $ = (nodeName) => {
    if (nodeName === 'IG - DM Context') return { itemMatching: () => ({ json: { body: ctx1, statusCode: 200 } }) };
    if (nodeName === 'IG - Context Input') return { itemMatching: () => ({ json: e1 }) };
    return { itemMatching: () => ({ json: {} }) };
  };
  const fn = new Function('$input', '$getWorkflowStaticData', '$', code);
  const res1 = fn($input, $getWorkflowStaticData, $);
  console.log('--- TEST 1 RESULT (User NOT following) ---');
  console.log('Kind:', res1[0]?.json?.kind);
  console.log('Send Type:', res1[0]?.json?.send_type);
  console.log('Display text:', res1[0]?.json?.display_text);
  console.log('Buttons:', res1[0]?.json?.igPayload?.message?.attachment?.payload?.buttons);

  console.log('\n--- TEST 2: User clicks "I\'m following ✅" AND IS following ---');
  const ctx2 = {
    approved: true,
    reply_allowed: true,
    mode: 'ai',
    is_following: true,
    follow_status: 'follows',
    campaign: { follow_required: true }
  };
  const $2 = (nodeName) => {
    if (nodeName === 'IG - DM Context') return { itemMatching: () => ({ json: { body: ctx2, statusCode: 200 } }) };
    if (nodeName === 'IG - Context Input') return { itemMatching: () => ({ json: e1 }) };
    return { itemMatching: () => ({ json: {} }) };
  };
  const res2 = fn($input, $getWorkflowStaticData, $2);
  console.log('Kind:', res2[0]?.json?.kind);
  console.log('Send Type:', res2[0]?.json?.send_type);
  console.log('Display text:', res2[0]?.json?.display_text);

  console.log('\n--- TEST 3: Fresh user sends normal "Hi" ---');
  const e3 = {
    event_type: 'dm',
    event_id: 'evt_3',
    ig_user_id: '987654321',
    text: "Hi",
    quick_reply_payload: '',
    bridge_reply_allowed: true,
    timestamp: new Date().toISOString()
  };
  const $3 = (nodeName) => {
    if (nodeName === 'IG - DM Context') return { itemMatching: () => ({ json: { body: ctx1, statusCode: 200 } }) };
    if (nodeName === 'IG - Context Input') return { itemMatching: () => ({ json: e3 }) };
    return { itemMatching: () => ({ json: {} }) };
  };
  const res3 = fn($input, $getWorkflowStaticData, $3);
  console.log('Kind:', res3[0]?.json?.kind);
  console.log('Display text:', res3[0]?.json?.display_text);
}

test().catch(console.error);
