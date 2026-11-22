import fs from 'fs';
import path from 'path';

// Load base workflow from n8n current
const baseWf = JSON.parse(fs.readFileSync('scratch/current_v3_3_workflow.json', 'utf8'));

// Clone workflow
const wf = JSON.parse(JSON.stringify(baseWf));
wf.name = 'TBW FRESH v3.3 - WhatsApp End Chat Fixed (IMPORT INACTIVE)';
wf.active = false; // Strictly INACTIVE for export deliverable

// 1. Update Node 04 (Parse Inbound)
const node04 = wf.nodes.find(n => n.name === '04 - Parse Inbound');
node04.parameters.jsCode = `
// 04 - Parse Inbound
// WhatsApp inbound filter, status receipt routing, session restart and duplicate protection.

const raw = $input.first().json;
const v = raw.entry?.[0]?.changes?.[0]?.value || raw;

// Handle WhatsApp delivery/read status updates cleanly without treating as customer messages
const rawStatuses = raw.statuses || v.statuses;
if (Array.isArray(rawStatuses) && rawStatuses.length > 0) {
  const st = rawStatuses[0];
  const wamid = st.id;
  const status = String(st.status || '').toLowerCase(); // sent, delivered, read, failed
  return [{
    json: {
      action: 'status_receipt',
      event_type: 'whatsapp_status_update',
      wamid,
      external_message_id: wamid,
      status,
      recipient_id: String(st.recipient_id || ''),
      timestamp: st.timestamp || Date.now(),
      errors: st.errors || null
    }
  }];
}

const m = raw.messages?.[0] || v.messages?.[0];

// Ignore invalid webhook events
if (!m?.from || !m?.id) {
  return [];
}

const phone = String(m.from).replace(/\\D/g, '');

if (!phone) {
  return [];
}

const msgText = String(
  m.text?.body ||
  m.interactive?.list_reply?.title ||
  m.interactive?.button_reply?.title ||
  m.button?.text ||
  ''
).trim().slice(0, 500);

const choice = String(
  m.interactive?.list_reply?.id ||
  m.interactive?.button_reply?.id ||
  m.button?.payload ||
  ''
);

// Workflow session storage
const mem = $getWorkflowStaticData('global');

mem.sessions ??= {};
mem.seen ??= {};

const now = Date.now();

// Prevent duplicate WhatsApp webhook processing
if (
  mem.seen[m.id] &&
  now - mem.seen[m.id] < 86400000
) {
  return [];
}

mem.seen[m.id] = now;

// Remove old duplicate records
if (Object.keys(mem.seen).length > 4000) {
  for (const [id, ts] of Object.entries(mem.seen)) {
    if (now - ts > 86400000) {
      delete mem.seen[id];
    }
  }
}

let s = mem.sessions[phone];
let newSession = false;

// Manual restart / greeting commands (Hello, Hi, Hey, Start, Menu, Restart, Namaste, Hello Bot)
const isGreetingOrRestart = /^(hello|hi|hey|start|menu|restart|namaste|halo)(\\s+bot)?$/i.test(msgText);
const hello = isGreetingOrRestart;

// Reliable End-Chat confirmation tracking & guard
const isEndConfirmPending = s && (
  s.stage === 'end_confirm' ||
  s.endConfirmationPending === true ||
  s.returnTo != null ||
  s.lastPayload?.interactive?.action?.buttons?.some(b => b.reply?.id === 'end_yes')
);

// If user taps end_yes or end_no when confirmation is pending, preserve end_confirm state
if (['end_yes', 'end_no'].includes(choice) && isEndConfirmPending) {
  s.stage = 'end_confirm';
  s.endConfirmationPending = true;
}

// Closed sessions only restart when customer initiates a new greeting / text interaction,
// never on repeat or stray end-chat button clicks
const shouldRestart =
  !s ||
  s.stage === 'timeout' ||
  (s.stage === 'manual_closed' && (isGreetingOrRestart || ['nav_main', 'go_appointment', 'go_services'].includes(choice))) ||
  isGreetingOrRestart ||
  (s.stage === 'human_wait' && !s.human_requested);

if (shouldRestart) {
  const lastBooking = s?.booking || null;
  const previousLeadKeys = s?.doneLeadKeys || {};
  const previousLang = s?.lang || '';
  const previousName = s?.name || '';
  const previousBusiness = s?.business || '';

  s = {
    sessionId:
      's_' +
      now.toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 8),

    stage: 'new',
    flow: '',
    lang: previousLang,
    name: previousName,
    business: previousBusiness,
    history: [],
    lastPayload: null,

    lastInboundAt: now,
    promptAt: now,
    nudged: false,
    human_requested: false,
    endConfirmationPending: false,
    returnTo: null,

    booking: lastBooking,
    doneLeadKeys: previousLeadKeys,

    created: now,
    updated: now
  };

  mem.sessions[phone] = s;
  newSession = true;
}

// Update customer activity
s.lastInboundAt = now;
s.lastInboundMessageId = m.id;
s.updated = now;

if (s.pendingCustomerMessage) {
  const old = mem.outbox?.[s.pendingCustomerMessage];
  if (old && old.status === 'retry') old.status = 'cancelled';
  s.pendingCustomerMessage = null;
}

// Customer explicitly requests human support
const isHuman = (choice === 'go_human' || choice === 'fallback_yes') && !s.humanAlertQueuedAt;
if (isHuman) {
  s.human_requested = true;
}

let adminAlertPayload = null;

// Send alert only once per session or handover
if ((newSession && !hello) || isHuman) {
  if (isHuman) s.humanAlertQueuedAt = now;

  const label = isHuman
    ? '🚨 Talk to Human Requested'
    : '🔔 WhatsApp Chat Started';

  const alert =
    label +
    '\\nCustomer: ' + (s.name || 'Visitor') +
    '\\nPhone: +' + phone +
    '\\nMessage: ' + msgText.slice(0, 100) +
    '\\nTime: ' +
    new Date(now).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata'
    });

  adminAlertPayload = {
    messaging_product: 'whatsapp',
    to: '918604600292',
    type: 'text',
    text: {
      preview_url: false,
      body: alert
    }
  };
}

s.promptAt = 0;
s.nudged = false;

// Persist session before returning
mem.sessions[phone] = s;

return [
  {
    json: {
      phone,
      choice,
      body: msgText,
      messageType: m.type,
      messageId: m.id,
      s,
      newSession,
      adminAlertPayload,
      action: 'route'
    }
  }
];
`;

