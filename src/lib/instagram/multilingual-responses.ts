/**
 * THE BUSINESS WORK — COMPLETE 24-SERVICE MULTILINGUAL CONVERSATIONAL ENGINE
 *
 * Implements:
 * 1. Complete Official Catalog: 4 Categories & 24 Distinct Services
 * 2. 3-Language Native Support (English, Hindi Devanagari, Hinglish Roman Hindi)
 * 3. Language preference persistence across button postbacks
 * 4. Deterministic Hierarchical Navigation (Categories -> 6 Sub-services -> Deep-dive)
 * 5. Meta Button Template (In-Bubble Buttons: template_type "button")
 * 6. Natural WhatsApp CTA links (https://wa.me/917972020292)
 * 7. Grounded Gemini AI Prompt with full 24-service context
 * 8. Anti-welcome loop protection (welcome once per customer)
 */

export type SupportedLanguage = 'en' | 'hi' | 'hinglish';

export interface MetaButton {
  type: 'postback' | 'web_url';
  title: string;
  payload?: string;
  url?: string;
}

export interface MetaButtonTemplatePayload {
  template_type: 'button';
  text: string;
  buttons: MetaButton[];
}

export interface MultilingualResolution {
  action: 'fixed' | 'follow_check' | 'ai';
  reply_text: string;
  language: SupportedLanguage;
  button_template?: MetaButtonTemplatePayload | null;
  aiPrompt?: string;
  is_welcome: boolean;
  activeCategory?: string | null;
  activeService?: string | null;
}

export interface LocalizedText {
  en: string;
  hi: string;
  hinglish: string;
}

export interface ServiceDefinition {
  id: string;
  code: string;
  categoryId: string;
  name: LocalizedText;
  shortSummary: LocalizedText;
  explanation: LocalizedText;
  aliases: string[];
}

export interface CategoryDefinition {
  id: string;
  code: string;
  name: LocalizedText;
  summary: LocalizedText;
  serviceIds: string[];
  aliases: string[];
}

// -----------------------------------------------------------------------------
// 1. COMPLETE OFFICIAL SERVICE CATALOG (4 CATEGORIES & 24 SERVICES)
// -----------------------------------------------------------------------------

export const SERVICE_CATEGORIES: Record<string, CategoryDefinition> = {
  cat_ai_agents: {
    id: 'cat_ai_agents',
    code: '1',
    name: {
      en: 'AI Agents & Chatbots',
      hi: 'AI एजेंट्स और चैटबॉट्स',
      hinglish: 'AI Agents & Chatbots',
    },
    summary: {
      en: 'Autonomous sales, customer support, website chat, lead scoring, voice calls, and appointment booking agents.',
      hi: 'सेल्स, कस्टमर सपोर्ट, वेबसाइट चैट, लीड स्कोरिंग, वॉयस कॉल और अपॉइंटमेंट बुकिंग के लिए स्मार्ट AI एजेंट्स।',
      hinglish: 'Sales, customer support, website chat, lead scoring, voice calling aur appointment booking ke liye smart AI agents.',
    },
    serviceIds: [
      'ai_sales_agents',
      'ai_support_agents',
      'website_chatbots',
      'ai_lead_qualification',
      'ai_voice_agents',
      'ai_booking_agents',
    ],
    aliases: [
      'ai agents', 'chatbots', 'ai agent', 'chatbot', 'category 1', 'cat 1',
      'एआई एजेंट', 'चैटबॉट', 'ai agents & chatbots'
    ],
  },

  cat_crm_sales: {
    id: 'cat_crm_sales',
    code: '2',
    name: {
      en: 'CRM & Sales Automation',
      hi: 'CRM और सेल्स ऑटोमेशन',
      hinglish: 'CRM & Sales Automation',
    },
    summary: {
      en: 'CRM configuration, lead centralization, automated follow-ups, deal pipeline stages, instant rep alerts, and executive sales analytics.',
      hi: 'CRM सेटअप, लीड मैनेजमेंट, ऑटोमैटिक फॉलो-अप, डील पाइपलाइन, टीम अलर्ट्स और विस्तृत सेल्स रिपोर्टिंग।',
      hinglish: 'CRM setup, lead management, automatic follow-ups, sales pipelines, instant sales alerts aur revenue reporting.',
    },
    serviceIds: [
      'crm_setup',
      'lead_management',
      'automated_followups',
      'sales_pipeline_automation',
      'lead_assignment_notifications',
      'sales_reporting',
    ],
    aliases: [
      'crm', 'sales automation', 'crm and sales', 'crm & sales', 'category 2', 'cat 2',
      'सीआरएम', 'सेल्स ऑटोमेशन'
    ],
  },

  cat_workflows: {
    id: 'cat_workflows',
    code: '3',
    name: {
      en: 'Business Workflow Automation',
      hi: 'बिजनेस वर्कफ़्लो ऑटोमेशन',
      hinglish: 'Business Workflow Automation',
    },
    summary: {
      en: 'Connecting web forms, email sequences, Google Sheets, calendar apps, invoice PDF generators, and cross-platform business tools.',
      hi: 'वेबसाइट फॉर्म, ईमेल, Google Sheets, कैलेंडर, इनवॉइस PDF और बिजनेस टूल्स को आपस में जोड़कर ऑटोमैटिक बनाना।',
      hinglish: 'Forms, emails, Google Sheets, calendars, invoice PDFs aur business apps ko seamlessly integrate karke automate karna.',
    },
    serviceIds: [
      'form_to_crm',
      'email_automation',
      'google_sheets_automation',
      'calendar_automation',
      'invoice_document_workflows',
      'business_app_integrations',
    ],
    aliases: [
      'workflows', 'workflow automation', 'business workflow', 'business automation', 'category 3', 'cat 3',
      'वर्कफ़्लो', 'बिजनेस वर्कफ़्लो'
    ],
  },

  cat_whatsapp_social: {
    id: 'cat_whatsapp_social',
    code: '4',
    name: {
      en: 'WhatsApp & Social Automation',
      hi: 'WhatsApp और सोशल ऑटोमेशन',
      hinglish: 'WhatsApp & Social Automation',
    },
    summary: {
      en: 'Official Meta WhatsApp Business API, intelligent WhatsApp AI chats, automated alerts, Instagram DM bots, social lead capture, and retention follow-ups.',
      hi: 'ऑफिशियल WhatsApp Business API, WhatsApp AI चैट, ऑटोमैटिक अलर्ट, Instagram DM बॉट्स और सोशल मीडिया लीड कैप्चर।',
      hinglish: 'Official Meta WhatsApp Business API, WhatsApp AI chat, automated reminders, Instagram DM automation aur social lead capture.',
    },
    serviceIds: [
      'whatsapp_business_automation',
      'whatsapp_ai_chat',
      'notifications_reminders',
      'instagram_dm_automation',
      'social_media_lead_capture',
      'customer_followup_messages',
    ],
    aliases: [
      'whatsapp', 'social automation', 'whatsapp automation', 'instagram automation', 'category 4', 'cat 4',
      'व्हाट्सएप', 'सोशल ऑटोमेशन'
    ],
  },
};

