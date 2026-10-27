import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = 'C:/Users/amanr/.gemini/antigravity-ide/brain/20b3fe5c-4424-4302-ba4f-32eaaf3a1b00/.user_uploaded';
const EXPORT_DIR = path.resolve('exports');

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

function generateNodeId() {
  return crypto.randomUUID();
}

console.log('Generating TBW v3.2 Production-Ready Inactive Workflows...');

// ============================================================================
// 1. WHATSAPP WORKFLOW (TBW FRESH v3.2)
// ============================================================================
const waSourcePath = path.join(UPLOAD_DIR, 'media_1793125603790.json');
const waWorkflow = JSON.parse(fs.readFileSync(waSourcePath, 'utf8'));

// Protect live workflow ID: Assign a safe new unique ID
waWorkflow.id = '31f28b21-49b9-4a94-9e3d-8d8a57ba8d01';
waWorkflow.name = 'TBW FRESH v3.2 - Dashboard Integrated (IMPORT INACTIVE)';
waWorkflow.active = false; // Strictly INACTIVE for safe import

// Find Node 04 - Parse Inbound
const waParseInboundNode = waWorkflow.nodes.find(n => n.name === '04 - Parse Inbound');
if (!waParseInboundNode) throw new Error('Missing 04 - Parse Inbound in WhatsApp workflow');

// Update Node 04 jsCode to separate status receipts and handle customer handover cleanly
waParseInboundNode.parameters.jsCode = `
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

// Manual restart command
const hello = /^hello\\s+bot[!.\\s]*$/i.test(msgText);

// Restart if:
// 1. New customer
// 2. Previous session timed out
// 3. Customer ended previous chat
// 4. Customer sends "hello bot"

const shouldRestart =
  !s ||
  s.stage === 'timeout' ||
  s.stage === 'manual_closed' ||
  hello;

if (shouldRestart) {
  const lastBooking = s?.booking || null;
  const previousLeadKeys = s?.doneLeadKeys || {};

  s = {
    sessionId:
      's_' +
      now.toString(36) +
      '_' +
      Math.random().toString(36).slice(2, 8),

    stage: 'new',
    flow: '',
    lang: '',
    name: '',
    business: '',
    history: [],
    lastPayload: null,

    lastInboundAt: now,
    promptAt: now,
    nudged: false,
    human_requested: false,

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

// 1. Node "04_status - Is Status Receipt?" (IF Node)
const waStatusIfNode = {
  parameters: {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: '',
        typeValidation: 'strict',
        version: 2
      },
      conditions: [
        {
          id: generateNodeId(),
          leftValue: "={{ $json.action === 'status_receipt' }}",
          rightValue: true,
          operator: {
            type: 'boolean',
            operation: 'true',
            singleValue: true
          }
        }
      ],
      combinator: 'and'
    },
    options: {}
  },
  id: generateNodeId(),
  name: '04_status - Is Status Receipt?',
  type: 'n8n-nodes-base.if',
  typeVersion: 2.2,
  position: [336, 480]
};

// 2. Node "04_status_sync - Sync Status to Dashboard" (HTTP Request Node)
const waStatusSyncNode = {
  parameters: {
    method: 'POST',
    url: 'https://dashboard.thebusinesswork.com/api/n8n/webhook',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      event_type: 'whatsapp_status_update',
      external_message_id: $json.wamid,
      status: $json.status,
      recipient_id: $json.recipient_id,
      timestamp: $json.timestamp
    }) }}`,
    options: {
      timeout: 8000
    }
  },
  id: generateNodeId(),
  name: '04_status_sync - Sync Status to Dashboard',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [560, 384],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// 3. Node "04a - Log Inbound to Dashboard" (HTTP Request Node)
const waLogInboundNode = {
  parameters: {
    method: 'POST',
    url: 'https://dashboard.thebusinesswork.com/api/n8n/webhook',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      event_type: 'incoming_whatsapp_message',
      phone: $json.phone,
      external_message_id: $json.messageId,
      content: $json.body,
      message_type: $json.messageType || 'text',
      customer_name: $json.s?.name || '',
      timestamp: new Date().toISOString()
    }) }}`,
    options: {
      timeout: 8000
    }
  },
  id: generateNodeId(),
  name: '04a - Log Inbound to Dashboard',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [560, 480],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// 4. Node "04b - Check Takeover Mode" (HTTP Request Node)
const waCheckTakeoverNode = {
  parameters: {
    method: 'GET',
    url: '=https://dashboard.thebusinesswork.com/api/webhook/n8n/mode/{{ $json.phone }}',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    options: {
      timeout: 6000
    }
  },
  id: generateNodeId(),
  name: '04b - Check Takeover Mode',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [560, 608],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// 5. Node "04c - Evaluate Takeover State" (Code Node - Strict Fail-Closed + Handover Protection)
const waEvalTakeoverNode = {
  parameters: {
    jsCode: `