// 2. Update Node 04c (Evaluate Takeover State)
const node04c = wf.nodes.find(n => n.name === '04c - Evaluate Takeover State');
node04c.parameters.jsCode = `
// TBW v3.3: fail-closed dashboard authorization with visible no-send diagnostic.
const original = $('04 - Parse Inbound').first().json || {};
const wire = $input.first()?.json || {};
const res = wire.body && typeof wire.body === 'object' ? wire.body : wire;
const store = $getWorkflowStaticData('global');
store.sessions ??= {};
const s = store.sessions[original.phone] || original.s;
if (!original.phone || !original.messageId || !s) return [];

function decision(allowed, reason) {
  original.s = s;
  original.automation_allowed = allowed === true;
  original.authorization_reason = String(reason).slice(0,180);
  original.authorization_http_status = Number(wire.statusCode || res.statusCode || 0) || null;
  original.dashboard_mode = typeof res.data?.mode === 'string' ? res.data.mode.slice(0,35) : 'missing';
  original.dashboard_can_respond = typeof res.data?.can_respond === 'boolean' ? res.data.can_respond : null;
  original.dashboard_manual_takeover = typeof res.data?.manual_takeover === 'boolean' ? res.data.manual_takeover : null;
  original.dashboard_automation_paused = typeof res.data?.automation_paused === 'boolean' ? res.data.automation_paused : null;
  return [{json:original}];
}

// Customer-initiated human assistance: acknowledge exactly once, then pause the bot.
const askedNow = ['go_human','fallback_yes'].includes(original.choice);
if (askedNow && !s.humanAckedAt) {
  s.human_requested = true; s.stage='human_wait'; s.promptAt=0; s.nudged=true;
  s.humanAckedAt=Date.now();
  const T={en:'Your request has been forwarded to our team. We will reply as soon as possible. 😊',hi:'आपकी रिक्वेस्ट हमारी टीम को भेज दी गई है। हम जल्द जवाब देंगे। 😊',hinglish:'Aapki request hamari team ko bhej di hai. Hum jaldi reply karenge. 😊',mr:'आपली विनंती आमच्या टीमकडे पाठवली आहे. आम्ही लवकरच उत्तर देऊ. 😊'};
  original.waPayload={messaging_product:'whatsapp',to:original.phone,type:'text',text:{preview_url:false,body:T[s.lang]||T.en}};
  original.handled=true; original.action='send';
  return decision(true,'customer_human_ack_once');
}

// System navigation & End-Chat buttons (end_yes, end_no, nav_end, nav_main, nav_back) MUST always be allowed to execute
// even if dashboard is unreachable or in human mode, so customer can close or cancel their session!
const isNavigationChoice = ['end_yes', 'end_no', 'nav_end', 'nav_main', 'nav_back'].includes(original.choice);
if (isNavigationChoice && !s.human_requested) {
  return decision(true, 'navigation_button_allowed');
}

if (s.human_requested === true) {
  s.stage='human_wait';s.promptAt=0;s.nudged=true;
  return decision(false,'customer_requested_human');
}
if (wire.error || res.error) {
  s.stage='human_wait';s.promptAt=0;s.nudged=true;
  return decision(false,'dashboard_mode_api_error');
}
if (res.success !== true || !res.data || typeof res.data !== 'object') {
  s.stage='human_wait';s.promptAt=0;s.nudged=true;
  return decision(false,'dashboard_mode_response_invalid');
}
const mode=res.data;
const explicitlyAllowed = mode.can_respond === true && mode.mode === 'ai' &&
  mode.manual_takeover === false && mode.automation_paused === false;
if (!explicitlyAllowed) {
  s.stage='human_wait';s.promptAt=0;s.nudged=true;
  return decision(false,mode.manual_takeover === true || mode.automation_paused === true || mode.mode === 'human'
    ? 'dashboard_human_takeover_active' : 'dashboard_did_not_authorize_automation');
}
// The dashboard has explicitly resumed automation. Fresh chat gets the main menu,
// not a stale previous human-wait response.
if (s.stage==='human_wait') {
  s.stage='new';s.flow='';s.lastPayload=null;s.history=[];s.promptAt=0;s.nudged=false;
}
return decision(true,'dashboard_automation_allowed');
`;