export const SERVICES_CATALOG: Record<string, ServiceDefinition> = {
  // CATEGORY 1: AI AGENTS & CHATBOTS
  ai_sales_agents: {
    id: 'ai_sales_agents',
    code: '1.1',
    categoryId: 'cat_ai_agents',
    name: {
      en: 'AI Sales Agents',
      hi: 'AI सेल्स एजेंट',
      hinglish: 'AI Sales Agents',
    },
    shortSummary: {
      en: '24/7 lead qualification & sales closing',
      hi: '24/7 लीड क्वालिफिकेशन और सेल्स क्लोजिंग',
      hinglish: '24/7 lead qualification & instant sales closing',
    },
    explanation: {
      en: 'AI Sales Agents actively engage incoming prospects, answer product queries, qualify buying intent, and close deals or route hot leads to your sales reps 24/7. For example, when a prospect lands on your website after hours, the agent qualifies their budget and books a demo call immediately.',
      hi: 'AI सेल्स एजेंट 24/7 ग्राहकों के सवालों के जवाब देते हैं, उनके बजट और ज़रूरत को समझकर लीड्स को क्वालिफाई करते हैं और तुरंत डील फाइनल करने में मदद करते हैं। उदाहरण के लिए, रात में आने वाले ग्राहक को भी तुरंत सही जानकारी मिलती है और डेमो कॉल बुक हो जाती है।',
      hinglish: 'AI Sales Agents 24/7 website aur social media par aane wale prospects se baat karte hain, unka budget aur requirement qualify karte hain aur hot leads ko turant booking ya call tak le jaate hain. Jaise midnight mein inquiry aane par bhi instantly demo book ho jaata hai.',
    },
    aliases: ['ai sales agent', 'sales agent', 'sales bot', 'sales ai', 'close deals', 'ai sales reps', 'सेल्स एजेंट', 'सेल्स बॉट'],
  },

  ai_support_agents: {
    id: 'ai_support_agents',
    code: '1.2',
    categoryId: 'cat_ai_agents',
    name: {
      en: 'AI Customer Support Agents',
      hi: 'AI कस्टमर सपोर्ट एजेंट',
      hinglish: 'AI Customer Support Agents',
    },
    shortSummary: {
      en: 'Instant query resolution & ticket tracking',
      hi: 'बिना इंतज़ार के तुरंत शिकायत समाधान',
      hinglish: 'Instant query resolution & ticket tracking',
    },
    explanation: {
      en: 'AI Customer Support Agents resolve repetitive customer queries, troubleshoot issues, and track tickets around the clock with zero wait times. For example, customers get instant order status, return guidance, or account help without human staff intervention.',
      hi: 'AI कस्टमर सपोर्ट एजेंट ग्राहकों की सामान्य समस्याओं, शिकायतों और टिकटों का 24/7 बिना किसी इंतज़ार के तुरंत समाधान करते हैं। उदाहरण के लिए, ग्राहक को ऑर्डर स्टेटस, रिटर्न या सर्विस से जुड़ी जानकारी पलक झपकते ही मिल जाती है।',
      hinglish: 'AI Customer Support Agents 24/7 customer queries aur issues bina kisi delay ke solve karte hain. Example ke liye order tracking, service info ya account queries bina human staff ke instantly resolve ho jaati hain.',
    },
    aliases: ['customer support agent', 'support agent', 'support bot', 'customer service bot', 'helpdesk ai', 'कस्टमर सपोर्ट', 'सपोर्ट एजेंट'],
  },

  website_chatbots: {
    id: 'website_chatbots',
    code: '1.3',
    categoryId: 'cat_ai_agents',
    name: {
      en: 'Website AI Chatbots',
      hi: 'वेबसाइट AI चैटबॉट',
      hinglish: 'Website AI Chatbots',
    },
    shortSummary: {
      en: 'Convert site visitors into qualified leads',
      hi: 'विज़िटर्स को पूछताछ और ग्राहकों में बदलना',
      hinglish: 'Site visitors ko qualified leads mein convert karna',
    },
    explanation: {
      en: 'Website AI Chatbots turn casual site visitors into engaged leads by answering questions in real-time based on your business knowledge base. For example, a visitor exploring your pricing page gets answers to specific feature queries instantly in their browser.',
      hi: 'वेबसाइट AI चैटबॉट आपकी वेबसाइट पर आने वाले विज़िटर्स से रियल-टाइम में बातचीत करके उन्हें ग्राहकों में बदलते हैं। उदाहरण के लिए, आपकी वेबसाइट पर आने वाला विज़िटर अपनी ज़रूरतों के अनुसार तुरंत सही पैकेज की जानकारी ले सकता है।',
      hinglish: 'Website AI Chatbots aapki website par aane wale visitors ke sawaalon ka real-time reply dekar unhe leads mein convert karte hain. Jaise pricing ya product page par visitor ke har doubt ka turant answer mil jaata hai.',
    },
    aliases: ['website chatbot', 'website bot', 'web chatbot', 'site bot', 'website chat', 'live chatbot', 'वेबसाइट चैटबॉट'],
  },

  ai_lead_qualification: {
    id: 'ai_lead_qualification',
    code: '1.4',
    categoryId: 'cat_ai_agents',
    name: {
      en: 'AI Lead Qualification',
      hi: 'AI लीड क्वालिफिकेशन',
      hinglish: 'AI Lead Qualification',
    },
    shortSummary: {
      en: 'Filter & score high-intent buyers',
      hi: 'गंभीर खरीदारों की पहचान और स्कोरिंग',
      hinglish: 'High-intent buyers ko score aur filter karna',
    },
    explanation: {
      en: 'AI Lead Qualification systems ask smart diagnostic questions to score leads by budget, timeline, and decision-maker status before handing them to sales. For example, your reps spend time talking only to verified buyers while low-fit inquiries are filtered out automatically.',
      hi: 'AI लीड क्वालिफिकेशन सिस्टम ग्राहकों से सही सवाल पूछकर उनके बजट, ज़रूरत और समय-सीमा के आधार पर लीड को स्कोर करता है। इससे आपकी सेल्स टीम का समय केवल गंभीर खरीदारों पर खर्च होता है और बेकार पूछताछ अपने आप छंट जाती है।',
      hinglish: 'AI Lead Qualification system incoming leads se smart sawaal pooch kar unka budget, timeline aur purchase intent check karta hai. Isse aapki sales team sirf genuine aur high-intent buyers se baat karti hai, time waste nahi hota.',
    },
    aliases: ['lead qualification', 'qualify leads', 'lead scoring', 'filter leads', 'qualify buyer', 'लीड क्वालिफिकेशन'],
  },

  ai_voice_agents: {
    id: 'ai_voice_agents',
    code: '1.5',
    categoryId: 'cat_ai_agents',
    name: {
      en: 'AI Voice Agents',
      hi: 'AI वॉयस एजेंट',
      hinglish: 'AI Voice Agents',
    },
    shortSummary: {
      en: 'Human-like automated inbound & outbound calls',
      hi: 'इंसानों जैसी आवाज़ में फोन कॉल सिस्टम',
      hinglish: 'Human-like voice calling for bookings & follow-ups',
    },
    explanation: {
      en: 'AI Voice Agents make and receive natural phone calls to handle customer service, confirm appointments, and follow up with leads in a human-like voice. For example, after an online booking, the voice agent calls the customer to confirm their time slot automatically.',
      hi: 'AI वॉयस एजेंट इंसानों जैसी आवाज़ में फोन कॉल करके ग्राहकों की पूछताछ सुलझाते हैं, अपॉइंटमेंट की पुष्टि करते हैं और फॉलो-अप लेते हैं। उदाहरण के लिए, ऑनलाइन बुकिंग के बाद वॉयस एजेंट ग्राहक को कॉल करके टाइम स्लॉट कंफर्म कर लेता है।',
      hinglish: 'AI Voice Agents natural human voice mein incoming aur outgoing phone calls handle karte hain taaki appointments confirm ho sakein aur leads ka follow-up ho sake. Jaise booking hone par customer ko call karke time confirm kar lena.',
    },
    aliases: ['voice agent', 'voice bot', 'ai calling', 'calling bot', 'phone bot', 'voice ai', 'वॉयस एजेंट', 'कॉलिंग बॉट'],
  },

  ai_booking_agents: {
    id: 'ai_booking_agents',
    code: '1.6',
    categoryId: 'cat_ai_agents',
    name: {
      en: 'AI Appointment Booking Agents',
      hi: 'AI अपॉइंटमेंट बुकिंग एजेंट',
      hinglish: 'AI Appointment Booking Agents',
    },
    shortSummary: {
      en: 'Direct chat scheduling & calendar sync',
      hi: 'सीधे चैट में मीटिंग व अपॉइंटमेंट बुकिंग',
      hinglish: 'Direct chat mein real-time meeting booking',
    },
    explanation: {
      en: 'AI Appointment Booking Agents coordinate schedules directly in chat or on the web, checking real-time calendar availability and locking in meetings without email back-and-forth. For example, a client selects a free slot and receives an instant Google Calendar invitation.',
      hi: 'AI अपॉइंटमेंट बुकिंग एजेंट कैलेंडर की खाली तारीखों की जांच करके चैट में ही सीधे मीटिंग या विज़िट बुक कर देते हैं। उदाहरण के लिए, ग्राहक अपनी सुविधा का समय चुनता है और उसे तुरंत Google Calendar इनवाइट मिल जाता है।',
      hinglish: 'AI Appointment Booking Agents real-time calendar availability check karke direct chat mein meeting ya doctor/salon visit book kar dete hain. Example ke liye customer free slot choose karta hai aur instant calendar invite generate ho jaata hai.',
    },
    aliases: ['appointment booking agent', 'booking agent', 'booking bot', 'schedule meeting bot', 'calendar booking bot', 'अपॉइंटमेंट बुकिंग एजेंट'],
  },

  // CATEGORY 2: CRM & SALES AUTOMATION
  crm_setup: {
    id: 'crm_setup',
    code: '2.1',
    categoryId: 'cat_crm_sales',
    name: {
      en: 'CRM Setup & Customization',
      hi: 'CRM सेटअप और कस्टमाइज़ेशन',
      hinglish: 'CRM Setup & Customization',
    },
    shortSummary: {
      en: 'Tailored sales pipelines & deal tracking',
      hi: 'बिजनेस के अनुसार कस्टम पाइपलाइन सेटअप',
      hinglish: 'Custom pipelines & deal tracking setup',
    },
    explanation: {
      en: 'CRM Setup & Customization designs custom sales pipelines, custom fields, and deal stages tailored to your unique business model. For example, we configure HubSpot, Zoho, or custom databases so your team tracks every lead from first contact to signed contract.',
      hi: 'CRM सेटअप और कस्टमाइज़ेशन आपके बिजनेस के अनुसार सेल्स पाइपलाइन, कस्टम फील्ड्स और डील स्टेज तैयार करता है। उदाहरण के लिए, HubSpot या Zoho को इस तरह सेट किया जाता है कि पहली पूछताछ से लेकर पेमेंट तक हर स्टेज आसानी से ट्रैक हो सके।',
      hinglish: 'CRM Setup & Customization aapke exact business workflow ke hisaab se sales pipelines, custom fields aur deal stages set up karta hai. Jaise HubSpot ya Zoho mein inquiry aane se deal close hone tak sab track hota hai.',
    },
    aliases: ['crm setup', 'crm customization', 'setup crm', 'configure crm', 'zoho setup', 'hubspot setup', 'सीआरएम सेटअप'],
  },

  lead_management: {
    id: 'lead_management',
    code: '2.2',
    categoryId: 'cat_crm_sales',
    name: {
      en: 'Lead Management',
      hi: 'लीड मैनेजमेंट',
      hinglish: 'Lead Management',
    },
    shortSummary: {
      en: 'Centralize leads across all channels',
      hi: 'सभी माध्यमों से लीड्स को एक जगह इकट्ठा करना',
      hinglish: 'All sources se leads ko centralize karna',
    },
    explanation: {
      en: 'Lead Management centralizes leads from website forms, social ads, WhatsApp, and email into a single organized dashboard. For example, duplicate leads are automatically merged and historical conversation logs are preserved for your sales reps.',
      hi: 'लीड मैनेजमेंट वेबसाइट फॉर्म, सोशल एड्स, WhatsApp और ईमेल से आने वाली सभी लीड्स को एक जगह इकट्ठा और व्यवस्थित करता है। उदाहरण के लिए, डुप्लीकेट लीड्स अपने आप मर्ज हो जाती हैं और पिछली बातचीत का पूरा रिकॉर्ड सुरक्षित रहता है।',
      hinglish: 'Lead Management sabhi sources (Website, Ads, WhatsApp, Email) se aane wali leads ko ek central dashboard mein collect karta hai. Duplicate leads merge ho jaati hain aur complete chat history maintain rehti hai.',
    },
    aliases: ['lead management', 'manage leads', 'centralize leads', 'lead tracking', 'lead database', 'लीड मैनेजमेंट'],
  },

  automated_followups: {
    id: 'automated_followups',
    code: '2.3',
    categoryId: 'cat_crm_sales',
    name: {
      en: 'Automated Follow-ups',
      hi: 'ऑटोमैटिक फॉलो-अप',
      hinglish: 'Automated Follow-ups',
    },
    shortSummary: {
      en: 'Systematic sequences so no inquiry goes cold',
      hi: 'समय पर रिमाइंडर ताकि कोई ग्राहक न छूटे',
      hinglish: 'Systematic reminders taaki leads miss na hon',
    },
    explanation: {
      en: 'Automated Follow-ups trigger personalized email, SMS, or WhatsApp sequences whenever a lead goes cold or fails to complete an action. For example, if a prospect views a quotation but doesn\'t sign within 48 hours, a friendly reminder is dispatched automatically.',
      hi: 'ऑटोमैटिक फॉलो-अप सिस्टम उन ग्राहकों को ईमेल, SMS या WhatsApp पर रिमाइंडर भेजता है जो कोटेशन देखने के बाद जवाब नहीं देते। उदाहरण के लिए, अगर 48 घंटे तक कोई रिप्लाई नहीं आता, तो सिस्टम अपने आप दूसरा फॉलो-अप मैसेज भेज देता है।',
      hinglish: 'Automated Follow-ups un leads ko timely WhatsApp, SMS ya Email reminders bhejte hain jo quote dekh kar reply nahi karte. Jaise proposal bhejne ke 48 hours baad system automatically polite reminder send kar deta hai.',
    },
    aliases: ['automated followups', 'automated follow ups', 'automated follow-ups', 'follow up automation', 'lead reminders', 'quote follow up', 'ऑटोमैटिक फॉलो-अप'],
  },

  sales_pipeline_automation: {
    id: 'sales_pipeline_automation',
    code: '2.4',
    categoryId: 'cat_crm_sales',
    name: {
      en: 'Sales Pipeline Automation',
      hi: 'सेल्स पाइपलाइन ऑटोमेशन',
      hinglish: 'Sales Pipeline Automation',
    },
    shortSummary: {
      en: 'Auto-advance deals as buyer actions occur',
      hi: 'डील स्टेज को अपने आप आगे बढ़ाना',
      hinglish: 'Buyer actions par deal stages auto-update karna',
    },
    explanation: {
      en: 'Sales Pipeline Automation automatically advances deals through your stages as customer actions occur, such as signing a contract or paying an invoice. For example, when a deposit is received, the deal moves to \'Won\' and an onboarding task is created for operations.',
      hi: 'सेल्स पाइपलाइन ऑटोमेशन ग्राहक की गतिविधियों (जैसे एग्रीमेंट साइन करना या पेमेंट करना) के आधार पर डील स्टेज को अपने आप आगे बढ़ाता है। उदाहरण के लिए, एडवांस पेमेंट आते ही प्रोजेक्ट ऑनबोर्डिंग का टास्क टीम को असाइन हो जाता है।',
      hinglish: 'Sales Pipeline Automation deal stages ko automatically update karta hai jaise hi client payment ya agreement sign karta hai. Jaise payment receive hote hi deal \'Closed Won\' ho jaati hai aur onboarding start ho jaati hai.',
    },
    aliases: ['sales pipeline automation', 'pipeline automation', 'sales pipeline', 'deal pipeline', 'deal stages', 'पाइपलाइन ऑटोमेशन'],
  },

  lead_assignment_notifications: {
    id: 'lead_assignment_notifications',
    code: '2.5',
    categoryId: 'cat_crm_sales',
    name: {
      en: 'Lead Assignment & Notifications',
      hi: 'लीड असाइनमेंट और नोटिफिकेशन',
      hinglish: 'Lead Assignment & Notifications',
    },
    shortSummary: {
      en: 'Instant round-robin routing & sales alerts',
      hi: 'टीम को तुरंत लीड सौंपना और मोबाइल अलर्ट',
      hinglish: 'Instant sales rep routing & mobile alerts',
    },
    explanation: {
      en: 'Lead Assignment & Notifications distributes incoming leads instantly to the right sales reps via round-robin, geography, or service type. For example, your sales rep gets an instant push notification on mobile within 5 seconds of a high-value lead submitting an inquiry.',
      hi: 'लीड असाइनमेंट और नोटिफिकेशन नई पूछताछ को तुरंत सही सेल्स प्रतिनिधि को उनके क्षेत्र या अनुभव के अनुसार सौंपता है। उदाहरण के लिए, फॉर्म भरते ही सेल्स एग्जीक्यूटिव के फोन पर 5 सेकंड के अंदर कस्टमर डिटेल्स का अलर्ट पहुंच जाता है।',
      hinglish: 'Lead Assignment & Notifications new leads ko instant criteria (location, language, expertise) ke base par sales reps ko assign karta hai. Lead aate hi sales rep ko WhatsApp/Slack par 5 seconds mein notification mil jaata hai.',
    },
    aliases: ['lead assignment', 'lead notifications', 'assign leads', 'round robin', 'sales alerts', 'instant lead alert', 'लीड असाइनमेंट'],
  },

  sales_reporting: {
    id: 'sales_reporting',
    code: '2.6',
    categoryId: 'cat_crm_sales',
    name: {
      en: 'Sales Reporting',
      hi: 'सेल्स रिपोर्टिंग',
      hinglish: 'Sales Reporting',
    },
    shortSummary: {
      en: 'Daily & weekly automated revenue dashboards',
      hi: 'दैनिक व साप्ताहिक परफॉर्मेंस एनालिटिक्स',
      hinglish: 'Automated daily & weekly revenue dashboards',
    },
    explanation: {
      en: 'Sales Reporting generates automated daily, weekly, and monthly performance dashboards tracking conversion rates, pipeline value, and rep activity. For example, business owners receive an executive summary PDF in their inbox every Monday morning automatically.',
      hi: 'सेल्स रिपोर्टिंग रोज़ाना, साप्ताहिक और मासिक परफॉर्मेंस रिपोर्ट अपने आप तैयार करती है, जिसमें कन्वर्जन रेट और रेवेन्यू की पूरी जानकारी होती है। उदाहरण के लिए, हर सोमवार सुबह ओनर को ईमेल पर पूरी सेल्स समरी मिल जाती है।',
      hinglish: 'Sales Reporting daily, weekly aur monthly analytics dashboards automatically generate karta hai jisme conversion rates aur revenue track hota hai. Jaise har Monday morning ko business owner ko performance report email par mil jaati hai.',
    },
    aliases: ['sales reporting', 'sales analytics', 'sales reports', 'sales report', 'conversion tracking', 'weekly sales report', 'सेल्स रिपोर्टिंग'],
  },

  // CATEGORY 3: BUSINESS WORKFLOW AUTOMATION
  form_to_crm: {
    id: 'form_to_crm',
    code: '3.1',
    categoryId: 'cat_workflows',
    name: {
      en: 'Form-to-CRM Automation',
      hi: 'फॉर्म-टू-CRM ऑटोमेशन',
      hinglish: 'Form-to-CRM Automation',
    },
    shortSummary: {
      en: 'Route web forms directly into CRM & channels',
      hi: 'वेब फॉर्म सबमिशन को सीधे CRM में जोड़ना',
      hinglish: 'Web form submissions ko instant CRM mein sync karna',
    },
    explanation: {
      en: 'Form-to-CRM Automation instantly routes submissions from web forms, landing pages, or surveys straight into your CRM and team channels. For example, a Typeform submission creates a CRM contact, notifies the sales team on Slack, and sends a confirmation email within 2 seconds.',
      hi: 'फॉर्म-टू-CRM ऑटोमेशन वेबसाइट या लैंडिंग पेज के फॉर्म सबमिशन को सीधे CRM और टीम चैनल्स में भेज देता है। उदाहरण के लिए, फॉर्म भरते ही CRM में नया कॉन्टैक्ट बन जाता है, टीम को सूचना मिल जाती है और ग्राहक को कंफर्मेशन ईमेल चला जाता है।',
      hinglish: 'Form-to-CRM Automation website ya landing page form submissions ko instant CRM aur team groups mein sync karta hai. Jaise customer ne form bhara, 2 seconds mein CRM update ho jaata hai aur client ko welcome email chala jaata hai.',
    },
    aliases: ['form to crm', 'form crm', 'form integration', 'typeform crm', 'web form crm', 'landing page leads', 'फॉर्म टू सीआरएम'],
  },

  email_automation: {
    id: 'email_automation',
    code: '3.2',
    categoryId: 'cat_workflows',
    name: {
      en: 'Email Automation',
      hi: 'ईमेल ऑटोमेशन',
      hinglish: 'Email Automation',
    },
    shortSummary: {
      en: 'Onboarding sequences & behavioral drip campaigns',
      hi: 'व्यवहार-आधारित ऑनबोर्डिंग और ड्रिप ईमेल',
      hinglish: 'Behavioral onboarding & drip email workflows',
    },
    explanation: {
      en: 'Email Automation triggers contextual onboarding sequences, transactional updates, and nurture drip campaigns based on recipient behaviour. For example, new signups receive a personalized 5-part email series that adapts depending on which links they click.',
      hi: 'ईमेल ऑटोमेशन ग्राहकों के व्यवहार के आधार पर वेलकम ईमेल, ऑनबोर्डिंग गाइड और अपडेट्स अपने आप भेजता है। उदाहरण के लिए, नए साइनअप करने वाले ग्राहक को चरणबद्ध तरीके से सही जानकारी वाले ईमेल अपने आप मिलते रहते हैं।',
      hinglish: 'Email Automation customer actions ke hisaab se welcome series, onboarding steps aur follow-up drip emails automatically trigger karta hai. Jaise naya user aate hi useful guides ka automated email series shuru ho jaata hai.',
    },
    aliases: ['email automation', 'drip campaign', 'drip emails', 'automated email', 'welcome email sequence', 'ईमेल ऑटोमेशन'],
  },

  google_sheets_automation: {
    id: 'google_sheets_automation',
    code: '3.3',
    categoryId: 'cat_workflows',
    name: {
      en: 'Google Sheets Automation',
      hi: 'Google Sheets ऑटोमेशन',
      hinglish: 'Google Sheets Automation',
    },
    shortSummary: {
      en: 'Live 2-way sync across sheets, apps & DBs',
      hi: 'स्प्रेडशीट को अन्य ऐप्स के साथ ऑटो-सिंक करना',
      hinglish: 'Sheets ko apps & databases ke sath real-time sync karna',
    },
    explanation: {
      en: 'Google Sheets Automation synchronizes live business data between spreadsheets, web apps, databases, and accounting software without copy-paste. For example, every sales order automatically adds a timestamped row, formats data, and triggers inventory recalculations.',
      hi: 'Google Sheets ऑटोमेशन स्प्रेडशीट को आपकी वेबसाइट, डेटाबेस और एकाउंटिंग ऐप्स से जोड़कर डेटा को अपने आप अपडेट करता है। उदाहरण के लिए, कोई भी नई सेल होते ही शीट में सही रो जुड़ जाती है और इन्वेंट्री अपने आप अपडेट हो जाती है।',
      hinglish: 'Google Sheets Automation spreadsheets ko website, CRM aur accounting apps ke sath real-time sync karta hai bina copy-paste ke. Jaise har order aane par Google Sheet mein row auto-add hoti hai aur stock update ho jaata hai.',
    },
    aliases: ['google sheets automation', 'sheets automation', 'spreadsheet automation', 'sheet sync', 'google sheet integration', 'google sheets', 'गूगल शीट्स ऑटोमेशन', 'गूगल शीट्स'],
  },

  calendar_automation: {
    id: 'calendar_automation',
    code: '3.4',
    categoryId: 'cat_workflows',
    name: {
      en: 'Appointment & Calendar Automation',
      hi: 'अपॉइंटमेंट और कैलेंडर ऑटोमेशन',
      hinglish: 'Appointment & Calendar Automation',
    },
    shortSummary: {
      en: 'Sync calendar slots, Zoom links & confirmations',
      hi: 'मीटिंग लिंक, इनवाइट्स व कैलेंडर सिंक',
      hinglish: 'Calendar sync, Zoom links & automatic confirmations',
    },
    explanation: {
      en: 'Appointment & Calendar Automation syncs bookings across Google Calendar, Outlook, Zoom, and WhatsApp, eliminating double-bookings and manual confirmations. For example, when an appointment is booked, a Zoom link is generated and WhatsApp reminders are scheduled.',
      hi: 'अपॉइंटमेंट और कैलेंडर ऑटोमेशन Google Calendar, Outlook और Zoom को आपस में सिंक करके समय टकराने की समस्या खत्म करता है। उदाहरण के लिए, मीटिंग बुक होते ही Zoom लिंक बन जाता है और ग्राहक को समय पर WhatsApp रिमाइंडर चले जाते हैं।',
      hinglish: 'Appointment & Calendar Automation Google Calendar, Zoom aur WhatsApp ko sync karke double-booking rokta hai. Meeting schedule hote hi automatic Zoom link create hota hai aur dono parties ko reminder chala jaata hai.',
    },
    aliases: ['calendar automation', 'appointment automation', 'meeting automation', 'zoom automation', 'google calendar sync', 'कैलेंडर ऑटोमेशन'],
  },

  invoice_document_workflows: {
    id: 'invoice_document_workflows',
    code: '3.5',
    categoryId: 'cat_workflows',
    name: {
      en: 'Invoice & Document Workflows',
      hi: 'इनवॉइस और डॉक्यूमेंट वर्कफ़्लो',
      hinglish: 'Invoice & Document Workflows',
    },
    shortSummary: {
      en: 'Auto-generate invoices, quotes & contracts in PDF',
      hi: 'ऑटोमैटिक PDF इनवॉइस, कोटेशन व कॉन्ट्रैक्ट',
      hinglish: 'Automatic PDF quotes, contracts & invoice generation',
    },
    explanation: {
      en: 'Invoice & Document Workflows automatically generate PDF quotes, contracts, and invoices from form inputs and email them for digital signature. For example, upon closing a deal, an NDA and invoice are pre-filled and sent to the client in under 30 seconds.',
      hi: 'इनवॉइस और डॉक्यूमेंट वर्कफ़्लो फॉर्म डेटा से सीधे PDF कोटेशन, एग्रीमेंट और इनवॉइस बनाकर डिजिटल हस्ताक्षर के लिए भेजते हैं। उदाहरण के लिए, डील पक्की होते ही इनवॉइस अपने आप तैयार होकर ग्राहक को ईमेल हो जाती है।',
      hinglish: 'Invoice & Document Workflows CRM ya form data se automatic PDF invoices, contracts aur quotations generate karke client ko send karta hai. Deal close hote hi tailored contract aur invoice 30 seconds mein generate ho jaata hai.',
    },
    aliases: ['invoice workflows', 'document workflows', 'invoice automation', 'contract automation', 'pdf invoice', 'auto invoice', 'इनवॉइस ऑटोमेशन'],
  },

  business_app_integrations: {
    id: 'business_app_integrations',
    code: '3.6',
    categoryId: 'cat_workflows',
    name: {
      en: 'Business App Integrations',
      hi: 'बिजनेस ऐप इंटीग्रेशन',
      hinglish: 'Business App Integrations',
    },
    shortSummary: {
      en: 'Connect APIs, webhooks, ERP, Slack & Notion',
      hi: 'अलग-अलग बिजनेस टूल्स व ऐप्स को जोड़ना',
      hinglish: 'APIs, webhooks, ERPs aur daily apps ko connect karna',
    },
    explanation: {
      en: 'Business App Integrations connect custom APIs, webhooks, ERPs, Notion, Slack, and third-party tools into a cohesive automated ecosystem. For example, an order in Shopify instantly updates QuickBooks, pings warehouse staff on Slack, and updates your CRM.',
      hi: 'बिजनेस ऐप इंटीग्रेशन आपके अलग-अलग टूल्स (जैसे Shopify, QuickBooks, Slack, ERP) को आपस में जोड़कर एक सुचारू सिस्टम बनाता है। उदाहरण के लिए, वेबसाइट पर ऑर्डर आते ही एकाउंटिंग सॉफ्टवेयर अपडेट होता है और टीम को सूचना मिल जाती है।',
      hinglish: 'Business App Integrations alag-alag apps jaise Shopify, QuickBooks, Slack aur ERPs ko aapas mein connect karta hai. Jaise website par order aate hi accounting software update ho jaata hai aur packaging team ko Slack par alert milta hai.',
    },
    aliases: ['business app integrations', 'app integrations', 'webhook integration', 'api integration', 'tool integration', 'connect apps', 'ऐप इंटीग्रेशन'],
  },

  // CATEGORY 4: WHATSAPP & SOCIAL AUTOMATION
  whatsapp_business_automation: {
    id: 'whatsapp_business_automation',
    code: '4.1',
    categoryId: 'cat_whatsapp_social',
    name: {
      en: 'WhatsApp Business Automation',
      hi: 'WhatsApp बिजनेस ऑटोमेशन',
      hinglish: 'WhatsApp Business Automation',
    },
    shortSummary: {
      en: 'Official Cloud API catalogs & order tracking',
      hi: 'ऑफिशियल WhatsApp API से कैटलॉग व ऑर्डर्स',
      hinglish: 'Official Cloud API catalog sharing & order status',
    },
    explanation: {
      en: 'WhatsApp Business Automation leverages the official Meta WhatsApp Cloud API to automate customer onboarding, product catalog sharing, and order status updates. For example, customers can browse your product catalog and place orders directly in WhatsApp.',
      hi: 'WhatsApp बिजनेस ऑटोमेशन ऑफिशियल Meta Cloud API के जरिए ग्राहकों को कैटलॉग दिखाने, ऑर्डर लेने और स्टेटस अपडेट देने का काम अपने आप करता है। उदाहरण के लिए, ग्राहक WhatsApp के अंदर ही आपकी सेवाएं देखकर ऑर्डर बुक कर सकते हैं।',
      hinglish: 'WhatsApp Business Automation official Meta Cloud API ke through catalog sharing, customer onboarding aur order tracking manage karta hai. Customer direct WhatsApp chat ke andar catalog dekh kar inquiries aur orders place kar sakte hain.',
    },
    aliases: ['whatsapp business automation', 'whatsapp api', 'whatsapp cloud api', 'meta whatsapp api', 'व्हाट्सएप बिजनेस ऑटोमेशन'],
  },

  whatsapp_ai_chat: {
    id: 'whatsapp_ai_chat',
    code: '4.2',
    categoryId: 'cat_whatsapp_social',
    name: {
      en: 'WhatsApp AI Chat',
      hi: 'WhatsApp AI चैट',
      hinglish: 'WhatsApp AI Chat',
    },
    shortSummary: {
      en: 'Smart conversational AI assistant on WhatsApp',
      hi: 'WhatsApp पर 24/7 समझदार AI चैट असिस्टेंट',
      hinglish: 'Intelligent conversational AI on WhatsApp Business',
    },
    explanation: {
      en: 'WhatsApp AI Chat equips your WhatsApp Business account with an intelligent AI assistant that answers complex questions and qualifies leads in real time. For example, a customer inquiring about customized services receives detailed answers and price ranges instantly.',
      hi: 'WhatsApp AI चैट आपके बिजनेस नंबर पर एक समझदार AI असिस्टेंट जोड़ता है जो ग्राहकों के हर सवाल का सटीक जवाब देता है। उदाहरण के लिए, किसी सेवा की कीमत या प्रक्रिया पूछने पर ग्राहक को तुरंत बातचीत के अंदाज़ में पूरी जानकारी मिल जाती है।',
      hinglish: 'WhatsApp AI Chat aapke business number par smart conversational AI add karta hai jo customer ke complex questions ka instant reply deta hai. Jaise customized requirement ya pricing par customer ko turant accurate information mil jaati hai.',
    },
    aliases: ['whatsapp ai chat', 'whatsapp ai', 'whatsapp chatbot', 'whatsapp bot', 'whatsapp gpt', 'व्हाट्सएप एआई चैट'],
  },

  notifications_reminders: {
    id: 'notifications_reminders',
    code: '4.3',
    categoryId: 'cat_whatsapp_social',
    name: {
      en: 'Notifications & Reminders',
      hi: 'नोटिफिकेशन और रिमाइंडर',
      hinglish: 'Notifications & Reminders',
    },
    shortSummary: {
      en: 'Automated WhatsApp & SMS alerts for visits & dues',
      hi: 'अपॉइंटमेंट व पेमेंट के समय पर रिमाइंडर मैसेज',
      hinglish: 'Automated WhatsApp/SMS alerts for visits & payments',
    },
    explanation: {
      en: 'Notifications & Reminders dispatch automated WhatsApp and SMS alerts for upcoming appointments, overdue invoices, and service milestones. For example, patients or clients receive an automatic appointment reminder 24 hours and 2 hours before their visit.',
      hi: 'नोटिफिकेशन और रिमाइंडर ग्राहकों को आगामी अपॉइंटमेंट, पेमेंट और जरूरी तारीखों के WhatsApp और SMS अलर्ट अपने आप भेजते हैं। उदाहरण के लिए, मीटिंग से 24 घंटे और 2 घंटे पहले ग्राहक को रिमाइंडर मैसेज मिल जाता है।',
      hinglish: 'Notifications & Reminders upcoming appointments, payment dues aur event alerts ke liye automated WhatsApp/SMS bhejte hain. Jaise scheduled meeting se 24 hours aur 2 hours pehle automatic reminder chala jaata hai.',
    },
    aliases: ['notifications and reminders', 'notifications reminders', 'whatsapp reminders', 'sms reminders', 'due reminders', 'appointment reminders', 'नोटिफिकेशन और रिमाइंडर'],
  },

  instagram_dm_automation: {
    id: 'instagram_dm_automation',
    code: '4.4',
    categoryId: 'cat_whatsapp_social',
    name: {
      en: 'Instagram DM Automation',
      hi: 'Instagram DM ऑटोमेशन',
      hinglish: 'Instagram DM Automation',
    },
    shortSummary: {
      en: 'Reel comment-to-DM & interactive in-bubble buttons',
      hi: 'रील कमेंट पर तुरंत DM व इन-बबल बटन ऑटोमेशन',
      hinglish: 'Reel comment-to-DM & interactive in-bubble buttons',
    },
    explanation: {
      en: 'Instagram DM Automation handles story mentions, direct messages, and Reel comment-to-DM triggers instantly with interactive button templates. For example, when someone comments \'DETAILS\' on your Reel, they receive an immediate private reply and in-bubble buttons.',
      hi: 'Instagram DM ऑटोमेशन स्टोरी मेंशन, डायरेक्ट मैसेज और रील कमेंट्स पर तुरंत ऑटोमैटिक रिप्लाई और इन-बबल बटन भेजता है। उदाहरण के लिए, रील पर कमेंट करते ही यूजर को प्राइवेट रिप्लाई में सारी डिटेल्स और बटन मिल जाते हैं।',
      hinglish: 'Instagram DM Automation story mentions, DMs aur Reel comment-to-DM triggers ko instant in-bubble button templates ke sath handle karta hai. Jaise Reel par \'DETAILS\' comment aate hi customer ke DM mein instant details pahunch jaati hain.',
    },
    aliases: ['instagram dm automation', 'instagram automation', 'ig automation', 'reel automation', 'comment to dm', 'story mention bot', 'इंस्टाग्राम डीएम ऑटोमेशन'],
  },

  social_media_lead_capture: {
    id: 'social_media_lead_capture',
    code: '4.5',
    categoryId: 'cat_whatsapp_social',
    name: {
      en: 'Social Media Lead Capture',
      hi: 'सोशल मीडिया लीड कैप्चर',
      hinglish: 'Social Media Lead Capture',
    },
    shortSummary: {
      en: 'Convert post/ad engagers into CRM contacts',
      hi: 'सोशल मीडिया एंगेजमेंट को सीधी लीड में बदलना',
      hinglish: 'Social engagers ko verified CRM leads mein convert karna',
    },
    explanation: {
      en: 'Social Media Lead Capture converts Instagram, Facebook, and LinkedIn engagers into registered CRM contacts automatically via interactive chats. For example, a user who reacts to a post is guided through a quick 3-question chat that captures their phone number and requirement.',
      hi: 'सोशल मीडिया लीड कैप्चर Instagram और Facebook पर संपर्क करने वाले विज़िटर्स को चैट के जरिए CRM में रजिस्टर्ड लीड में बदलता है। उदाहरण के लिए, पोस्ट पर दिलचस्पी दिखाने वाले यूजर से चैट में ही फोन नंबर और ज़रूरत की जानकारी ले ली जाती है।',
      hinglish: 'Social Media Lead Capture Instagram aur Facebook users ko quick chat flow ke zariye CRM mein verified leads ke roop mein save karta hai. Post par engage karte hi user se phone number aur requirement collect ho jaati hai.',
    },
    aliases: ['social media lead capture', 'social lead capture', 'social leads', 'instagram lead capture', 'facebook lead capture', 'सोशल मीडिया लीड कैप्चर'],
  },

  customer_followup_messages: {
    id: 'customer_followup_messages',
    code: '4.6',
    categoryId: 'cat_whatsapp_social',
    name: {
      en: 'Customer Follow-up Messages',
      hi: 'कस्टमर फॉलो-अप मैसेज',
      hinglish: 'Customer Follow-up Messages',
    },
    shortSummary: {
      en: 'Re-engage buyers with review requests & offers',
      hi: 'पुराने ग्राहकों से रिव्यू व री-एंगेजमेंट संदेश',
      hinglish: 'Post-purchase feedback requests & repeat offers',
    },
    explanation: {
      en: 'Customer Follow-up Messages automatically re-engage past buyers and stalled prospects on WhatsApp and social DMs with tailored offers and feedback requests. For example, 7 days after service delivery, an automated message checks satisfaction and offers referral benefits.',
      hi: 'कस्टमर फॉलो-अप मैसेज पुराने ग्राहकों और रुके हुए संभावित खरीदारों से WhatsApp पर दोबारा संपर्क करके फीडबैक और नए ऑफर्स देते हैं। उदाहरण के लिए, सर्विस पूरी होने के 7 दिन बाद सिस्टम अपने आप संतुष्टि और रिव्यू का मैसेज भेजता है।',
      hinglish: 'Customer Follow-up Messages purane clients aur pending leads ko WhatsApp/DM par re-engage karke feedback aur special offers bhejte hain. Jaise service deliver hone ke 7 days baad automatic review request aur referral message chala jaata hai.',
    },
    aliases: ['customer followup messages', 'customer follow up messages', 'customer follow-up messages', 're engage customers', 'post purchase follow up', 'review request whatsapp', 'कस्टमर फॉलो-अप'],
  },
};

