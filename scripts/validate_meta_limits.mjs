export const CATEGORIES = {
  tbw_cat_ai: {
    id: 'tbw_cat_ai',
    title: 'AI Agents & Chatbots',
    desc: 'Sales, support, voice & booking agents',
    services: [
      { id: 'tbw_svc_ai_sales', title: 'AI Sales Agents', desc: 'Qualify leads & book sales calls 24/7' },
      { id: 'tbw_svc_ai_support', title: 'AI Support Agents', desc: 'Instant multilingual customer support' },
      { id: 'tbw_svc_ai_web', title: 'Website AI Chatbots', desc: 'Convert website visitors into clients' },
      { id: 'tbw_svc_ai_qual', title: 'AI Lead Qualification', desc: 'Score & filter prospective customers' },
      { id: 'tbw_svc_ai_voice', title: 'AI Voice Agents', desc: 'Human-like voice calling & inquiries' },
      { id: 'tbw_svc_ai_book', title: 'AI Booking Agents', desc: 'Automated calendar scheduling on chat' },
    ],
  },
  tbw_cat_crm: {
    id: 'tbw_cat_crm',
    title: 'CRM & Sales Automation',
    desc: 'Pipelines, follow-ups & lead management',
    services: [
      { id: 'tbw_svc_crm_setup', title: 'CRM Setup & Custom', desc: 'Tailored HubSpot, Zoho or custom CRM' },
      { id: 'tbw_svc_crm_lead', title: 'Lead Management', desc: 'Centralized lead capture across all channels' },
      { id: 'tbw_svc_crm_followup', title: 'Automated Follow-ups', desc: 'Timed WhatsApp, email & SMS touches' },
      { id: 'tbw_svc_crm_pipeline', title: 'Sales Pipeline Auto', desc: 'Auto-stage transitions & deal alerts' },
      { id: 'tbw_svc_crm_assign', title: 'Lead Assignment Alerts', desc: 'Instant round-robin rep distribution' },
      { id: 'tbw_svc_crm_report', title: 'Sales Reporting', desc: 'Real-time conversion & deal dashboards' },
    ],
  },
  tbw_cat_workflow: {
    id: 'tbw_cat_workflow',
    title: 'Workflow Automation',
    desc: 'Forms, Sheets, invoicing & app sync',
    services: [
      { id: 'tbw_svc_wf_form', title: 'Form-to-CRM Auto', desc: 'Instant sync from website/Typeform' },
      { id: 'tbw_svc_wf_email', title: 'Email Automation', desc: 'Smart auto-responders & drip campaigns' },
      { id: 'tbw_svc_wf_sheets', title: 'Google Sheets Auto', desc: 'Auto-sync databases & 2-way formulas' },
      { id: 'tbw_svc_wf_calendar', title: 'Calendar Automation', desc: 'No-show reminders & Google Calendar sync' },
      { id: 'tbw_svc_wf_invoice', title: 'Invoices & Documents', desc: 'Auto-generate PDF quotes & invoices' },
      { id: 'tbw_svc_wf_apps', title: 'Business App Sync', desc: 'Custom n8n workflows connecting your apps' },
    ],
  },
  tbw_cat_whatsapp: {
    id: 'tbw_cat_whatsapp',
    title: 'WhatsApp & Social Auto',
    desc: 'WhatsApp bots, Instagram DMs & alerts',
    services: [
      { id: 'tbw_svc_wa_business', title: 'WhatsApp Automation', desc: 'Verified API, broadcast & catalog flows' },
      { id: 'tbw_svc_wa_aichat', title: 'WhatsApp AI Chat', desc: 'Smart conversational assistants on WhatsApp' },
      { id: 'tbw_svc_wa_reminders', title: 'Alerts & Reminders', desc: 'Automated payment & meeting alerts' },
      { id: 'tbw_svc_wa_ig', title: 'Instagram Automation', desc: 'Instant story/reel keyword auto-replies' },
      { id: 'tbw_svc_wa_social', title: 'Social Lead Capture', desc: 'Direct lead flow from ads into WhatsApp' },
      { id: 'tbw_svc_wa_followup', title: 'Customer Follow-ups', desc: 'Re-engage inactive leads automatically' },
    ],
  },
};

export function validateMetaLimits(categories) {
  let errors = [];
  for (const [catId, cat] of Object.entries(categories)) {
    if (cat.title.length > 24) errors.push(`Category title '${cat.title}' is ${cat.title.length} chars (max 24)`);
    if (cat.desc.length > 72) errors.push(`Category desc '${cat.desc}' is ${cat.desc.length} chars (max 72)`);
    
    for (const s of cat.services) {
      if (s.title.length > 24) errors.push(`Service title '${s.title}' is ${s.title.length} chars (max 24)`);
      if (s.desc.length > 72) errors.push(`Service desc '${s.desc}' is ${s.desc.length} chars (max 72)`);
    }
  }
  return errors;
}

const errs = validateMetaLimits(CATEGORIES);
if (errs.length) {
  console.log('❌ VALIDATION FAILED:');
  errs.forEach(e => console.log('  -', e));
  process.exit(1);
} else {
  console.log('✅ ALL CATEGORIES AND 24 SERVICES STRICTLY COMPLY WITH META 24-CHAR / 72-CHAR LIMITS!');
}