// 3. Update Node 08 (Main Menu + Navigation Logic)
const node08 = wf.nodes.find(n => n.name === '08 - Main Menu + Navigation Logic');
node08.parameters.jsCode = `
const _sessionContext = $input.first().json; const _staticStore = $getWorkflowStaticData('global'); try {
// Helpers common to separate editable logic nodes.
const x=$input.first().json, s=x.s, T=x.T||{}, L=T[s?.lang]||T.en;
function fmt(key,obj={}){let v=String(L[key]||T.en?.[key]||key);for(const [k,z] of Object.entries(obj))v=v.replaceAll('{'+k+'}',String(z));return v;}
function button(text,options){return {messaging_product:'whatsapp',to:x.phone,type:'interactive',interactive:{type:'button',body:{text},action:{buttons:options.slice(0,3).map(v=>({type:'reply',reply:{id:v[0],title:String(v[1]).slice(0,20)}}))}}};}
function list(text,options,title='Choose Option'){const rows=options.slice(0,10).map(v=>({id:v[0],title:String(v[1]).slice(0,24),description:String(v[2]||'').slice(0,72)}));return {messaging_product:'whatsapp',to:x.phone,type:'interactive',interactive:{type:'list',body:{text},action:{button:title.slice(0,20),sections:[{title:'The Business Work',rows}]}}};}
function message(text){return {messaging_product:'whatsapp',to:x.phone,type:'text',text:{preview_url:false,body:text}};}
function prompt(stage,flow,payload,{history=true}={}){if(history&&s.stage&&s.lastPayload&&s.stage!==stage){s.history??=[];s.history.push({stage:s.stage,flow:s.flow,payload:s.lastPayload});if(s.history.length>12)s.history.shift();}s.stage=stage;s.flow=flow;s.lastPayload=payload;s.promptAt=Date.now();s.nudged=false;x.waPayload=payload;x.handled=true;x.action='send';return x;}
function nav(){return [['nav_back',fmt('back')],['nav_main',fmt('menu')],['nav_end',fmt('endbtn')]];}
function menu(){return prompt('menu','',list(fmt('welcome'),[['go_appointment',fmt('book')],['go_services',fmt('services')],['go_human',fmt('humanbtn')],['go_error',fmt('help')],['nav_end',fmt('endbtn')]],'Choose Service'));}
function istNow(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  return Object.fromEntries(parts.filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
}
function dates(stage='appt_date'){
  const v=istNow(),day0=Date.UTC(Number(v.year),Number(v.month)-1,Number(v.day));
  const choices=[];
  for(let i=(Number(v.hour)>=21?1:0);i<=5;i++){
    const day=new Date(day0+i*86400000).toISOString().slice(0,10);
    choices.push(['date_'+day,day]);
  }
  return prompt(stage,'appointment',list(fmt('date'),choices.concat(nav()),'Select Date'));
}

if(x.skip||x.handled)return [{json:x}];
const choice=x.choice;
if(s.stage==='human_wait'&&!['nav_end','nav_main','nav_back'].includes(choice))return []; // human team owns subsequent messages

// 1. END CHAT REQUEST (nav_end)
if(choice==='nav_end'){
  s.returnTo={stage:s.stage,flow:s.flow,payload:s.lastPayload};
  s.endConfirmationPending=true;
  s.promptAt=0;
  s.nudged=true;
  const confirmPayload = button(fmt('end'),[['end_yes',fmt('confirm')],['end_no',fmt('resume')]]);
  const p = prompt('end_confirm',s.flow,confirmPayload,{history:false});
  // Do NOT seed timer for end confirmation dialog
  s.promptAt=0;
  s.nudged=true;
  x.s = s;
  _staticStore.sessions ??= {};
  _staticStore.sessions[x.phone] = s;
  return [{json:p}];
}

// 2. END CHAT CONFIRMED (end_yes) - User explicitly taps "Yes, End"
if(choice==='end_yes'){
  if(s.stage==='manual_closed'){
    return []; // Already closed, drop duplicates
  }
  s.stage='manual_closed';
  s.flow='';
  s.promptAt=0;
  s.nudged=true;
  s.lastPayload=null;
  s.history=[];
  s.returnTo=null;
  s.endConfirmationPending=false;
  s.pendingCustomerMessage=null;
  x.waPayload=message(fmt('thanks'));
  x.handled=true;
  x.action='send';
  x.s = s;
  _staticStore.sessions ??= {};
  _staticStore.sessions[x.phone] = s;
  return [{json:x}];
}

// 3. END CHAT CANCELLED (end_no) - User taps "No, Continue"
if(choice==='end_no'){
  const p=s.returnTo||s.fallbackReturn||{};
  s.stage=p.stage||'menu';
  s.flow=p.flow||'';
  s.promptAt=Date.now();
  s.nudged=false;
  s.lastPayload=p.payload||null;
  s.returnTo=null;
  s.endConfirmationPending=false;
  x.waPayload=p.payload||list(fmt('welcome'),[['go_appointment',fmt('book')],['go_services',fmt('services')],['go_human',fmt('humanbtn')],['nav_end',fmt('endbtn')]],'Choose');
  x.handled=true;
  x.action='send';
  x.s = s;
  _staticStore.sessions ??= {};
  _staticStore.sessions[x.phone] = s;
  return [{json:x}];
}

if(choice==='nav_main')return [{json:menu()}];
if(choice==='nav_back'){let p=s.history?.pop();if(!p)return [{json:menu()}];s.stage=p.stage;s.flow=p.flow;s.lastPayload=p.payload;s.promptAt=Date.now();s.nudged=false;x.waPayload=p.payload;x.action='send';x.handled=true;return [{json:x}];}
if(s.stage==='new')return [{json:menu()}];
if(['go_appointment','go_services','go_human'].includes(choice)){
 s.flow=choice.replace('go_','');s.history=[];
 if(choice==='go_human'&&!x.adminAlertPayload&&!s.humanAlertQueuedAt){s.humanAlertQueuedAt=Date.now();x.adminAlertPayload={messaging_product:'whatsapp',to:'918604600292',type:'text',text:{body:'🚨 Customer needs human support\\nPhone: +'+x.phone}};}
 if(!s.lang)return [{json:prompt('language',s.flow,list(fmt('language'),[['lang_en','English'],['lang_hi','हिंदी'],['lang_hinglish','Hinglish'],['lang_mr','मराठी'],['nav_main',fmt('menu')],['nav_end',fmt('endbtn')]],'Choose Language'))}];
 s.stage='flow_start';x.action='flow';return [{json:x}];
}
if(s.stage==='language'&&choice.startsWith('lang_')){const l=choice.slice(5);if(!['en','hi','hinglish','mr'].includes(l))return [{json:menu()}];s.lang=l;x.action='flow';s.stage='flow_start';return [{json:x}];}
if(choice==='go_error')return [{json:prompt('help','',button(fmt('invalid'),[['go_human',fmt('humanbtn')],['nav_main',fmt('no')],['nav_end',fmt('endbtn')]]))}];
if(s.stage==='help'&&choice==='nav_main')return [{json:menu()}];
if(s.stage==='fallback'&&choice==='fallback_no'){const p=s.fallbackReturn||{};s.stage=p.stage||'menu';s.flow=p.flow||'';s.promptAt=Date.now();s.nudged=false;x.waPayload=p.payload||list(fmt('welcome'),[['go_appointment',fmt('book')],['go_services',fmt('services')],['go_human',fmt('humanbtn')],['nav_end',fmt('endbtn')]],'Choose');x.handled=true;x.action='send';return [{json:x}];}
if(s.stage==='fallback'&&choice==='fallback_yes'){s.flow='human';s.stage='flow_start';x.action='flow';if(!s.humanAlertQueuedAt){s.humanAlertQueuedAt=Date.now();x.adminAlertPayload={messaging_product:'whatsapp',to:'918604600292',type:'text',text:{body:'🚨 Customer needs human support\\nPhone: +'+x.phone}};}return [{json:x}];}
return [{json:x}];
} finally { if (_sessionContext.s?.sessionId && _sessionContext.phone) { _staticStore.sessions ??= {}; _staticStore.sessions[_sessionContext.phone] = _sessionContext.s; } }
`;