// -----------------------------------------------------------------------------
// 2. LANGUAGE DETECTION (WITH SESSION PREFERENCE PERSISTENCE)
// -----------------------------------------------------------------------------

export function detectCustomerLanguage(text: string, currentPref?: SupportedLanguage | null): SupportedLanguage {
  const clean = String(text || '').trim();
  if (!clean) return currentPref || 'en';

  // 1. Devanagari Script (Hindi)
  if (/[\u0900-\u097F]/.test(clean)) {
    return 'hi';
  }

  // 2. Hinglish (Roman Hindi) Pattern Matching
  const hinglishTokens = [
    'kya', 'hai', 'hain', 'aap', 'aapke', 'aapka', 'aapki', 'hum', 'hamara',
    'kaise', 'chahiye', 'batao', 'dena', 'karta', 'karte', 'karti', 'mujhe',
    'bhi', 'nahi', 'nahin', 'aur', 'ke', 'ki', 'ko', 'se', 'par', 'kar',
    'raha', 'rahe', 'rahi', 'kitna', 'kitne', 'kitni', 'bolo', 'hoga', 'hogi',
    'milega', 'milegi', 'bataye', 'batayein', 'karega', 'karegi', 'karna',
    'chahta', 'chahte', 'chahti', 'paas', 'dete', 'ho', 'bataiye', 'sakte',
    'zaroorat', 'kaam', 'baat', 'chhat', 'pe', 'liye', 'karo', 'karoonga',
    'lagta', 'lagti', 'humein', 'sirf', 'shuru', 'bata'
  ];

  const words = clean.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  let matchCount = 0;
  for (const w of words) {
    if (hinglishTokens.includes(w)) matchCount++;
  }

  if (matchCount >= 1 && (words.length <= 4 || matchCount / words.length >= 0.15)) {
    return 'hinglish';
  }

  // Short tokens or numbers/payloads preserve existing preference if already established
  if ((words.length <= 2 || /^tbw_/i.test(clean) || /^\d+(\.\d+)?$/.test(clean)) && currentPref) {
    return currentPref;
  }

  return 'en';
}