// 04c - Evaluate Takeover State (Strict Fail-Closed)
const res = $input.first()?.json || {};
const inbound = $('04 - Parse Inbound').first().json || {};
const mem = $getWorkflowStaticData('global');
mem.sessions ??= {};
const s = mem.sessions[inbound.phone] || inbound.s;

// 1. Strict Authorization Verification:
// Must be an explicitly successful response from dashboard with documented schema:
const hasValidSchema = res && typeof res === 'object' && res.success === true && res.data && typeof res.data === 'object';
const isExplicitlyAllowed = hasValidSchema &&
  res.data.can_respond === true &&
  res.data.manual_takeover !== true &&
  res.data.automation_paused !== true &&
  res.data.mode === 'ai';

// 2. Customer-Initiated Human Handover Check:
// If customer previously selected "Talk to Human", s.stage is 'human_wait'.
// Customer-requested handover MUST be respected and cannot be bypassed simply because dashboard takeover flag is OFF!
const isCustomerHandover = s && (s.stage === 'human_wait' || s.human_requested === true);

if (!isExplicitlyAllowed || isCustomerHandover) {
  if (s) {
    s.stage = 'human_wait';
    s.promptAt = 0; // Suppress inactivity nudges
    s.nudged = true;
    if (isCustomerHandover) {
      s.human_requested = true;
    }
  }
  // Fail-closed: Stop automatic conversational replies completely
  return [];
}

// 3. Automation Resumption:
// If automation was paused by dashboard takeover (not by customer) and is now released:
if (s && s.stage === 'human_wait' && !s.human_requested) {
  s.stage = 'menu';
  s.promptAt = Date.now();
  s.nudged = false;
}

return [{ json: inbound }];
`
  },
  id: generateNodeId(),
  name: '04c - Evaluate Takeover State',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [784, 608]
};

// 6. Node "26c - Send Confirmed by Meta?" (IF Node)
const waSendConfirmedIfNode = {
  parameters: {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: '',
        typeValidation: 'strict',
        version: 2
      },
      conditions: [
        {
          id: generateNodeId(),
          leftValue: "={{ $json.sendStatus === 'sent' }}",
          rightValue: true,
          operator: {
            type: 'boolean',
            operation: 'true',
            singleValue: true
          }
        }
      ],
      combinator: 'and'
    },
    options: {}
  },
  id: generateNodeId(),
  name: '26c - Send Confirmed by Meta?',
  type: 'n8n-nodes-base.if',
  typeVersion: 2.2,
  position: [5264, 448]
};

// 7. Node "26d - Log Outbound to Dashboard" (HTTP Request Node)
const waLogOutboundNode = {
  parameters: {
    method: 'POST',
    url: 'https://dashboard.thebusinesswork.com/api/n8n/webhook',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: $json.phone,
      external_message_id: $('26 - Send Customer WhatsApp').first().json.messages?.[0]?.id || $('26a - Queue Customer Reply').first().json.sendKey,
      content: $('26a - Queue Customer Reply').first().json.waPayload?.text?.body || $('26a - Queue Customer Reply').first().json.waPayload?.interactive?.body?.text || '[WhatsApp Reply]',
      sender_type: 'automation_ai',
      sender_name: 'TBW Assistant',
      timestamp: new Date().toISOString()
    }) }}`,
    options: {
      timeout: 8000
    }
  },
  id: generateNodeId(),
  name: '26d - Log Outbound to Dashboard',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [5488, 384],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// 8. Node "29b - Log Timer Outbound to Dashboard" (HTTP Request Node)