// 4. Update Node 12 (Unexpected Input Logic)
const node12 = wf.nodes.find(n => n.name === '12 - Unexpected Input Logic');
node12.parameters.jsCode = `
const _sessionContext = $input.first().json; const _staticStore = $getWorkflowStaticData('global'); try {
// Helpers common to separate editable logic nodes.
const x=$input.first().json, s=x.s, T=x.T||{}, L=T[s?.lang]||T.en;
function fmt(key,obj={}){let v=String(L[key]||T.en?.[key]||key);for(const [k,z] of Object.entries(obj))v=v.replaceAll('{'+k+'}',String(z));return v;}
function button(text,options){return {messaging_product:'whatsapp',to:x.phone,type:'interactive',interactive:{type:'button',body:{text},action:{buttons:options.slice(0,3).map(v=>({type:'reply',reply:{id:v[0],title:String(v[1]).slice(0,20)}}))}}};}
function list(text,options,title='Choose Option'){const rows=options.slice(0,10).map(v=>({id:v[0],title:String(v[1]).slice(0,24),description:String(v[2]||'').slice(0,72)}));return {messaging_product:'whatsapp',to:x.phone,type:'interactive',interactive:{type:'list',body:{text},action:{button:title.slice(0,20),sections:[{title:'The Business Work',rows}]}}};}
function message(text){return {messaging_product:'whatsapp',to:x.phone,type:'text',text:{preview_url:false,body:text}};}
function prompt(stage,flow,payload,{history=true}={}){if(history&&s.stage&&s.lastPayload&&s.stage!==stage){s.history??=[];s.history.push({stage:s.stage,flow:s.flow,payload:s.lastPayload});if(s.history.length>12)s.history.shift();}s.stage=stage;s.flow=flow;s.lastPayload=payload;s.promptAt=Date.now();s.nudged=false;x.waPayload=payload;x.handled=true;x.action='send';return x;}
function nav(){return [['nav_back',fmt('back')],['nav_main',fmt('menu')],['nav_end',fmt('endbtn')]];}
function menu(){return prompt('menu','',list(fmt('welcome'),[['go_appointment',fmt('book')],['go_services',fmt('services')],['go_human',fmt('humanbtn')],['go_error',fmt('help')],['nav_end',fmt('endbtn')]],'Choose Service'));}
function istNow(){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  return Object.fromEntries(parts.filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
}
function dates(stage='appt_date'){
  const v=istNow(),day0=Date.UTC(Number(v.year),Number(v.month)-1,Number(v.day));
  const choices=[];
  for(let i=(Number(v.hour)>=21?1:0);i<=5;i++){
    const day=new Date(day0+i*86400000).toISOString().slice(0,10);
    choices.push(['date_'+day,day]);
  }
  return prompt(stage,'appointment',list(fmt('date'),choices.concat(nav()),'Select Date'));
}

if(x.handled||x.skip)return [{json:x}];
if(x.action==='book_read'||x.action==='save_service')return [{json:x}];

// CRITICAL GUARD: Never intercept valid navigation or end-chat confirmation buttons!
const navButtons = ['end_yes', 'end_no', 'nav_end', 'nav_main', 'nav_back', 'go_appointment', 'go_services', 'go_human', 'go_error'];
if(navButtons.includes(x.choice)) {
  return []; // Drop silently rather than confusing user with fallback
}

// Exactly ONE human suggestion for unexpected free text; no AI model and no repeated greeting.
if(s.stage==='fallback'||s.stage==='manual_closed')return []; // Subsequent invalid inputs or closed sessions stay quiet
s.fallbackReturn={stage:s.stage,flow:s.flow,payload:s.lastPayload};return [{json:prompt('fallback','',button(fmt('invalid'),[['fallback_yes',fmt('humanbtn')],['fallback_no',fmt('no')],['nav_end',fmt('endbtn')]]),{history:false})}];
} finally { if (_sessionContext.s?.sessionId && _sessionContext.phone) { _staticStore.sessions ??= {}; _staticStore.sessions[_sessionContext.phone] = _sessionContext.s; } }
`;

