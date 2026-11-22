// Unit tests for Language node appointment logic
function buildLanguageNodeLogic(now, mockMsg, mockSession = {}, mockGlobalMem = {}) {
  const raw = { messages: [mockMsg] };
  if (Array.isArray(raw.statuses) && raw.statuses.length) return { result: [] };
  if (raw.entry?.[0]?.changes?.[0]?.value?.statuses?.length) return { result: [] };
  const msg = raw.messages?.[0] ?? raw.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg?.from || !['text','interactive','button'].includes(msg.type)) return { result: [] };

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
  }
  const phone = String(msg.from).replace(/\D/g, '');
  if (!phone || (!body && !choiceId)) return { result: [] };

  const mem = mockGlobalMem;
  mem.sessions ??= {};
  mem.confirmedBookingKeys ??= {};
  mem.processedMsgIds ??= [];

  // Idempotency: skip already-processed WhatsApp message IDs
  if (msg.id && mem.processedMsgIds.includes(msg.id)) return { result: [], skipped: true, reason: 'duplicate_msg_id' };
  if (msg.id) {
    mem.processedMsgIds.push(msg.id);
    if (mem.processedMsgIds.length > 500) mem.processedMsgIds.shift();
  }

  const SESSION_TIMEOUT_MS = 20 * 60 * 1000;
  let s = mem.sessions[phone] || mockSession;
  const expired = !!s && now - (s.updated || 0) >= SESSION_TIMEOUT_MS;
  const newSession = !s || s.stage === 'closed' || expired;
  if (newSession) s = { stage: 'intent', language: 'english', name: '', business: '', service: '', purpose: '', history: [], page: 0 };
  s.updated = now;
  if (msg.id) s.lastMsgId = msg.id;

  // Real Asia/Kolkata IST date helper
  function istDate(offsetDays = 0) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date(now + offsetDays * 86400000));
    const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }

  // Today in IST
  const todayIST = istDate(0);
  // Last 30-min slot is 21:30 - 22:00 IST
  const todayLastSlotTime = Date.parse(`${todayIST}T21:30:00+05:30`);
  // If current IST time has passed today's last slot (21:30), today has 0 slots remaining!
  const hasTodaySlots = now < todayLastSlotTime;
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
      hour12: true
    }).format(new Date(iso));
  }

  let reply = '';
  let menu = 'text';
  let action = 'normal';

  function dateMenu(customMsg) {
    menu = 'date';
    reply = customMsg || 'Select an appointment date (IST).';
  }

  const normal = body.toLowerCase();
  const isEnd = choiceId === 'tbw_end_chat' || ['close','end chat','end','stop','bye','exit','band'].includes(normal);

  // --- SELF-HEALING ACTION-FIRST PARSING ---
  // 1. Direct Time Slot Selection: tbw_slot_YYYYMMDD_HHMM
  if (/^tbw_slot_\d{8}_\d{4}$/.test(choiceId)) {
    const parts = choiceId.match(/^tbw_slot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
    const slotDate = `${parts[1]}-${parts[2]}-${parts[3]}`;
    const h = Number(parts[4]);
    const m = Number(parts[5]);
    const starts = toISO(slotDate, h, m);
    const startMs = Date.parse(starts);

    if (!validDates.includes(slotDate) || h < 10 || h > 21 || ![0, 30].includes(m) || startMs <= now || mem.confirmedBookingKeys[`${phone}|${starts}`]) {
      s.stage = 'appt_date';
      dateMenu('That time slot has passed or is unavailable. Please select another date:');
    } else {
      s.apptDate = slotDate;
      s.apptStart = starts;
      s.apptEnd = new Date(startMs + 30 * 60000).toISOString();
      s.stage = 'appt_confirm';
      menu = 'confirm';
      reply = `Book a 30-minute appointment on ${pretty(starts)} (IST)?`;
    }
  }
  // 2. Direct Date Selection: tbw_date_YYYY-MM-DD
  else if (choiceId.startsWith('tbw_date_')) {
    const chosenDate = choiceId.slice(9);
    if (validDates.includes(chosenDate)) {
      s.apptDate = chosenDate;
      s.page = 0;
      s.stage = 'appt_time';
      action = 'check_day';
      reply = 'Checking available times in Google Calendar...';
    } else {
      s.stage = 'appt_date';
      dateMenu(`Date ${chosenDate} has no remaining slots or has passed. Please choose an upcoming date:`);
    }
  }
  // 3. Confirm Booking Click
  else if (choiceId === 'tbw_appt_confirm') {
    if (!s.apptStart || !validDates.includes(s.apptDate) || Date.parse(s.apptStart) <= now) {
      s.stage = 'appt_date';
      dateMenu('Your previous slot selection has expired. Please choose a new date:');
    } else if (mem.confirmedBookingKeys[`${phone}|${s.apptStart}`]) {
      s.stage = 'appt_date';
      dateMenu('You already have an appointment booked for this time. Please select another date:');
    } else {
      s.stage = 'appt_processing';
      action = 'book';
      reply = 'Confirming booking...';
    }
  }
  // 4. Change Date Click
  else if (choiceId === 'tbw_appt_change_date') {
    s.stage = 'appt_date';
    dateMenu();
  }
  // 5. Pagination
  else if (/^tbw_page_\d+$/.test(choiceId)) {
    s.page = Math.min(10, Math.max(0, Number(choiceId.split('_').at(-1))));
    action = 'check_day';
    reply = 'Checking available times...';
  }
  // 6. Normal stage machine transitions
  else if (newSession) {
    menu = 'intent';
    reply = 'Welcome to The Business Work! 👋\nHow can we help you today?';
  } else if (isEnd) {
    reply = 'Thank you for contacting The Business Work. Your chat is now closed. 👋';
    s.stage = 'closed';
  } else if (choiceId === 'tbw_restart' || ['menu','main menu','start over'].includes(normal)) {
    s.stage = 'intent';
    menu = 'intent';
    reply = 'How can we help you today?';
  } else if (s.stage === 'intent') {
    if (choiceId === 'tbw_intent_appointment' || ['appointment','book appointment','book a call'].includes(normal)) {
      if (s.name && s.name.length >= 2) {
        s.stage = 'appt_date';
        dateMenu(`Sure ${s.name}! Please select an appointment date (IST).`);
      } else {
        s.stage = 'appt_name';
        reply = 'Sure! What is your name?';
      }
    } else {
      menu = 'intent';
      reply = 'Please choose Appointment or Services below.';
    }
  } else if (s.stage === 'appt_name') {
    if (body.length < 2 || body.startsWith('(customer sent')) {
      reply = 'Please type your name.';
    } else {
      s.name = body.slice(0, 100);
      s.stage = 'appt_date';
      dateMenu();
    }
  } else if (s.stage === 'appt_date') {
    // If user typed a date like 2026-10-25
    if (validDates.includes(body)) {
      s.apptDate = body;
      s.page = 0;
      s.stage = 'appt_time';
      action = 'check_day';
      reply = 'Checking available times in Google Calendar...';
    } else {
      dateMenu();
    }
  } else if (s.stage === 'appt_time') {
    action = 'check_day';
    reply = 'Checking available times...';
  } else if (s.stage === 'appt_confirm') {
    menu = 'confirm';
    reply = `Confirm appointment for ${pretty(s.apptStart)} (IST)?`;
  } else if (s.stage === 'appt_processing') {
    reply = 'Your booking is being processed. Please wait a moment, or type MENU to start again.';
  }

  mem.sessions[phone] = s;
  return { phone, reply, action, stage: s.stage, apptDate: s.apptDate, apptStart: s.apptStart, validDates, hasTodaySlots };
}