const waLogTimerNode = {
  parameters: {
    method: 'POST',
    url: 'https://dashboard.thebusinesswork.com/api/n8n/webhook',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: $('27 - Session Timer Due').first().json.phone,
      external_message_id: $json.messages?.[0]?.id || ('timer:' + Date.now()),
      content: $('27 - Session Timer Due').first().json.waPayload?.text?.body || '[Timer Notification]',
      sender_type: 'automation_ai',
      sender_name: 'TBW Assistant',
      timestamp: new Date().toISOString()
    }) }}`,
    options: {
      timeout: 8000
    }
  },
  id: generateNodeId(),
  name: '29b - Log Timer Outbound to Dashboard',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [896, 1216],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// 9. Node "32b - Log DNS Retry to Dashboard" (HTTP Request Node)
const waLogDnsRetryNode = {
  parameters: {
    method: 'POST',
    url: 'https://dashboard.thebusinesswork.com/api/n8n/webhook',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      event_type: 'outgoing_whatsapp_message',
      phone: $('30 - Pick Safe DNS Retry').first().json.phone,
      external_message_id: $('31 - Retry Customer WhatsApp DNS Only').first().json.messages?.[0]?.id || ('retry:' + Date.now()),
      content: $('30 - Pick Safe DNS Retry').first().json.waPayload?.text?.body || $('30 - Pick Safe DNS Retry').first().json.waPayload?.interactive?.body?.text || '[Retry Reply]',
      sender_type: 'automation_ai',
      sender_name: 'TBW Assistant',
      timestamp: new Date().toISOString()
    }) }}`,
    options: {
      timeout: 8000
    }
  },
  id: generateNodeId(),
  name: '32b - Log DNS Retry to Dashboard',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [896, 1408],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// Add all new nodes to workflow
waWorkflow.nodes.push(
  waStatusIfNode,
  waStatusSyncNode,
  waLogInboundNode,
  waCheckTakeoverNode,
  waEvalTakeoverNode,
  waSendConfirmedIfNode,
  waLogOutboundNode,
  waLogTimerNode,
  waLogDnsRetryNode
);

// Rewire Connections:
waWorkflow.connections['04 - Parse Inbound'] = {
  main: [
    [
      {
        node: '04_status - Is Status Receipt?',
        type: 'main',
        index: 0
      }
    ]
  ]
};

waWorkflow.connections['04_status - Is Status Receipt?'] = {
  main: [
    [
      {
        node: '04_status_sync - Sync Status to Dashboard',
        type: 'main',
        index: 0
      }
    ],
    [
      {
        node: '04a - Log Inbound to Dashboard',
        type: 'main',
        index: 0
      },
      {
        node: '04b - Check Takeover Mode',
        type: 'main',
        index: 0
      }
    ]
  ]
};

waWorkflow.connections['04b - Check Takeover Mode'] = {
  main: [
    [
      {
        node: '04c - Evaluate Takeover State',
        type: 'main',
        index: 0
      }
    ]
  ]
};

waWorkflow.connections['04c - Evaluate Takeover State'] = {
  main: [
    [
      {
        node: '05 - Translations',
        type: 'main',
        index: 0
      }
    ]
  ]
};

waWorkflow.connections['26b - Record Customer Send Result'] = {
  main: [
    [
      {
        node: '06 - Owner Alert Exists?',
        type: 'main',
        index: 0
      },
      {
        node: '26c - Send Confirmed by Meta?',
        type: 'main',
        index: 0
      }
    ]
  ]
};

waWorkflow.connections['26c - Send Confirmed by Meta?'] = {
  main: [
    [
      {
        node: '26d - Log Outbound to Dashboard',
        type: 'main',
        index: 0
      }
    ]
  ]
};

waWorkflow.connections['29 - Send One Timer Message'] = {
  main: [
    [
      {
        node: '29b - Log Timer Outbound to Dashboard',
        type: 'main',
        index: 0
      }
    ]
  ]
};

waWorkflow.connections['31 - Retry Customer WhatsApp DNS Only'] = {
  main: [
    [
      {
        node: '32 - Record DNS Retry Result',
        type: 'main',
        index: 0
      },
      {
        node: '32b - Log DNS Retry to Dashboard',
        type: 'main',
        index: 0
      }
    ]
  ]
};

const waDestPath = path.join(EXPORT_DIR, 'TBW_FRESH_v3.2_Dashboard_Integrated.json');
fs.writeFileSync(waDestPath, JSON.stringify(waWorkflow, null, 2), 'utf8');
console.log('Saved WhatsApp Workflow v3.2 to:', waDestPath, 'Total nodes:', waWorkflow.nodes.length);


// ============================================================================
// 2. INSTAGRAM WORKFLOW (TBW IG SIMPLE v3.2)
// ============================================================================
const igSourcePath = path.join(UPLOAD_DIR, 'media_1793125603793.json');
const igWorkflow = JSON.parse(fs.readFileSync(igSourcePath, 'utf8'));