// 5. Update Node WA EVT - Seed Timer on Confirmed Reply
const nodeTimer = wf.nodes.find(n => n.name === 'WA EVT - Seed Timer on Confirmed Reply');
if (nodeTimer) {
  nodeTimer.parameters.jsCode = `
const o=$input.first().json||{};
if(o.sendStatus!=='sent'||!o.phone||!o.sendKey)return [];
const mem=$getWorkflowStaticData('global');
const s=mem.sessions?.[o.phone];
const job=mem.outbox?.[o.sendKey];
if(!s||!job||!s.promptAt||s.stage==='human_wait'||s.human_requested||
   s.stage==='manual_closed'||s.stage==='end_confirm'||s.endConfirmationPending===true||
   s.lastInboundMessageId!==job.messageId||s.sessionId!==job.sessionId)return [];
const task={phone:o.phone,session_id:s.sessionId,
 last_inbound_message_id:job.messageId,expected_prompt_at:Number(s.promptAt)};
// TWO independent webhook executions, never two Wait nodes within one execution.
return [{json:{kind:'nudge',...task}},{json:{kind:'close',...task}}];
`;
}

// Save corrected, importable, inactive deliverable JSON file
const exportPath = path.resolve('exports/TBW_FRESH_v3.3_WhatsApp_Fixed_EndChat.json');
fs.writeFileSync(exportPath, JSON.stringify(wf, null, 2));
console.log('Saved corrected inactive deliverable workflow to:', exportPath);
