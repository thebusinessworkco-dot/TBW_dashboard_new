import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

const N8N_BASE = process.env.N8N_API_BASE_URL || 'https://n8n.thebusinesswork.com';
const N8N_KEY = process.env.N8N_API_KEY;

if (!N8N_KEY) {
  console.error('ERROR: N8N_API_KEY missing from environment.');
  process.exit(1);
}

async function fetchN8n(endpoint) {
  const url = `${N8N_BASE}/api/v1${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'X-N8N-API-KEY': N8N_KEY,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} on ${endpoint}`);
  }
  return res.json();
}

async function audit() {
  console.log(`Starting read-only n8n workflow audit at ${N8N_BASE}...`);
  const listData = await fetchN8n('/workflows?limit=100');
  const workflows = listData.data || listData;
  console.log(`Found ${workflows.length} workflows in total.\n`);

  const auditResults = [];

  for (let i = 0; i < workflows.length; i++) {
    const wfSummary = workflows[i];
    try {
      const fullWf = await fetchN8n(`/workflows/${wfSummary.id}`);
      
      // Fetch latest executions (last 3)
      let executions = [];
      try {
        const execData = await fetchN8n(`/executions?workflowId=${wfSummary.id}&limit=3`);
        executions = execData.data || execData || [];
      } catch (e) {
        // Some workflows might have no execution permissions or empty
      }

      // Identify triggers
      const triggers = [];
      const webhooks = [];
      const subworkflowCalls = [];
      const externalServices = new Set();
      
      for (const node of fullWf.nodes || []) {
        const type = node.type || '';
        
        // Triggers
        if (type.includes('Trigger') || type.includes('webhook') || type.includes('interval') || type.includes('cron') || type.includes('schedule')) {
          triggers.push({
            name: node.name,
            type: node.type,
            parameters: node.parameters
          });
        }

        // Webhook specific
        if (type.toLowerCase().includes('webhook')) {
          webhooks.push({
            name: node.name,
            path: node.parameters?.path,
            httpMethod: node.parameters?.httpMethod || 'GET'
          });
        }

        // Subworkflow caller (Execute Workflow)
        if (type.includes('executeWorkflow')) {
          subworkflowCalls.push({
            name: node.name,
            workflowId: node.parameters?.workflowId,
            workflowName: node.parameters?.workflowName
          });
        }

        // Services detection
        if (type.includes('googleSheets')) externalServices.add('Google Sheets');
        if (type.includes('googleCalendar')) externalServices.add('Google Calendar');
        if (type.includes('httpRequest')) {
          const urlStr = String(node.parameters?.url || '');
          if (urlStr.includes('supabase.co')) externalServices.add('Supabase');
          if (urlStr.includes('graph.facebook.com') || urlStr.includes('instagram')) externalServices.add('Meta Graph API (Instagram/WhatsApp)');
          if (urlStr.includes('thebusinesswork.com')) externalServices.add('TBW Dashboard / Webhooks');
          if (urlStr.includes('sheets.googleapis.com')) externalServices.add('Google Sheets Direct');
        }
        if (type.includes('postgres')) externalServices.add('PostgreSQL');
        if (type.includes('whatsApp')) externalServices.add('WhatsApp Cloud');
      }

      // Last execution details
      let lastExecInfo = 'None';
      if (executions.length > 0) {
        const last = executions[0];
        lastExecInfo = `${last.status} at ${last.startedAt || last.createdAt} (ID: ${last.id})`;
      }

      auditResults.push({
        id: fullWf.id,
        name: fullWf.name,
        active: fullWf.active,
        nodeCount: fullWf.nodes?.length || 0,
        createdAt: fullWf.createdAt,
        updatedAt: fullWf.updatedAt,
        settings: fullWf.settings || {},
        triggers,
        webhooks,
        subworkflowCalls,
        externalServices: Array.from(externalServices),
        lastExecution: lastExecInfo,
        recentExecutionsCount: executions.length
      });

      console.log(`[${i + 1}/${workflows.length}] Audited: ${fullWf.name} (${fullWf.id}) - Active: ${fullWf.active} - Nodes: ${fullWf.nodes?.length}`);
    } catch (err) {
      console.error(`Failed to audit workflow ${wfSummary.id} (${wfSummary.name}):`, err.message);
    }
  }

  // Cross-reference subworkflow calls
  // Find which workflows are called by which
  for (const wf of auditResults) {
    wf.calledBy = [];
    for (const other of auditResults) {
      if (other.id === wf.id) continue;
      const callsMe = other.subworkflowCalls.some(call => call.workflowId === wf.id);
      if (callsMe) {
        wf.calledBy.push({ id: other.id, name: other.name });
      }
    }
  }

  const outputPath = path.resolve(process.cwd(), 'scripts', 'n8n_audit_full_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(auditResults, null, 2), 'utf8');
  console.log(`\nAudit finished! Detailed JSON written to ${outputPath}`);
}

audit().catch(console.error);