// Protect live workflow ID: Assign a safe new unique ID
igWorkflow.id = '48e69b22-8321-4f34-b912-7dc28ba17ef2';
igWorkflow.name = 'TBW IG SIMPLE v3.2 - Dashboard Integrated (IMPORT INACTIVE)';
igWorkflow.active = false; // Strictly INACTIVE for safe import

// 1. Node "IG - Log Inbound DM to Dashboard" (HTTP Request Node)
const igLogInboundDmNode = {
  parameters: {
    method: 'POST',
    url: 'https://dashboard.thebusinesswork.com/api/n8n/webhook',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      event_type: 'incoming_instagram_message',
      sender_id: $json.ig_user_id,
      username: $json.username,
      content: $json.text || $json.quick_reply_payload || '[DM]',
      external_message_id: $json.event_id,
      timestamp: $json.timestamp
    }) }}`,
    options: {
      timeout: 8000
    }
  },
  id: generateNodeId(),
  name: 'IG - Log Inbound DM to Dashboard',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [2048, 1440],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// 2. Node "IG - Check Dashboard DM Takeover" (HTTP Request Node)
const igCheckDmTakeoverNode = {
  parameters: {
    method: 'POST',
    url: 'https://dashboard.thebusinesswork.com/api/instagram/dm-context',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      ig_user_id: $json.ig_user_id,
      username: $json.username,
      text: $json.text,
      event_id: $json.event_id
    }) }}`,
    options: {
      timeout: 8000
    }
  },
  id: generateNodeId(),
  name: 'IG - Check Dashboard DM Takeover',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [2048, 1632],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// 3. Node "IG - Evaluate DM Takeover" (Code Node - Strict Fail-Closed)
const igEvalDmTakeoverNode = {
  parameters: {
    jsCode: `
// IG - Evaluate DM Takeover (Strict Fail-Closed)
const dmContext = $input.first()?.json || {};
const incoming = $('IG - Deduplicate via Bridge').first().json || {};

// Strict Authorization: Must be explicitly approved by dashboard
const isDashboardAuthorized =
  dmContext &&
  typeof dmContext === 'object' &&
  dmContext.approved === true &&
  dmContext.reply_allowed === true &&
  dmContext.mode === 'ai' &&
  !dmContext.error;

// Bridge must also permit AI reply
const isBridgeAuthorized =
  incoming &&
  incoming.mode === 'ai' &&
  incoming.reply_allowed === true;

const isAllowed = isDashboardAuthorized && isBridgeAuthorized;

if (!isAllowed) {
  // Fail closed: Suppress automated bot reply completely
  return [{
    json: {
      ...incoming,
      mode: 'human',
      reply_allowed: false,
      takeover_active: true,
      reason: dmContext.error || (dmContext.mode === 'human' ? 'Human takeover active' : 'Automation not explicitly authorized')
    }
  }];
}

return [{
  json: {
    ...incoming,
    mode: 'ai',
    reply_allowed: true,
    whatsapp_url: dmContext.whatsapp_url || '',
    campaign: dmContext.campaign || null
  }
}];
`
  },
  id: generateNodeId(),
  name: 'IG - Evaluate DM Takeover',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [2272, 1632]
};

