// TBW WhatsApp Complete Automation Logic & Verification Suite
import fs from 'fs';
import path from 'path';

/**
 * Encapsulated implementation of the new "Language + Name + Business + Purpose" logic.
 * Can be run in pure Node.js as well as inside n8n Code node.
 */
export function executeWhatsAppRouter(inputJson, mockGlobalMemory = {}, simulatedNow = Date.now()) {
  const raw = inputJson;

  // 1. Meta delivery/read status callbacks: ignore immediately
  if (Array.isArray(raw.statuses) && raw.statuses.length) return [];
  if (raw.entry?.[0]?.changes?.[0]?.value?.statuses?.length) return [];

  const changeVal = raw.entry?.[0]?.changes?.[0]?.value;
  const msg = raw.messages?.[0] ?? changeVal?.messages?.[0];
  if (!msg?.from || !['text','interactive','button','image','audio','video','document','location','contacts','sticker'].includes(msg.type)) {
    return [];
  }

  // Extract contact & profile name
  const contact = raw.contacts?.[0] ?? changeVal?.contacts?.[0];
  const profileName = (contact?.profile?.name ?? '').trim();

  let body = '';
  let choiceId = '';
  if (msg.type === 'text') {
    body = String(msg.text?.body ?? '').trim();
  } else if (msg.type === 'interactive') {
    const chosen = msg.interactive?.list_reply ?? msg.interactive?.button_reply;
    choiceId = String(chosen?.id ?? '');
    body = String(chosen?.title ?? '').trim();
  } else if (msg.type === 'button') {
    choiceId = String(msg.button?.payload ?? '');
    body = String(msg.button?.text ?? '').trim();
  } else {
    body = `(customer sent a ${String(msg.type || 'message')})`;
  }

  const phone = String(msg.from).replace(/\D/g, '');
  body = body.slice(0, 1500);
  if (!phone || (!body && !choiceId)) return [];

  // Memory references (in n8n, this is $getWorkflowStaticData('global'))
  const mem = mockGlobalMemory;
  mem.customers ??= {};
  mem.processedMsgIds ??= [];
  mem.recentMsgTimestamps ??= {};
  mem.confirmedBookingKeys ??= {};

  // Idempotency: skip duplicate WhatsApp webhook deliveries
  if (msg.id && mem.processedMsgIds.includes(msg.id)) {
    return [];
  }
  if (msg.id) {
    mem.processedMsgIds.push(msg.id);
    if (mem.processedMsgIds.length > 1000) mem.processedMsgIds.shift();
  }

  // Rapid-fire suppression (duplicate identical text within 2 seconds)
  const now = simulatedNow;
  const lastTime = mem.recentMsgTimestamps[phone] || 0;
  mem.recentMsgTimestamps[phone] = now;
  if (now - lastTime < 1500 && msg.type === 'text' && mem.lastBody?.[phone] === body) {
    return [];
  }
  mem.lastBody ??= {};
  mem.lastBody[phone] = body;

  // Retrieve persistent customer profile
  mem.customers[phone] ??= {
    phone,
    name: '',
    profileName: profileName || '',
    business: '',
    serviceCategory: '',
    serviceDetail: '',
    purpose: '',
    stage: 'idle',
    language: 'english',
    activeBooking: null,
    created: now,
    updated: now,
  };

  const customer = mem.customers[phone];
  customer.updated = now;
  if (profileName && !customer.profileName) {
    customer.profileName = profileName;
  }

  // Service Catalog (4 Core Categories & 24 Specific Services - Meta 24-char & 72-char Compliant)
  const CATEGORIES = {
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

  // Detailed Explanations, Examples & Single Questions for Sub-services
  const SERVICE_DETAILS = {
    tbw_svc_ai_sales: {
      title: 'AI Sales Agents',
      what: 'AI Sales Agents converse with leads 24/7 on WhatsApp and website, answer product queries, and book qualified meetings for your sales team.',
      example: 'When an inquiry arrives at 11 PM, the agent answers pricing questions and books a consultation right away.',
      question: 'Where do you currently get the majority of your incoming sales leads?',
    },
    tbw_svc_ai_support: {
      title: 'AI Customer Support Agents',
      what: 'AI Support Agents resolve common customer queries, look up order statuses, and route complex questions to human agents.',
      example: 'Instantly answers FAQs about your services, hours, or policies without human delay.',
      question: 'What are the top 2-3 questions your customers ask most often?',
    },
    tbw_svc_ai_web: {
      title: 'Website AI Chatbots',
      what: 'Smart chatbots embedded on your website that interact with visitors in natural language and capture contact information.',
      example: 'Greets site visitors, recommends the right service, and collects their phone number for follow-up.',
      question: 'What is your website address or current monthly visitor traffic?',
    },
    tbw_svc_ai_qual: {
      title: 'AI Lead Qualification',
      what: 'Automatically screens leads based on budget, timeline, and requirements before sending them to your sales team.',
      example: 'Filters out casual inquiries so your team only spends time on high-intent clients.',
      question: 'What criteria determines whether a prospective lead is a good fit for you?',
    },
    tbw_svc_ai_voice: {
      title: 'AI Voice Agents',
      what: 'Realistic AI voice assistants that conduct inbound and outbound phone calls for appointments and confirmations.',
      example: 'Calls customers to confirm attendance 2 hours before their scheduled appointment.',
      question: 'Do you currently make phone calls to confirm bookings or qualify leads?',
    },
    tbw_svc_ai_book: {
      title: 'AI Appointment Booking Agents',
      what: 'Chat-based booking assistants that check real-time Google Calendar availability and book slots directly inside WhatsApp.',
      example: 'Lets clients pick an open time slot and sends instant calendar invites with reminders.',
      question: 'How do customers currently book consultations or appointments with you?',
    },
    tbw_svc_crm_setup: {
      title: 'CRM Setup & Customization',
      what: 'Custom setup and workflow design for HubSpot, Zoho, or proprietary CRMs tailored to your sales process.',
      example: 'Organizes client data, custom deal stages, and automated email sequences from day one.',
      question: 'Which CRM or tool are you currently using to track your leads?',
    },
    tbw_svc_crm_lead: {
      title: 'Lead Management',
      what: 'Captures and deduplicates incoming leads from website, ads, WhatsApp, and social media into a single central dashboard.',
      example: 'Every lead from Facebook ads, Google forms, and WhatsApp is saved in one clean list automatically.',
      question: 'How many different places do your inquiries come from today?',
    },
    tbw_svc_crm_followup: {
      title: 'Automated Follow-ups',
      what: 'Multi-touch WhatsApp and email follow-up sequences that trigger automatically when a prospect goes quiet.',
      example: 'Sends a polite check-in 24 hours after a quote is sent, increasing closing rates by up to 30%.',
      question: 'How often does your team currently follow up with quotes or proposals?',
    },
    tbw_svc_crm_pipeline: {
      title: 'Sales Pipeline Automation',
      what: 'Moves deals across pipeline stages automatically as actions happen, alerting your team when deals stall.',
      example: 'When a customer signs an agreement, the deal stage automatically shifts to "Won" and notifies accounting.',
      question: 'What are the main stages in your sales process?',
    },
    tbw_svc_crm_assign: {
      title: 'Lead Assignment & Notifications',
      what: 'Distributes leads round-robin to your sales reps and alerts them instantly on WhatsApp or Slack.',
      example: 'A high-value lead arrives; the assigned rep gets an immediate WhatsApp ping with lead details.',
      question: 'How many people on your team handle sales inquiries?',
    },
    tbw_svc_crm_report: {
      title: 'Sales Reporting',
      what: 'Automated daily/weekly reporting that shows deal conversion rates, team activity, and pipeline value.',
      example: 'Delivers a summary of new leads, calls booked, and revenue directly to your phone every evening.',
      question: 'What metrics are most important for you to track regularly?',
    },
    tbw_svc_wf_form: {
      title: 'Form-to-CRM Automation',
      what: 'Instant data transfer from website forms, Typeforms, or Google Forms straight into your CRM or Sheets.',
      example: 'A prospect submits a quote request; their profile is created in your CRM within 2 seconds.',
      question: 'Which forms or landing page tools do you use on your website?',
    },
    tbw_svc_wf_email: {
      title: 'Email Automation',
      what: 'Smart email workflows that send welcome emails, follow-ups, and notifications based on client actions.',
      example: 'Automatically emails a brochure and pricing sheet as soon as a customer requests information.',
      question: 'What email platform or service do you use for your business?',
    },
    tbw_svc_wf_sheets: {
      title: 'Google Sheets Automation',
      what: 'Connects your Google Sheets to your CRM, WhatsApp, and forms with 2-way syncing and automated calculations.',
      example: 'New client details automatically format, validate, and append to your master spreadsheet.',
      question: 'What business data do you currently manage in Google Sheets or Excel?',
    },
    tbw_svc_wf_calendar: {
      title: 'Appointment & Calendar Automation',
      what: 'Automates Google Calendar scheduling, sends WhatsApp meeting links, and dispatches automated reminder alerts.',
      example: 'Reduces no-shows by automatically texting a 30-minute reminder with the meeting link.',
      question: 'Do you experience no-shows or missed appointments with clients?',
    },
    tbw_svc_wf_invoice: {
      title: 'Invoice & Document Workflows',
      what: 'Generates professional PDF invoices and agreements automatically when a sale is confirmed.',
      example: 'Populates customer data into an invoice template and sends the PDF directly on WhatsApp.',
      question: 'How do you currently generate and send invoices to clients?',
    },
    tbw_svc_wf_apps: {
      title: 'Business App Integrations',
      what: 'Custom n8n and API automations connecting whatever software, databases, or ERPs your business runs on.',
      example: 'Connects your billing software, WhatsApp, and CRM so they share data seamlessly.',
      question: 'Which software tools would you like to see working together smoothly?',
    },
    tbw_svc_wa_business: {
      title: 'WhatsApp Business Automation',
      what: 'Official WhatsApp Cloud API setup, interactive menus, automated catalogs, and broadcast campaigns.',
      example: 'Allows customers to browse services with quick-reply buttons and request a quote instantly.',
      question: 'Are you currently using WhatsApp Business app or the official Cloud API?',
    },
    tbw_svc_wa_aichat: {
      title: 'WhatsApp AI Chat',
      what: 'Human-like conversational AI that talks with your clients directly on WhatsApp in natural English or Hindi.',
      example: 'Understands informal messages, answers queries politely, and captures requirements automatically.',
      question: 'What kind of conversations do you want your WhatsApp AI to handle?',
    },
    tbw_svc_wa_reminders: {
      title: 'Notifications & Reminders',
      what: 'Automated WhatsApp alerts for appointment reminders, order updates, invoices, and service renewals.',
      example: 'Clients receive a reminder 2 hours before their consultation with a 1-tap confirmation button.',
      question: 'What alerts or reminders would save your team the most time?',
    },
    tbw_svc_wa_ig: {
      title: 'Instagram DM Automation',
      what: 'Auto-responds to Instagram comments, reel keywords, and DMs instantly with links or consultation offers.',
      example: 'When someone comments "WORKFLOW" on your reel, an automated DM sends the resource link in seconds.',
      question: 'Are you actively posting reels or stories on Instagram?',
    },
    tbw_svc_wa_social: {
      title: 'Social Media Lead Capture',
      what: 'Drives traffic from Meta & Google ads directly into interactive WhatsApp lead capture conversations.',
      example: 'Click-to-WhatsApp ads immediately greet the user and qualify them before assigning to a rep.',
      question: 'Do you currently run paid ads on Facebook or Instagram?',
    },
    tbw_svc_wa_followup: {
      title: 'Customer Follow-up Messages',
      what: 'Re-engages past clients and stalled leads on WhatsApp with personalized check-ins and offers.',
      example: 'Sends a gentle check-in to leads who inquired last week but have not booked yet.',
      question: 'How many past leads or inquiries do you have that haven\'t converted yet?',
    },
  };

  const normal = body.toLowerCase();

  // Helper: Asia/Kolkata date generator
  function istDate(offsetDays = 0) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(now + offsetDays * 86400000));
    const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }

  // Business hours in Asia/Kolkata: 10:00 AM to 10:00 PM (last 30-min slot is 21:30 - 22:00 IST)
  const todayIST = istDate(0);
  const todayLastSlotStartMs = Date.parse(`${todayIST}T21:30:00+05:30`);
  const hasTodaySlots = now < todayLastSlotStartMs;
  const startOffset = hasTodaySlots ? 0 : 1;
  const validDates = Array.from({ length: 6 }, (_, i) => istDate(startOffset + i));

  function toISO(date, h, min) {
    return new Date(`${date}T${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:00+05:30`).toISOString();
  }
  function pretty(iso) {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  }

  let reply = '';
  let menu = 'text'; // 'intent', 'cat_list', 'subservice_list', 'service_detail', 'date', 'confirm', 'name_confirm', 'text'
  let action = 'normal'; // 'normal', 'check_day', 'book'
  let useAI = false;
  let saveLead = false;

  // Global Intent Recognizers
  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|namaste|kem cho|hola)\b/i.test(normal) && normal.length < 30;
  const isEnd = choiceId === 'tbw_end_chat' || ['close','end chat','end','stop','bye','exit','band','अलविदा','चॅट बंद करा','चैट बंद करें'].includes(normal);
  const isHuman = /\b(human|agent|person|team|speak to human|talk to human|speak to a human|talk to a human|representative|support team|customer care)\b/i.test(normal);
  const isThanks = /^(thanks|thank you|ok|okay|sure|great|noted|dhanyawad|shukriya|theek hai|cool|perfect)\b/i.test(normal) && normal.length < 25;
  const isMenu = choiceId === 'tbw_restart' || ['menu','main menu','start over','home'].includes(normal);

  // ====================================================================
  // 1. DETERMINISTIC BUTTON & ACTION-FIRST ROUTING
  // ====================================================================

  // A. Slot Selected: tbw_slot_YYYYMMDD_HHMM
  if (/^tbw_slot_\d{8}_\d{4}$/.test(choiceId)) {
    const parts = choiceId.match(/^tbw_slot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
    const slotDate = `${parts[1]}-${parts[2]}-${parts[3]}`;
    const h = Number(parts[4]);
    const m = Number(parts[5]);
    const starts = toISO(slotDate, h, m);
    const startMs = Date.parse(starts);

    if (!validDates.includes(slotDate) || h < 10 || h > 21 || ![0, 30].includes(m) || startMs <= now || mem.confirmedBookingKeys[`${phone}|${starts}`]) {
      customer.stage = 'appt_date';
      menu = 'date';
      reply = 'That time slot has passed or is unavailable. Please select another date:';
    } else {
      customer.apptDate = slotDate;
      customer.apptStart = starts;
      customer.apptEnd = new Date(startMs + 30 * 60000).toISOString();
      customer.stage = 'appt_confirm';
      menu = 'confirm';
      const svcName = customer.serviceDetail || customer.serviceCategory || 'Business Automation';
      const cName = customer.name || (customer.profileName ? customer.profileName.split(' ')[0] : 'there');
      const bName = customer.business ? ` (${customer.business})` : '';
      reply = `Please confirm your 30-minute consultation:\n\n📅 Date: ${pretty(starts)} (IST)\n👤 Name: ${cName}${bName}\n🛠️ Service: ${svcName}\n\nWould you like to confirm this booking?`;
    }
  }

  // B. Date Selected: tbw_date_YYYY-MM-DD
  else if (choiceId.startsWith('tbw_date_')) {
    const chosenDate = choiceId.slice(9);
    if (validDates.includes(chosenDate)) {
      customer.apptDate = chosenDate;
      customer.apptPage = 0;
      customer.stage = 'appt_time';
      action = 'check_day';
      reply = `Checking real-time calendar availability for ${chosenDate}...`;
    } else {
      customer.stage = 'appt_date';
      menu = 'date';
      reply = `Date ${chosenDate} has passed or is full. Please choose an upcoming date:`;
    }
  }

  // C. Confirm Booking Clicked
  else if (choiceId === 'tbw_appt_confirm') {
    if (!customer.apptStart || !validDates.includes(customer.apptDate) || Date.parse(customer.apptStart) <= now) {
      customer.stage = 'appt_date';
      menu = 'date';
      reply = 'Your selected time slot has expired. Please pick a new date:';
    } else if (mem.confirmedBookingKeys[`${phone}|${customer.apptStart}`]) {
      customer.stage = 'appt_date';
      menu = 'date';
      reply = 'You have already booked this appointment time. Please pick another date:';
    } else {
      customer.stage = 'appt_processing';
      action = 'book';
      reply = 'Confirming your appointment in Google Calendar...';
    }
  }

  // D. Change Date Clicked / Reschedule
  else if (choiceId === 'tbw_appt_change_date' || choiceId === 'tbw_appt_reschedule') {
    customer.stage = 'appt_date';
    menu = 'date';
    reply = 'Please select a date for your 30-minute consultation (IST):';
  }

  // E. Pagination for Time Slots
  else if (/^tbw_page_\d+$/.test(choiceId)) {
    customer.apptPage = Math.min(10, Math.max(0, Number(choiceId.split('_').at(-1))));
    customer.stage = 'appt_time';
    action = 'check_day';
    reply = 'Loading more available times...';
  }

  // F. Profile Name Confirmation Buttons
  else if (choiceId === 'tbw_name_accept') {
    customer.name = customer.profileName;
    if (!customer.business) {
      customer.stage = 'appt_business';
      reply = `Nice to meet you, ${customer.name}! What is your business or company name?`;
    } else {
      customer.stage = 'appt_date';
      menu = 'date';
      reply = `Great, ${customer.name}! Please select an appointment date (IST):`;
    }
  }
  else if (choiceId === 'tbw_name_custom') {
    customer.stage = 'appt_name';
    reply = 'No problem! What is your preferred name?';
  }

  // G. Keep Existing Appointment
  else if (choiceId === 'tbw_appt_keep') {
    customer.stage = 'idle';
    reply = 'Sounds great! Your appointment remains confirmed. Let us know if you need anything else! 😊';
  }

  // H. Category Selected from Explore Services
  else if (CATEGORIES[choiceId]) {
    const cat = CATEGORIES[choiceId];
    customer.serviceCategory = cat.title;
    customer.stage = 'explore_subservices';
    menu = 'subservice_list';
    reply = `Explore ${cat.title}:\n\nSelect a service below to see how it works:`;
  }

  // I. Sub-service Selected from Category
  else if (SERVICE_DETAILS[choiceId]) {
    const svc = SERVICE_DETAILS[choiceId];
    customer.serviceDetail = svc.title;
    customer.stage = 'service_detail';
    menu = 'service_detail';
    reply = `*${svc.title}*\n\n${svc.what}\n\n💡 *Example:* ${svc.example}\n\n${svc.question}`;
  }

  // J. Book Consultation from Service Detail
  else if (choiceId === 'tbw_book_for_service') {
    // Proceed directly to booking with service already selected!
    if (!customer.name) {
      if (customer.profileName && !/^\+?\d+$/.test(customer.profileName)) {
        customer.stage = 'name_confirm';
        menu = 'name_confirm';
        reply = `Should I address you as *${customer.profileName}*, or would you prefer a different name?`;
      } else {
        customer.stage = 'appt_name';
        reply = 'Perfect! What is your name?';
      }
    } else if (!customer.business) {
      customer.stage = 'appt_business';
      reply = `Great, ${customer.name}! What is your business or company name?`;
    } else {
      customer.stage = 'appt_date';
      menu = 'date';
      reply = `Select a date for your ${customer.serviceDetail || 'consultation'} call (IST):`;
    }
  }

  // ====================================================================
  // 2. CONVERSATIONAL INTENTS & GENERAL MESSAGES
  // ====================================================================

  // End Chat
  else if (isEnd) {
    customer.stage = 'idle';
    reply = 'Thank you for connecting with The Business Work! If you need anything else, feel free to message us anytime. Have a wonderful day! 👋';
  }

  // Human Handoff Request
  else if (isHuman) {
    customer.stage = 'human_requested';
    reply = 'I have notified our team. A representative from The Business Work will connect with you here shortly! 😊';
  }

  // Polite acknowledgments when in idle or booked state (Prevent welcome message loop!)
  else if (isThanks && (customer.stage === 'idle' || customer.stage === 'booked' || !customer.stage)) {
    reply = "You're very welcome! 😊 Let us know if you need anything else.";
  }

  // Main Menu / Restart Explicit Request
  else if (isMenu) {
    customer.stage = 'intent';
    menu = 'intent';
    const greet = customer.name ? `Hey ${customer.name}! ` : 'Hey! 👋 ';
    reply = `${greet}Welcome to The Business Work.\n\nI'm here to help you with appointments and business automation.\n\nWhat would you like to do?`;
  }

  // Greeting Handler (Friendly, Personalized, Non-Repetitive)
  else if (isGreeting) {
    // If customer already has an active booking, acknowledge it!
    if (customer.activeBooking && new Date(customer.activeBooking.apptStart) > new Date()) {
      reply = `Hey ${customer.name || 'there'}! 👋 Welcome back.\n\nYou have an upcoming appointment scheduled for ${pretty(customer.activeBooking.apptStart)} (IST).\n\nHow can we help you today?`;
      menu = 'intent';
    } else if (customer.name) {
      reply = `Hey ${customer.name}! 👋 Great to see you again.\n\nHow can we help you today?`;
      menu = 'intent';
    } else {
      reply = "Hey! 👋 Welcome to The Business Work.\n\nI'm here to help you with appointments and business automation.\n\nWhat would you like to do?";
      menu = 'intent';
    }
    customer.stage = 'intent';
  }

  // Intent Menu: Book Appointment Clicked or Typed
  else if (choiceId === 'tbw_intent_appointment' || /^(book appointment|appointment|book a call|consultation|schedule)\b/i.test(normal)) {
    // Check if already booked
    if (customer.activeBooking && new Date(customer.activeBooking.apptStart) > new Date()) {
      menu = 'confirm';
      customer.stage = 'appt_active_check';
      reply = `You already have an appointment scheduled:\n\n📅 ${pretty(customer.activeBooking.apptStart)} (IST)\n🛠️ ${customer.activeBooking.service || 'Business Automation'}\n\nWould you like to reschedule or keep this appointment?`;
    } else if (!customer.name) {
      if (customer.profileName && !/^\+?\d+$/.test(customer.profileName)) {
        customer.stage = 'name_confirm';
        menu = 'name_confirm';
        reply = `Should I address you as *${customer.profileName}*, or would you prefer a different name?`;
      } else {
        customer.stage = 'appt_name';
        reply = 'Perfect! 😊 What is your name?';
      }
    } else if (!customer.business) {
      customer.stage = 'appt_business';
      reply = `Nice to meet you, ${customer.name}! What is your business or company name?`;
    } else {
      customer.stage = 'appt_date';
      menu = 'date';
      reply = `Sure ${customer.name}! Please select an appointment date (IST):`;
    }
  }

  // Intent Menu: Explore Services Clicked or Typed (ZERO FRICTION: Immediate 4 categories!)
  else if (choiceId === 'tbw_intent_service' || /^(explore services|services|what do you do|service)\b/i.test(normal)) {
    customer.stage = 'explore_services';
    menu = 'cat_list';
    reply = "Here are our core business automation services at The Business Work. 🚀\n\nWhich category would you like to explore?";
  }

  // ====================================================================
  // 3. SEQUENTIAL INPUT HANDLERS (NAME, BUSINESS, SERVICE REQUIREMENT)
  // ====================================================================

  // A. Handling Name Input
  else if (customer.stage === 'appt_name') {
    if (body.length < 2 || body.startsWith('(customer sent')) {
      reply = 'Please type your preferred name:';
    } else {
      customer.name = body.slice(0, 80).trim();
      if (!customer.business) {
        customer.stage = 'appt_business';
        reply = `Nice to meet you, ${customer.name}! What is your business or company name?`;
      } else {
        customer.stage = 'appt_date';
        menu = 'date';
        reply = `Great ${customer.name}! Please select an appointment date (IST):`;
      }
    }
  }

  // B. Handling Business Name Input
  else if (customer.stage === 'appt_business') {
    customer.business = body.slice(0, 120).trim();
    if (!customer.serviceCategory && !customer.serviceDetail) {
      customer.stage = 'appt_service_choice';
      menu = 'cat_list';
      reply = `Thanks ${customer.name}! What would you like help with? Please choose a category:`;
    } else {
      customer.stage = 'appt_date';
      menu = 'date';
      reply = `Thank you! Please select your preferred appointment date (IST):`;
    }
  }

  // C. Handling Service Requirement Details in Explore Mode
  else if (customer.stage === 'service_detail') {
    // User sent their business requirement in response to our question
    customer.purpose = `${customer.serviceDetail || customer.serviceCategory}: ${body.slice(0, 800)}`;
    saveLead = true;
    customer.stage = 'chat';
    reply = `Got it, ${customer.name || 'thanks'}! That sounds like a great fit for automation. 🎯\n\nWould you like to book a quick 30-minute consultation call with our team to discuss setting this up?`;
    menu = 'consult_offer';
  }

  // D. Date Selected via Text (e.g. user typed 2026-10-26)
  else if (customer.stage === 'appt_date') {
    if (validDates.includes(body)) {
      customer.apptDate = body;
      customer.apptPage = 0;
      customer.stage = 'appt_time';
      action = 'check_day';
      reply = `Checking available times for ${body}...`;
    } else {
      menu = 'date';
      reply = 'Please select a valid upcoming date from the options below:';
    }
  }

  // E. Fallback & AI Chat Stage
  else {
    // If user asks a general question, route to helpful AI / conversational answer
    useAI = true;
    reply = 'Thank you for your message. Let me help you with that!';
  }

  // ====================================================================
  // 4. WHATSAPP PAYLOAD COMPILATION (Meta Cloud API Format)
  // ====================================================================

  const common = { messaging_product: 'whatsapp', recipient_type: 'individual', to: phone };
  let payload;

  if (menu === 'intent') {
    payload = {
      ...common,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: reply },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'tbw_intent_appointment', title: 'Book Appointment' } },
            { type: 'reply', reply: { id: 'tbw_intent_service', title: 'Explore Services' } },
          ],
        },
      },
    };
  } else if (menu === 'cat_list') {
    payload = {
      ...common,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: reply },
        action: {
          button: 'Explore Services',
          sections: [
            {
              title: 'Service Categories',
              rows: Object.values(CATEGORIES).map(c => ({
                id: c.id,
                title: c.title,
                description: c.desc,
              })),
            },
          ],
        },
      },
    };
  } else if (menu === 'subservice_list') {
    const catKey = Object.keys(CATEGORIES).find(k => CATEGORIES[k].title === customer.serviceCategory) || 'tbw_cat_ai';
    const cat = CATEGORIES[catKey];
    payload = {
      ...common,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: reply },
        action: {
          button: 'Choose Service',
          sections: [
            {
              title: cat.title,
              rows: cat.services.map(s => ({
                id: s.id,
                title: s.title,
                description: s.desc,
              })),
            },
          ],
        },
      },
    };
  } else if (menu === 'service_detail') {
    payload = {
      ...common,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: reply },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'tbw_book_for_service', title: 'Book Consultation' } },
            { type: 'reply', reply: { id: 'tbw_intent_service', title: 'Other Services' } },
          ],
        },
      },
    };
  } else if (menu === 'consult_offer') {
    payload = {
      ...common,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: reply },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'tbw_intent_appointment', title: 'Book Consultation' } },
            { type: 'reply', reply: { id: 'tbw_intent_service', title: 'Explore More' } },
          ],
        },
      },
    };
  } else if (menu === 'name_confirm') {
    const shortName = (customer.profileName || '').split(' ')[0] || 'Me';
    payload = {
      ...common,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: reply },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'tbw_name_accept', title: `Yes, call me ${shortName}`.slice(0, 20) } },
            { type: 'reply', reply: { id: 'tbw_name_custom', title: 'Different Name' } },
          ],
        },
      },
    };
  } else if (menu === 'date') {
    payload = {
      ...common,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: reply },
        action: {
          button: 'Choose Date',
          sections: [
            {
              title: hasTodaySlots ? 'Available Dates (Today + 5 days)' : 'Available Upcoming Dates',
              rows: validDates.map(d => ({
                id: `tbw_date_${d}`,
                title: new Intl.DateTimeFormat('en-GB', {
                  timeZone: 'Asia/Kolkata',
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                }).format(new Date(`${d}T12:00:00+05:30`)),
                description: d === todayIST ? `Today (${d})` : d,
              })),
            },
          ],
        },
      },
    };
  } else if (menu === 'confirm') {
    if (customer.stage === 'appt_active_check') {
      payload = {
        ...common,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: reply },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'tbw_appt_keep', title: 'Keep Appointment' } },
              { type: 'reply', reply: { id: 'tbw_appt_reschedule', title: 'Reschedule' } },
            ],
          },
        },
      };
    } else {
      payload = {
        ...common,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: reply },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'tbw_appt_confirm', title: 'Confirm Booking' } },
              { type: 'reply', reply: { id: 'tbw_appt_change_date', title: 'Change Date' } },
            ],
          },
        },
      };
    }
  } else {
    payload = { ...common, type: 'text', text: { preview_url: false, body: reply } };
  }

  let calendarStart = '';
  let calendarEnd = '';
  if (action === 'check_day') {
    calendarStart = `${customer.apptDate}T10:00:00+05:30`;
    calendarEnd = `${customer.apptDate}T22:00:00+05:30`;
  }
  if (action === 'book') {
    calendarStart = customer.apptStart;
    calendarEnd = customer.apptEnd;
  }

  let hash = 14695981039346656037n;
  for (const c of String(`${phone}/${customer.apptStart || ''}`)) {
    hash ^= BigInt(c.charCodeAt(0));
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  const bookingEventId = 'tb' + hash.toString(16).padStart(16, '0');

  const aiPrompt = `You are the WhatsApp assistant for The Business Work, an automation agency.
Customer name: ${customer.name || 'there'}
Business: ${customer.business || 'N/A'}
Service of interest: ${customer.serviceDetail || customer.serviceCategory || 'General Inquiry'}
Customer message: ${body}
Provide a natural, friendly, human-like response in 1-2 short sentences. If they want to book a call, remind them they can select Book Appointment.`;

  return [
    {
      json: {
        phone,
        reply,
        useAI,
        saveLead,
        aiPrompt,
        waPayload: payload,
        action,
        calendarStart,
        calendarEnd,
        bookingEventId,
        apptDate: customer.apptDate || '',
        apptStart: customer.apptStart || '',
        apptEnd: customer.apptEnd || '',
        apptPage: customer.apptPage || 0,
        Date: new Date().toISOString(),
        Source: 'WhatsApp',
        Name: customer.name || customer.profileName || '',
        Business: customer.business || '',
        Service: customer.serviceDetail || customer.serviceCategory || '',
        Phone: phone,
        Email: '',
        Purpose: customer.purpose || '',
        Status: 'New',
        sessionStage: customer.stage,
      },
    },
  ];
}