// -----------------------------------------------------------------------------
// 3. WHATSAPP CTA & NAVIGATION LABELS
// -----------------------------------------------------------------------------

export function getNavigationTitles(lang: SupportedLanguage) {
  if (lang === 'hi') {
    return {
      whatsapp: 'WhatsApp चैट',
      allCategories: 'सभी सेवाएं',
      moreCategories: 'अन्य सेवाएं',
      details: 'डिटेल्स भेजें',
      followed: 'फॉलो कर लिया',
    };
  }
  if (lang === 'hinglish') {
    return {
      whatsapp: 'WhatsApp Chat',
      allCategories: 'All Services',
      moreCategories: 'More Categories',
      details: 'Send Me Details',
      followed: 'I Followed',
    };
  }
  return {
    whatsapp: 'Chat on WhatsApp',
    allCategories: 'Our Services',
    moreCategories: 'More Categories',
    details: 'Send Me Details',
    followed: 'I Followed',
  };
}

export function formatWhatsAppCta(whatsappUrl: string, lang: SupportedLanguage): string {
  if (!whatsappUrl) return '';
  if (lang === 'hi') {
    return `\n\nक्या आप इसके बारे में WhatsApp पर बात करना चाहेंगे?\n${whatsappUrl}`;
  }
  if (lang === 'hinglish') {
    return `\n\nAap iske baare mein WhatsApp par baat karna chahenge?\n${whatsappUrl}`;
  }
  return `\n\nWould you like to discuss this on WhatsApp?\n${whatsappUrl}`;
}