// RUN TESTS:
// Test 1: At 11:00 PM IST on Oct 24, 2026 (23:00 IST = 17:30 UTC)
const now11PM = new Date('2026-10-24T17:30:00Z').getTime();
const res1 = buildLanguageNodeLogic(now11PM, { type: 'interactive', from: '918604600292', interactive: { list_reply: { id: 'tbw_intent_appointment', title: 'Book Appointment' } } });
console.log('Test 1 (11 PM IST validDates):', res1.validDates);
console.log('Test 1 includes today (2026-10-24):', res1.validDates.includes('2026-10-24'));

// Test 2: User clicks slot directly when stage was appt_date
const sessionApptDate = { stage: 'appt_date', name: 'Anan' };
const res2 = buildLanguageNodeLogic(now11PM, { type: 'interactive', from: '918604600292', interactive: { list_reply: { id: 'tbw_slot_20261025_1000', title: '10:00 am - 10:30 am' } } }, sessionApptDate);
console.log('Test 2 (Slot click while in appt_date): Stage =', res2.stage, '| apptDate =', res2.apptDate, '| reply =', res2.reply);

// Test 3: User clicks slot directly when stage was intent
const sessionIntent = { stage: 'intent', name: 'Anan' };
const res3 = buildLanguageNodeLogic(now11PM, { type: 'interactive', from: '918604600292', interactive: { list_reply: { id: 'tbw_slot_20261025_1000', title: '10:00 am - 10:30 am' } } }, sessionIntent);
console.log('Test 3 (Slot click while in intent): Stage =', res3.stage, '| apptDate =', res3.apptDate, '| reply =', res3.reply);

// Test 4: User selects expired date 2026-10-24 at 11 PM
const res4 = buildLanguageNodeLogic(now11PM, { type: 'interactive', from: '918604600292', interactive: { list_reply: { id: 'tbw_date_2026-10-24', title: 'Today' } } }, sessionApptDate);
console.log('Test 4 (Select expired date at 11 PM): Stage =', res4.stage, '| reply =', res4.reply);

// Test 5: At 2:00 PM IST on Oct 24, 2026 (14:00 IST = 08:30 UTC)
const now2PM = new Date('2026-10-24T08:30:00Z').getTime();
const res5 = buildLanguageNodeLogic(now2PM, { type: 'interactive', from: '918604600292', interactive: { list_reply: { id: 'tbw_intent_appointment', title: 'Book Appointment' } } });
console.log('Test 5 (2 PM IST validDates):', res5.validDates);
console.log('Test 5 includes today (2026-10-24):', res5.validDates.includes('2026-10-24'));