// 4. Node "IG - Log Outbound DM to Dashboard" (HTTP Request Node - Real Outgoing Text & CTA Metadata)
const igLogOutboundDmNode = {
  parameters: {
    method: 'POST',
    url: 'https://dashboard.thebusinesswork.com/api/n8n/webhook',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      event_type: 'log_ai_reply',
      sender_id: $json.ig_user_id,
      content: $('IG - DM Reply Logic').first().json.igPayload?.message?.text || $('IG - DM Reply Logic').first().json.igPayload?.message?.attachment?.payload?.text || '[Instagram Reply]',
      external_message_id: $json.provider_message_id,
      sender_type: 'automation_ai',
      sender_name: 'TBW Instagram Assistant',
      metadata: {
        has_whatsapp_cta: !!$('IG - DM Reply Logic').first().json.igPayload?.message?.attachment?.payload?.buttons,
        service: $json.service || null,
        category: $json.category || null,
        language: $json.language || null
      },
      timestamp: new Date().toISOString()
    }) }}`,
    options: {
      timeout: 8000
    }
  },
  id: generateNodeId(),
  name: 'IG - Log Outbound DM to Dashboard',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [3392, 1536],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// 5. Node "IG - Log Comment Reply to Dashboard" (HTTP Request Node)
const igLogCommentReplyNode = {
  parameters: {
    method: 'POST',
    url: 'https://dashboard.thebusinesswork.com/api/n8n/webhook',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      event_type: 'log_comment_reply',
      comment_id: $json.comment_id,
      media_id: $json.media_id,
      sender_id: $json.ig_user_id,
      username: $json.username,
      content: $('IG - Private Reply Payload').first().json.igPayload?.message?.text || 'Private reply',
      external_message_id: $json.provider_message_id || ('comment:' + $json.comment_id),
      rule_id: $json.rule_id,
      status: $json.accepted_by_provider ? 'success' : 'failed'
    }) }}`,
    options: {
      timeout: 8000
    }
  },
  id: generateNodeId(),
  name: 'IG - Log Comment Reply to Dashboard',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [3840, 2208],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// 6. Node "IG - Check Nudge Takeover" (HTTP Request Node - Prevent Nudges during Takeover)