// -----------------------------------------------------------------------------
// 4. CATEGORY & SERVICE FORMATTERS
// -----------------------------------------------------------------------------

export function formatCategoryOverview(lang: SupportedLanguage, whatsappUrl: string): { text: string; button_template: MetaButtonTemplatePayload } {
  const titles = getNavigationTitles(lang);
  let text = '';

  if (lang === 'hi') {
    text = 'The Business Work में हम 4 मुख्य श्रेणियों में 24 ऑटोमेशन सेवाएं प्रदान करते हैं:\n' +
      '1. AI एजेंट्स और चैटबॉट्स (6 सेवाएं)\n' +
      '2. CRM और सेल्स ऑटोमेशन (6 सेवाएं)\n' +
      '3. बिजनेस वर्कफ़्लो ऑटोमेशन (6 सेवाएं)\n' +
      '4. WhatsApp और सोशल ऑटोमेशन (6 सेवाएं)\n\n' +
      'विस्तार से देखने के लिए नीचे किसी श्रेणी पर टैप करें या 1-4 लिखकर भेजें!';
  } else if (lang === 'hinglish') {
    text = 'The Business Work mein hum 4 main categories ke andar 24 automation services provide karte hain:\n' +
      '1. AI Agents & Chatbots (6 services)\n' +
      '2. CRM & Sales Automation (6 services)\n' +
      '3. Business Workflow Automation (6 services)\n' +
      '4. WhatsApp & Social Automation (6 services)\n\n' +
      'Details dekhne ke liye neeche button par tap karein ya 1-4 type karein!';
  } else {
    text = 'The Business Work provides 24 specialized automation services across 4 core categories:\n' +
      '1. AI Agents & Chatbots (6 services)\n' +
      '2. CRM & Sales Automation (6 services)\n' +
      '3. Business Workflow Automation (6 services)\n' +
      '4. WhatsApp & Social Automation (6 services)\n\n' +
      'Tap a category below or reply with 1–4 to explore!';
  }

  const buttons: MetaButton[] = [
    { type: 'postback', title: 'AI Agents', payload: 'TBW_CAT_1' },
    { type: 'postback', title: 'CRM & Sales', payload: 'TBW_CAT_2' },
    { type: 'postback', title: titles.moreCategories, payload: 'TBW_CAT_MORE' },
  ];

  return {
    text,
    button_template: {
      template_type: 'button',
      text: text.slice(0, 640),
      buttons,
    },
  };
}

