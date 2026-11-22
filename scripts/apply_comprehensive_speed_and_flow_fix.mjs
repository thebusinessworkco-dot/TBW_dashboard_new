import fs from 'fs';
import path from 'path';

// 1. Load credentials
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
}

const N8N_BASE_URL = env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
const N8N_API_KEY = env.N8N_API_KEY;
const WORKFLOW_ID = 'IMtvrfNi2mBjwxOS';

if (!N8N_API_KEY) {
  console.error('ERROR: N8N_API_KEY missing from .env.local');
  process.exit(1);
}

async function run() {
  console.log(`=== 1. Fetching Live Workflow ${WORKFLOW_ID} from n8n ===`);
  const getRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });

  if (!getRes.ok) {
    throw new Error(`Failed to fetch workflow: ${getRes.status} ${getRes.statusText}`);
  }

  const liveWf = await getRes.json();
  console.log(`Live Workflow Name: ${liveWf.name}`);
  console.log(`Live Workflow Active: ${liveWf.active}`);

  // Create backup
  const backupPath = path.resolve(`backups/live_${WORKFLOW_ID}_pre_flow_fix_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(liveWf, null, 2));
  console.log(`✓ Backup saved to: ${backupPath}`);

  // FIX 1: Node 08 - Main Menu + Navigation Logic (Fix order so choice is NEVER swallowed by s.stage === 'new')
  const node08 = liveWf.nodes.find(n => n.name === '08 - Main Menu + Navigation Logic');
  if (node08) {
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

// USER CHOICES (MUST BE EVALUATED BEFORE s.stage === 'new' SO BUTTON CLICKS ARE NEVER SWALLOWED)
if(['go_appointment','go_services','go_human'].includes(choice)){
 s.flow=choice.replace('go_','');s.history=[];
 if(choice==='go_human'&&!x.adminAlertPayload&&!s.humanAlertQueuedAt){s.humanAlertQueuedAt=Date.now();x.adminAlertPayload={messaging_product:'whatsapp',to:'918604600292',type:'text',text:{body:'🚨 Customer needs human support\\nPhone: +'+x.phone}};}
 if(!s.lang)return [{json:prompt('language',s.flow,list(fmt('language'),[['lang_en','English'],['lang_hi','हिंदी'],['lang_hinglish','Hinglish'],['lang_mr','मराठी'],['nav_main',fmt('menu')],['nav_end',fmt('endbtn')]],'Choose Language'))}];
 s.stage='flow_start';x.action='flow';return [{json:x}];
}

if(s.stage==='new')return [{json:menu()}];

if(s.stage==='language'&&choice.startsWith('lang_')){const l=choice.slice(5);if(!['en','hi','hinglish','mr'].includes(l))return [{json:menu()}];s.lang=l;x.action='flow';s.stage='flow_start';return [{json:x}];}
if(choice==='go_error')return [{json:prompt('help','',button(fmt('invalid'),[['go_human',fmt('humanbtn')],['nav_main',fmt('no')],['nav_end',fmt('endbtn')]]))}];
if(s.stage==='help'&&choice==='nav_main')return [{json:menu()}];
if(s.stage==='fallback'&&choice==='fallback_no'){const p=s.fallbackReturn||{};s.stage=p.stage||'menu';s.flow=p.flow||'';s.promptAt=Date.now();s.nudged=false;x.waPayload=p.payload||list(fmt('welcome'),[['go_appointment',fmt('book')],['go_services',fmt('services')],['go_human',fmt('humanbtn')],['nav_end',fmt('endbtn')]],'Choose');x.handled=true;x.action='send';return [{json:x}];}
if(s.stage==='fallback'&&choice==='fallback_yes'){s.flow='human';s.stage='flow_start';x.action='flow';if(!s.humanAlertQueuedAt){s.humanAlertQueuedAt=Date.now();x.adminAlertPayload={messaging_product:'whatsapp',to:'918604600292',type:'text',text:{body:'🚨 Customer needs human support\\nPhone: +'+x.phone}};}return [{json:x}];}
return [{json:x}];
} finally { if (_sessionContext.s?.sessionId && _sessionContext.phone) { _staticStore.sessions ??= {}; _staticStore.sessions[_sessionContext.phone] = _sessionContext.s; } }
`;
    console.log('✓ Node 08 patched: user choices take precedence over s.stage === "new"');
  }

  // FIX 2: WA EVT - Seed Timer on Confirmed Reply (Disable dead loopback webhook call)
  const nodeTimer = liveWf.nodes.find(n => n.name === 'WA EVT - Seed Timer on Confirmed Reply');
  if (nodeTimer) {
    nodeTimer.parameters.jsCode = `
// WA EVT - Seed Timer on Confirmed Reply
// Returns [] to eliminate dead 6-second timeout hanging execution and locking static data
return [];
`;
    console.log('✓ Node "WA EVT - Seed Timer on Confirmed Reply" patched: eliminates 6s dead timeout');
  }

  // FIX 3: Lower timeout on background logging nodes to 3000ms
  const node26d = liveWf.nodes.find(n => n.name === '26d - Log Outbound to Dashboard');
  if (node26d && node26d.parameters?.options) {
    node26d.parameters.options.timeout = 3000;
    console.log('✓ Node 26d timeout reduced to 3000ms');
  }

  const node04a = liveWf.nodes.find(n => n.name === '04a - Log Inbound to Dashboard');
  if (node04a && node04a.parameters?.options) {
    node04a.parameters.options.timeout = 3000;
    console.log('✓ Node 04a timeout reduced to 3000ms');
  }

  // 4. Deploy to live n8n
  console.log(`\n=== 2. Deploying Patched Workflow to Live n8n (${WORKFLOW_ID}) ===`);
  const payload = {
    name: liveWf.name,
    nodes: liveWf.nodes,
    connections: liveWf.connections,
    settings: liveWf.settings
  };

  const putRes = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`Failed to update workflow on n8n (${putRes.status}): ${errText}`);
  }

  const updatedWf = await putRes.json();
  console.log(`✓ LIVE DEPLOYMENT SUCCESSFUL! Workflow ID: ${updatedWf.id}`);
  console.log(`✓ Active: ${updatedWf.active}`);

  // 5. Update local deliverable export
  const exportPath = path.resolve('exports/TBW_FRESH_v3.3_WhatsApp_Fixed_EndChat.json');
  if (fs.existsSync(exportPath)) {
    const expWf = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
    const exp08 = expWf.nodes.find(n => n.name === '08 - Main Menu + Navigation Logic');
    if (exp08 && node08) exp08.parameters.jsCode = node08.parameters.jsCode;
    const expTimer = expWf.nodes.find(n => n.name === 'WA EVT - Seed Timer on Confirmed Reply');
    if (expTimer && nodeTimer) expTimer.parameters.jsCode = nodeTimer.parameters.jsCode;
    const exp26d = expWf.nodes.find(n => n.name === '26d - Log Outbound to Dashboard');
    if (exp26d && node26d) exp26d.parameters.options.timeout = 3000;
    const exp04a = expWf.nodes.find(n => n.name === '04a - Log Inbound to Dashboard');
    if (exp04a && node04a) exp04a.parameters.options.timeout = 3000;
    fs.writeFileSync(exportPath, JSON.stringify(expWf, null, 2));
    console.log(`✓ Synchronized deliverable file: ${exportPath}`);
  }

  console.log('\n🎉 ALL FIXES APPLIED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('❌ FAILED:', err);
  process.exit(1);
});