const igCheckNudgeTakeoverNode = {
  parameters: {
    method: 'POST',
    url: 'https://dashboard.thebusinesswork.com/api/instagram/dm-context',
    authentication: 'genericCredentialType',
    genericAuthType: 'httpHeaderAuth',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'Content-Type',
          value: 'application/json'
        },
        {
          name: 'x-n8n-secret',
          value: '={{ $credentials.secret }}'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({
      ig_user_id: $json.ig_user_id,
      event_id: $json.source_event_id
    }) }}`,
    options: {
      timeout: 6000
    }
  },
  id: generateNodeId(),
  name: 'IG - Check Nudge Takeover',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [1488, 2400],
  credentials: {
    httpHeaderAuth: {
      id: 'xhQiNoV6sd96wDLZ',
      name: 'TBW Dashboard API Auth WhatsApp'
    }
  },
  continueOnFail: true
};

// 7. Node "IG - Nudge Allowed?" (IF Node)
const igNudgeAllowedIfNode = {
  parameters: {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: '',
        typeValidation: 'strict',
        version: 2
      },
      conditions: [
        {
          id: generateNodeId(),
          leftValue: "={{ $json.approved === true && $json.reply_allowed === true && $json.mode === 'ai' }}",
          rightValue: true,
          operator: {
            type: 'boolean',
            operation: 'true',
            singleValue: true
          }
        }
      ],
      combinator: 'and'
    },
    options: {}
  },
  id: generateNodeId(),
  name: 'IG - Nudge Allowed?',
  type: 'n8n-nodes-base.if',
  typeVersion: 2.2,
  position: [1712, 2400]
};

// Add new nodes to Instagram workflow
igWorkflow.nodes.push(
  igLogInboundDmNode,
  igCheckDmTakeoverNode,
  igEvalDmTakeoverNode,
  igLogOutboundDmNode,
  igLogCommentReplyNode,
  igCheckNudgeTakeoverNode,
  igNudgeAllowedIfNode
);

// Shift existing nodes positions to fit cleanly
const igCatalogNode = igWorkflow.nodes.find(n => n.name === 'IG - Language + Service Catalog');
if (igCatalogNode) igCatalogNode.position = [2496, 1632];

const igDmReplyNode = igWorkflow.nodes.find(n => n.name === 'IG - DM Reply Logic');
if (igDmReplyNode) igDmReplyNode.position = [2720, 1632];

const igReplyPreparedNode = igWorkflow.nodes.find(n => n.name === 'IG - Reply Prepared?');
if (igReplyPreparedNode) igReplyPreparedNode.position = [2944, 1632];

const igSendDmNode = igWorkflow.nodes.find(n => n.name === 'IG - Send DM');
if (igSendDmNode) igSendDmNode.position = [3168, 1632];

const igDmSendResultNode = igWorkflow.nodes.find(n => n.name === 'IG - DM Send Result');
if (igDmSendResultNode) igDmSendResultNode.position = [3392, 1632];

const igBotReplyAllowedNode = igWorkflow.nodes.find(n => n.name === 'IG - Bot Reply Allowed?');
if (igBotReplyAllowedNode) igBotReplyAllowedNode.position = [2272, 1728];

const igSendNudgeNode = igWorkflow.nodes.find(n => n.name === 'IG - Send One Nudge');
if (igSendNudgeNode) igSendNudgeNode.position = [1936, 2400];

const igNudgeResultNode = igWorkflow.nodes.find(n => n.name === 'IG - Nudge Send Result');
if (igNudgeResultNode) igNudgeResultNode.position = [2160, 2400];

const igLogNudgeBridgeNode = igWorkflow.nodes.find(n => n.name === 'IG - Log Nudge to Bridge');
if (igLogNudgeBridgeNode) igLogNudgeBridgeNode.position = [2384, 2400];

// Rewire Connections:
igWorkflow.connections['IG - DM or Comment?'] = {
  main: [
    [
      {
        node: 'IG - Log Inbound DM to Dashboard',
        type: 'main',
        index: 0
      },
      {
        node: 'IG - Check Dashboard DM Takeover',
        type: 'main',
        index: 0
      }
    ],
    [
      {
        node: 'IG - Test Reel Rule (OFF by default)',
        type: 'main',
        index: 0
      }
    ]
  ]
};

igWorkflow.connections['IG - Check Dashboard DM Takeover'] = {
  main: [
    [
      {
        node: 'IG - Evaluate DM Takeover',
        type: 'main',
        index: 0
      }
    ]
  ]
};

igWorkflow.connections['IG - Evaluate DM Takeover'] = {
  main: [
    [
      {
        node: 'IG - Bot Reply Allowed?',
        type: 'main',
        index: 0
      }
    ]
  ]
};

const existingDmResultConnections = igWorkflow.connections['IG - DM Send Result']?.main?.[0] || [];
igWorkflow.connections['IG - DM Send Result'] = {
  main: [
    [
      ...existingDmResultConnections,
      {
        node: 'IG - Log Outbound DM to Dashboard',
        type: 'main',
        index: 0
      }
    ]
  ]
};

const existingCommentResultConnections = igWorkflow.connections['IG - Comment Send Result']?.main?.[0] || [];
igWorkflow.connections['IG - Comment Send Result'] = {
  main: [
    [
      ...existingCommentResultConnections,
      {
        node: 'IG - Log Comment Reply to Dashboard',
        type: 'main',
        index: 0
      }
    ]
  ]
};

// Rewire Timer Action -> Check Nudge Takeover -> Nudge Allowed? -> Send One Nudge
igWorkflow.connections['IG - Timer Action'] = {
  main: [
    [
      {
        node: 'IG - Check Nudge Takeover',
        type: 'main',
        index: 0
      }
    ]
  ]
};

igWorkflow.connections['IG - Check Nudge Takeover'] = {
  main: [
    [
      {
        node: 'IG - Nudge Allowed?',
        type: 'main',
        index: 0
      }
    ]
  ]
};

igWorkflow.connections['IG - Nudge Allowed?'] = {
  main: [
    [
      {
        node: 'IG - Send One Nudge',
        type: 'main',
        index: 0
      }
    ]
  ]
};

const igDestPath = path.join(EXPORT_DIR, 'TBW_IG_SIMPLE_v3.2_Dashboard_Integrated.json');
fs.writeFileSync(igDestPath, JSON.stringify(igWorkflow, null, 2), 'utf8');
console.log('Saved Instagram Workflow v3.2 to:', igDestPath, 'Total nodes:', igWorkflow.nodes.length);

// Validation
function validateWorkflow(wf, name) {
  const nodeNames = new Set(wf.nodes.map(n => n.name));
  const nodeIds = new Set(wf.nodes.map(n => n.id));
  if (nodeNames.size !== wf.nodes.length) throw new Error(`${name} has duplicate node names!`);
  if (nodeIds.size !== wf.nodes.length) throw new Error(`${name} has duplicate node IDs!`);

  for (const [sourceName, connGroup] of Object.entries(wf.connections)) {
    if (!nodeNames.has(sourceName)) {
      throw new Error(`${name} connection source "${sourceName}" does not exist in nodes!`);
    }
    for (const outputList of connGroup.main || []) {
      for (const target of outputList) {
        if (!nodeNames.has(target.node)) {
          throw new Error(`${name} connection target "${target.node}" (from "${sourceName}") does not exist in nodes!`);
        }
      }
    }
  }
  console.log(`[VALIDATED] ${name}: All ${wf.nodes.length} nodes and connection edges are valid.`);
}

validateWorkflow(waWorkflow, 'WhatsApp v3.2');
validateWorkflow(igWorkflow, 'Instagram v3.2');