export function formatMoreCategories(lang: SupportedLanguage, whatsappUrl: string): { text: string; button_template: MetaButtonTemplatePayload } {
  const titles = getNavigationTitles(lang);
  let text = '';

  if (lang === 'hi') {
    text = 'अन्य दो मुख्य श्रेणियां:\n' +
      '3. बिजनेस वर्कफ़्लो ऑटोमेशन (Sheets, फॉर्म, इनवॉइस व टूल्स)\n' +
      '4. WhatsApp और सोशल ऑटोमेशन (API, DM ऑटोमेशन व अलर्ट्स)\n\n' +
      'देखने के लिए नीचे टैप करें या सीधे WhatsApp पर संपर्क करें:';
  } else if (lang === 'hinglish') {
    text = 'Baqi 2 main categories:\n' +
      '3. Business Workflow Automation (Sheets, Forms, Invoices & Apps)\n' +
      '4. WhatsApp & Social Automation (API, DM Automation & Reminders)\n\n' +
      'Neeche tap karein ya direct WhatsApp par connect karein:';
  } else {
    text = 'Additional Core Categories:\n' +
      '3. Business Workflow Automation (Sheets, Forms, Invoicing & App sync)\n' +
      '4. WhatsApp & Social Automation (Cloud API, DMs, Reminders & Leads)\n\n' +
      'Tap an option below or chat with our team:';
  }

  const buttons: MetaButton[] = [
    { type: 'postback', title: 'Workflows', payload: 'TBW_CAT_3' },
    { type: 'postback', title: 'WhatsApp & Social', payload: 'TBW_CAT_4' },
    ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
  ].slice(0, 3) as MetaButton[];

  return {
    text,
    button_template: {
      template_type: 'button',
      text: text.slice(0, 640),
      buttons,
    },
  };
}

export function formatCategoryDetail(catId: string, lang: SupportedLanguage, whatsappUrl: string): { text: string; button_template: MetaButtonTemplatePayload } {
  const cat = SERVICE_CATEGORIES[catId];
  if (!cat) return formatCategoryOverview(lang, whatsappUrl);

  const titles = getNavigationTitles(lang);
  const items = cat.serviceIds.map((sid, idx) => {
    const s = SERVICES_CATALOG[sid];
    return `${idx + 1}. ${s.name[lang]} — ${s.shortSummary[lang]}`;
  }).join('\n');

  let header = '';
  let footer = '';

  if (lang === 'hi') {
    header = `📌 श्रेणी ${cat.code}: ${cat.name.hi}\n\n`;
    footer = '\n\nकिसी भी सेवा की पूरी जानकारी के लिए 1-6 या सेवा का नाम लिखकर भेजें!';
  } else if (lang === 'hinglish') {
    header = `📌 Category ${cat.code}: ${cat.name.hinglish}\n\n`;
    footer = '\n\nFull details ke liye 1-6 ya service ka naam type karein!';
  } else {
    header = `📌 Category ${cat.code}: ${cat.name.en}\n\n`;
    footer = '\n\nReply with 1–6 or any service name for full details!';
  }

  const fullText = header + items + footer;

  const buttons: MetaButton[] = [
    { type: 'postback', title: titles.allCategories, payload: 'TBW_MENU' },
    ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
  ];

  return {
    text: fullText,
    button_template: {
      template_type: 'button',
      text: fullText.slice(0, 640),
      buttons: buttons.slice(0, 3),
    },
  };
}

export function formatServiceDetail(serviceId: string, lang: SupportedLanguage, whatsappUrl: string): { text: string; button_template: MetaButtonTemplatePayload } {
  const s = SERVICES_CATALOG[serviceId];
  if (!s) return formatCategoryOverview(lang, whatsappUrl);

  const cat = SERVICE_CATEGORIES[s.categoryId];
  const titles = getNavigationTitles(lang);
  const cta = formatWhatsAppCta(whatsappUrl, lang);

  const text = `✨ ${s.name[lang]} (${s.code})\n${s.explanation[lang]}${cta}`;

  const buttons: MetaButton[] = [
    ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
    { type: 'postback', title: cat ? cat.name.en.slice(0, 20) : titles.allCategories, payload: `TBW_CAT_${cat.code}` },
    { type: 'postback', title: titles.allCategories, payload: 'TBW_MENU' },
  ].slice(0, 3) as MetaButton[];

  return {
    text,
    button_template: {
      template_type: 'button',
      text: text.slice(0, 640),
      buttons,
    },
  };
}

// -----------------------------------------------------------------------------
// 5. DETERMINISTIC INTENT RESOLVER
// -----------------------------------------------------------------------------

export function resolveCatalogMatch(text: string, activeCategory?: string | null): { type: 'service' | 'category' | 'overview' | 'more_categories'; id?: string } | null {
  const raw = String(text || '').trim();
  const lower = raw.toLowerCase();

  // 1. Explicit Payload Checks & Natural Overview Queries
  const isOverview = lower === 'tbw_menu' ||
    /^(all services|our services|services|menu|main menu|start)$/i.test(lower) ||
    /\b(what services|what are your services|which services|services list|list of services|all services|tell me your services|kya services|kaun si services|services kya hain|kya kya services|services batao|services provide|services do you offer|what do you offer|what do you do)\b/i.test(lower);

  if (isOverview) {
    return { type: 'overview' };
  }
  if (lower === 'tbw_cat_more' || /^(more categories|more services|next)$/i.test(lower)) {
    return { type: 'more_categories' };
  }
  if (/^tbw_cat_([1-4])$/i.test(lower)) {
    const code = lower.match(/^tbw_cat_([1-4])$/i)![1];
    const cat = Object.values(SERVICE_CATEGORIES).find(c => c.code === code);
    return cat ? { type: 'category', id: cat.id } : null;
  }
  if (/^tbw_svc_([1-4])_([1-6])$/i.test(lower)) {
    const match = lower.match(/^tbw_svc_([1-4])_([1-6])$/i)!;
    const code = `${match[1]}.${match[2]}`;
    const s = Object.values(SERVICES_CATALOG).find(svc => svc.code === code);
    return s ? { type: 'service', id: s.id } : null;
  }

  // 2. Exact Code Matches (e.g., "1.1", "2.3", "4.6")
  const codeMatch = lower.match(/^([1-4])\.([1-6])$/);
  if (codeMatch) {
    const code = `${codeMatch[1]}.${codeMatch[2]}`;
    const s = Object.values(SERVICES_CATALOG).find(svc => svc.code === code);
    if (s) return { type: 'service', id: s.id };
  }

  // 3. Single Digit Navigation ("1", "2", "3", "4", "5", "6")
  if (/^[1-6]$/.test(lower)) {
    const num = parseInt(lower, 10);
    // If user is currently browsing an active category, 1-6 maps to that category's services
    if (activeCategory && SERVICE_CATEGORIES[activeCategory]) {
      const cat = SERVICE_CATEGORIES[activeCategory];
      const targetServiceId = cat.serviceIds[num - 1];
      if (targetServiceId && SERVICES_CATALOG[targetServiceId]) {
        return { type: 'service', id: targetServiceId };
      }
    }
    // Otherwise 1-4 maps to Categories 1-4
    if (num >= 1 && num <= 4) {
      const cat = Object.values(SERVICE_CATEGORIES).find(c => c.code === String(num));
      if (cat) return { type: 'category', id: cat.id };
    }
  }

  // 4. Direct Service Name & Alias Matching (Priority for specific 24 services)
  for (const [sId, svc] of Object.entries(SERVICES_CATALOG)) {
    for (const alias of svc.aliases) {
      const aLower = alias.toLowerCase();
      if (/[\u0900-\u097F]/.test(aLower)) {
        if (lower.includes(aLower)) return { type: 'service', id: sId };
      } else {
        const base = (aLower.endsWith('s') && aLower.length > 3) ? aLower.slice(0, -1) : aLower;
        const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(^|[^a-z0-9])${escaped}(s|es)?($|[^a-z0-9])`, 'i');
        if (re.test(lower)) return { type: 'service', id: sId };
      }
    }
  }

  // 5. Category Name & Alias Matching
  for (const [cId, cat] of Object.entries(SERVICE_CATEGORIES)) {
    for (const alias of cat.aliases) {
      const aLower = alias.toLowerCase();
      if (/[\u0900-\u097F]/.test(aLower)) {
        if (lower.includes(aLower)) return { type: 'category', id: cId };
      } else {
        const base = (aLower.endsWith('s') && aLower.length > 3) ? aLower.slice(0, -1) : aLower;
        const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(^|[^a-z0-9])${escaped}(s|es)?($|[^a-z0-9])`, 'i');
        if (re.test(lower)) return { type: 'category', id: cId };
      }
    }
  }

  return null;
}

// -----------------------------------------------------------------------------
// 6. GROUNDED GEMINI SYSTEM CONTEXT (ALL 24 SERVICES)
// -----------------------------------------------------------------------------

export function buildGroundedGeminiContext(): string {
  const lines: string[] = ['OFFICIAL SERVICE CATALOG OF THE BUSINESS WORK (24 SERVICES):'];
  for (const cat of Object.values(SERVICE_CATEGORIES)) {
    lines.push(`\nCATEGORY ${cat.code}: ${cat.name.en}`);
    for (const sid of cat.serviceIds) {
      const s = SERVICES_CATALOG[sid];
      lines.push(`- ${s.name.en} (${s.code}): ${s.shortSummary.en}. ${s.explanation.en}`);
    }
  }
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// 7. MAIN MULTILINGUAL EVALUATION ENGINE
// -----------------------------------------------------------------------------

export function evaluateMultilingualDmResponse(params: {
  rawText: string;
  payload: string;
  isFirstDm: boolean;
  hasBeenWelcomed: boolean;
  campaign?: {
    id: string;
    media_id: string;
    details_text: string;
    initial_message: string;
    follow_required: boolean;
  } | null;
  whatsappUrl: string;
  currentPref?: SupportedLanguage | null;
  activeCategory?: string | null;
}): MultilingualResolution {
  const { rawText, payload, isFirstDm, hasBeenWelcomed, campaign, whatsappUrl, currentPref, activeCategory } = params;

  const raw = String(rawText || '').trim();
  const pl = String(payload || '').trim();
  const lang = detectCustomerLanguage(raw || pl, currentPref);
  const titles = getNavigationTitles(lang);
  const cta = formatWhatsAppCta(whatsappUrl, lang);

  // 1. REEL CAMPAIGN CONTINUATION (Accepts ANY message or supported postback without requiring exact keywords)
  const isCategoryNav = pl.startsWith('TBW_CAT_') || pl.startsWith('TBW_SVC_') || pl === 'TBW_MENU' || pl === 'TBW_LANG_SELECT';
  const isReelPostback = pl === 'TBW_DETAILS' || pl === 'TBW_FOLLOW_CHECK' || pl === 'TBW_FOLLOW_RECHECK' || pl === 'TBW_REEL_DETAILS';
  const wantsCampaignContinuation = campaign && !isCategoryNav && (isReelPostback || raw.length > 0 || pl.length > 0);

  if (campaign && wantsCampaignContinuation) {
    if (campaign.follow_required === true) {
      return {
        action: 'follow_check',
        reply_text: '',
        language: lang,
        is_welcome: false,
      };
    }

    const detailsText = String(campaign.details_text || 'Thanks for your interest! Here are the details you requested.').trim();
    const fullReply = `${detailsText}${cta}`;
    return {
      action: 'fixed',
      reply_text: fullReply,
      language: lang,
      button_template: {
        template_type: 'button',
        text: fullReply.slice(0, 640),
        buttons: [
          ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
          { type: 'postback' as const, title: titles.allCategories, payload: 'TBW_MENU' },
        ].slice(0, 3) as MetaButton[],
      },
      is_welcome: false,
    };
  }

  // 2. REEL CAMPAIGN FIRST INTERACTION
  if (campaign && isFirstDm && !hasBeenWelcomed) {
    const title = String(campaign.initial_message || 'Thanks for commenting on our Reel! 👋').trim();
    const promptText = lang === 'hi'
      ? `${title}\nनीचे दिए गए बटन पर टैप करके डिटेल्स प्राप्त करें:`
      : lang === 'hinglish'
      ? `${title}\nDetails paane ke liye neeche diye gaye button par tap karein:`
      : `${title}\nTap the button below to get full details right away:`;

    const buttons: MetaButton[] = [
      { type: 'postback', title: titles.details, payload: 'TBW_DETAILS' },
      ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
    ];

    return {
      action: 'fixed',
      reply_text: promptText,
      language: lang,
      button_template: {
        template_type: 'button',
        text: promptText.slice(0, 640),
        buttons: buttons.slice(0, 3),
      },
      is_welcome: true,
    };
  }

  // 3. CLINIC SPECIALIZED INQUIRY
  const isClinicQuery = /\b(clinic|hospital|doctor|patient|healthcare|dentist|क्लिनिक|अस्पताल|डॉक्टर|मरीज)\b/i.test(raw);
  if (isClinicQuery) {
    const text = (lang === 'hi'
      ? 'क्लीनिक और डॉक्टरों के लिए हमारे AI एजेंट मरीजों की पूछताछ, अपॉइंटमेंट शेड्यूलिंग और विज़िट रिमाइंडर अपने आप संभालते हैं। इससे फ्रंट डेस्क का समय बचता है और मरीज समय पर आते हैं।'
      : lang === 'hinglish'
      ? 'Clinics aur doctors ke liye humara AI agent patient inquiries, appointment scheduling aur visit reminders automatically manage karta hai. Isse clinic reception ka time bachta hai aur patients ke appointments miss nahi hote.'
      : 'For clinics and healthcare practices, our AI agents handle patient inquiries, appointment scheduling, reminder notifications, and FAQs automatically. This reduces missed appointments and frees up your front-desk staff.') + cta;

    return {
      action: 'fixed',
      reply_text: text,
      language: lang,
      button_template: {
        template_type: 'button',
        text: text.slice(0, 640),
        buttons: [
          ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
          { type: 'postback', title: titles.allCategories, payload: 'TBW_MENU' },
        ].slice(0, 3) as MetaButton[],
      },
      is_welcome: false,
    };
  }

  // 4. PRICING INQUIRY
  const isPricingQuery = /\b(price|pricing|cost|rate|fee|charges|kitna price|kitna kharch|kitne paise|kitna lagega|how much|दाम|कीमत|खर्च)\b/i.test(raw);
  if (isPricingQuery) {
    const text = (lang === 'hi'
      ? 'कीमत आपकी ज़रूरतों और काम के पैमाने पर निर्भर करती है। हम छोटे बिजनेस के लिए बेसिक ऑटोमेशन से लेकर पूरे कस्टमाइज़्ड सिस्टम तक के प्लान देते हैं। क्या आप अनुमानित बजट जानने के लिए WhatsApp पर बात करना चाहेंगे?'
      : lang === 'hinglish'
      ? 'Pricing aapke exact requirements aur business scale par depend karti hai. Hum starter setup se lekar full custom enterprise systems tak tailored solutions provide karte hain. Kya aap quick estimate ke liye WhatsApp par connect karna chahenge?'
      : 'Pricing depends on your specific business requirements and scope of automation. We offer flexible plans ranging from starter setups to custom end-to-end business systems. Would you like to discuss your requirements on WhatsApp for a quick estimate?') + cta;

    return {
      action: 'fixed',
      reply_text: text,
      language: lang,
      button_template: {
        template_type: 'button',
        text: text.slice(0, 640),
        buttons: [
          ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
          { type: 'postback', title: titles.allCategories, payload: 'TBW_MENU' },
        ].slice(0, 3) as MetaButton[],
      },
      is_welcome: false,
    };
  }

  // 5. DETERMINISTIC 24-SERVICE CATALOG & CATEGORY NAVIGATION
  const match = resolveCatalogMatch(pl || raw, activeCategory);
  if (match) {
    if (match.type === 'service' && match.id) {
      const detail = formatServiceDetail(match.id, lang, whatsappUrl);
      const svc = SERVICES_CATALOG[match.id];
      return {
        action: 'fixed',
        reply_text: detail.text,
        language: lang,
        button_template: detail.button_template,
        activeCategory: svc ? svc.categoryId : activeCategory,
        activeService: match.id,
        is_welcome: false,
      };
    }

    if (match.type === 'category' && match.id) {
      const detail = formatCategoryDetail(match.id, lang, whatsappUrl);
      return {
        action: 'fixed',
        reply_text: detail.text,
        language: lang,
        button_template: detail.button_template,
        activeCategory: match.id,
        activeService: null,
        is_welcome: false,
      };
    }

    if (match.type === 'more_categories') {
      const detail = formatMoreCategories(lang, whatsappUrl);
      return {
        action: 'fixed',
        reply_text: detail.text,
        language: lang,
        button_template: detail.button_template,
        activeCategory: null,
        activeService: null,
        is_welcome: false,
      };
    }

    if (match.type === 'overview') {
      const detail = formatCategoryOverview(lang, whatsappUrl);
      return {
        action: 'fixed',
        reply_text: detail.text,
        language: lang,
        button_template: detail.button_template,
        activeCategory: null,
        activeService: null,
        is_welcome: false,
      };
    }
  }

  // 6. CONTACT / CONSULTATION
  const isContactQuery = pl === 'TBW_CONTACT' || /\b(contact|talk to human|speak to someone|call me|book demo|appointment|संपर्क)\b/i.test(raw);
  if (isContactQuery) {
    const text = (lang === 'hi'
      ? 'पर्सनल डेमो, कस्टमाइज़्ड कोटेशन और सलाह के लिए हमारी टीम WhatsApp पर उपलब्ध है।'
      : lang === 'hinglish'
      ? 'Personalized demo, custom quotes aur direct consultation ke liye humari team WhatsApp par readily available hai.'
      : 'For personalized demos, custom quotes, and consultation, our engineering team is readily available on WhatsApp.') + cta;

    return {
      action: 'fixed',
      reply_text: text,
      language: lang,
      button_template: {
        template_type: 'button',
        text: text.slice(0, 640),
        buttons: [
          ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
          { type: 'postback', title: titles.allCategories, payload: 'TBW_MENU' },
        ].slice(0, 3) as MetaButton[],
      },
      is_welcome: false,
    };
  }

  // 7. GREETINGS — WELCOME ONLY ONCE
  const isGreeting = /^(hello|hi|hey|hola|namaste|pranam|good morning|good afternoon|good evening)\b/i.test(raw);

  if (isGreeting || (isFirstDm && !hasBeenWelcomed)) {
    if (!hasBeenWelcomed) {
      const text = lang === 'hi'
        ? 'नमस्ते! 👋 The Business Work में आपका स्वागत है।\nहम AI और स्मार्ट ऑटोमेशन से आपके बिजनेस का समय और पैसे बचाने में मदद करते हैं। नीचे टैप करके जानकारी प्राप्त करें:'
        : lang === 'hinglish'
        ? 'Hello! 👋 The Business Work mein aapka welcome hai.\nHum AI aur smart workflow automations ke zariye aapke business ka time save karne mein help karte hain. Details ke liye neeche tap karein:'
        : 'Hello! 👋 Welcome to The Business Work.\nWe help businesses save time through smart AI and workflow automations. Tap below to get instant details or chat with our team:';

      const buttons: MetaButton[] = [
        { type: 'postback', title: titles.details, payload: 'TBW_DETAILS' },
        { type: 'postback', title: titles.allCategories, payload: 'TBW_MENU' },
        ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
      ];

      return {
        action: 'fixed',
        reply_text: text,
        language: lang,
        button_template: {
          template_type: 'button',
          text: text.slice(0, 640),
          buttons: buttons.slice(0, 3),
        },
        is_welcome: true,
      };
    } else {
      // Returning user greeting
      const text = (lang === 'hi'
        ? 'वापस स्वागत है! 😊 आज हम आपके बिजनेस की किस प्रकार सहायता कर सकते हैं?'
        : lang === 'hinglish'
        ? 'Welcome back! 😊 Aaj hum aapke business ki kaise help kar sakte hain?'
        : 'Welcome back! 😊 How can we assist your business today?') + cta;

      return {
        action: 'fixed',
        reply_text: text,
        language: lang,
        button_template: {
          template_type: 'button',
          text: text.slice(0, 640),
          buttons: [
            { type: 'postback', title: titles.allCategories, payload: 'TBW_MENU' },
            ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
          ].slice(0, 3) as MetaButton[],
        },
        is_welcome: false,
      };
    }
  }

  // 8. COMPLEX QUESTIONS -> ROUTE TO GEMINI WITH GROUNDED 24-SERVICE CONTEXT
  const isComplex = /(integrat|custom|architecture|api|webhook|erp|security|multi.step|database|n8n|migration|specific|technical|scalab|compliance|how can you|how would|जटिल|डेटाबेस|ईआरपी|इंटीग्रेशन|एपीआई|सिस्टम)/i.test(raw) || raw.length > 80;

  if (isComplex) {
    const langInstructions = lang === 'hi'
      ? 'CRITICAL: Answer ONLY in Hindi using Devanagari script. Do not use English script.'
      : lang === 'hinglish'
      ? 'CRITICAL: Answer in natural conversational Hinglish (Roman Hindi). Do not use pure English or Devanagari.'
      : 'CRITICAL: Answer in clear, professional English.';

    const groundedContext = buildGroundedGeminiContext();

    const aiPrompt = `You are the knowledgeable Instagram automation expert for The Business Work.
${langInstructions}

${groundedContext}

Strict Instructions:
1. Provide a direct, practical answer to the customer's question in 2-3 short sentences.
2. Ground strictly on the 24 official services of The Business Work.
3. Preserve key business terms (AI Agent, CRM, WhatsApp, Automation, etc.).
4. Do not invent custom pricing, unverified guarantees, or fake dates.
5. Conclude by naturally offering direct WhatsApp consultation at https://wa.me/917972020292.
Customer Question: "${raw}"`;

    return {
      action: 'ai',
      reply_text: '',
      language: lang,
      aiPrompt,
      is_welcome: false,
    };
  }

  // 9. DEFAULT FALLBACK IN CUSTOMER'S LANGUAGE (NEVER DEFAULT TO WELCOME!)
  const fallbackText = (lang === 'hi'
    ? 'आपके सवाल के लिए धन्यवाद! हम 4 मुख्य श्रेणियों में 24 ऑटोमेशन सेवाएं देते हैं। हमारी सेवाएं देखने के लिए नीचे टैप करें या अपनी ज़रूरत बताएं।'
    : lang === 'hinglish'
    ? 'Aapke question ke liye thanks! Hum 4 categories mein 24 automation services provide karte hain. Services dekhne ke liye neeche tap karein ya requirement share karein.'
    : 'Thanks for your question! We offer 24 automation services across AI Agents, CRM, Workflows, and WhatsApp/Social. Tap below to explore our services or chat with us directly.') + cta;

  return {
    action: 'fixed',
    reply_text: fallbackText,
    language: lang,
    button_template: {
      template_type: 'button',
      text: fallbackText.slice(0, 640),
      buttons: [
        { type: 'postback' as const, title: titles.allCategories, payload: 'TBW_MENU' },
        ...(whatsappUrl ? [{ type: 'web_url' as const, url: whatsappUrl, title: titles.whatsapp }] : []),
      ].slice(0, 3) as MetaButton[],
    },
    is_welcome: false,
  };
}
