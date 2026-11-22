// Test script for slot and date parsing logic

function pad(n) {
  return String(n).padStart(2, '0');
}

function safeDate(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    return !isNaN(val.getTime()) ? val : null;
  }
  if (typeof val === 'number') {
    return (!isNaN(val) && isFinite(val) && val > 0) ? new Date(val) : null;
  }
  const str = String(val).trim();
  if (!str) return null;
  // If numeric string (Unix timestamp)
  if (/^\d{10}$/.test(str)) {
    const d = new Date(Number(str) * 1000);
    return !isNaN(d.getTime()) ? d : null;
  }
  if (/^\d{13}$/.test(str)) {
    const d = new Date(Number(str));
    return !isNaN(d.getTime()) ? d : null;
  }
  const parsedMs = Date.parse(str);
  if (!isNaN(parsedMs)) {
    return new Date(parsedMs);
  }
  return null;
}

function safeISO(val) {
  const d = safeDate(val);
  return d ? d.toISOString() : '';
}

function pretty(val) {
  const d = safeDate(val);
  if (!d) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

// Format Date object to IST date string "YYYY-MM-DD"
function formatISTDate(dateObj) {
  const d = safeDate(dateObj);
  if (!d) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

// Parse time string like "5:30 pm", "5:30pm", "17:30", "5:30 pm - 6:00 pm"
function parseTimeString(str) {
  if (!str || typeof str !== 'string') return null;
  // Look for first time pattern: e.g. "5:30 pm" or "17:30" or "05:30 PM"
  const m = str.match(/(\b\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = (m[3] || '').toLowerCase();

  if (min < 0 || min > 59) return null;

  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h < 0 || h > 23) return null;

  return { h, m: min };
}

// Parse appointment slot from input values:
// choiceId, body, defaultDate (e.g. customer.apptDate)
function parseAppointmentSlot(choiceId, body, defaultDate) {
  // 1. Structured slot ID: tbw_slot_YYYYMMDD_HHmm
  const slotMatch = String(choiceId || '').match(/^tbw_slot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
  if (slotMatch) {
    const slotDate = `${slotMatch[1]}-${slotMatch[2]}-${slotMatch[3]}`;
    const h = parseInt(slotMatch[4], 10);
    const m = parseInt(slotMatch[5], 10);
    const startMs = Date.parse(`${slotDate}T${pad(h)}:${pad(m)}:00+05:30`);
    if (!isNaN(startMs)) {
      const endMs = startMs + 30 * 60 * 1000;
      return {
        slotDate,
        startMs,
        starts: new Date(startMs).toISOString(),
        ends: new Date(endMs).toISOString(),
      };
    }
  }

  // 2. ISO date / timestamp in choiceId or body (e.g. "2026-10-26T17:30:00+05:30" or 1793016600)
  const candidateStr = (choiceId || body || '').trim();

  // Check if candidate is Unix timestamp (10 or 13 digits)
  if (/^\d{10}$/.test(candidateStr) || /^\d{13}$/.test(candidateStr)) {
    const d = safeDate(candidateStr);
    if (d) {
      const startMs = d.getTime();
      const endMs = startMs + 30 * 60 * 1000;
      const slotDate = formatISTDate(d);
      return {
        slotDate,
        startMs,
        starts: d.toISOString(),
        ends: new Date(endMs).toISOString(),
      };
    }
  }

  // Check if candidate is full ISO string with date and time
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(candidateStr)) {
    const parsed = Date.parse(candidateStr);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      const startMs = d.getTime();
      const endMs = startMs + 30 * 60 * 1000;
      const slotDate = formatISTDate(d);
      return {
        slotDate,
        startMs,
        starts: d.toISOString(),
        ends: new Date(endMs).toISOString(),
      };
    }
  }

  // 3. Appointment time format: "5:30 pm - 6:00 pm", "5:30 pm", "17:30"
  // Requires a valid defaultDate (customer.apptDate).
  // CRITICAL: Do NOT silently substitute current date if defaultDate is missing!
  const timeInfo = parseTimeString(candidateStr);
  if (timeInfo) {
    if (defaultDate && /^\d{4}-\d{2}-\d{2}$/.test(defaultDate)) {
      const startMs = Date.parse(`${defaultDate}T${pad(timeInfo.h)}:${pad(timeInfo.m)}:00+05:30`);
      if (!isNaN(startMs)) {
        const endMs = startMs + 30 * 60 * 1000;
        return {
          slotDate: defaultDate,
          startMs,
          starts: new Date(startMs).toISOString(),
          ends: new Date(endMs).toISOString(),
        };
      }
    }
    // Time parsed, but defaultDate missing or invalid -> return timeWithMissingDate flag
    return {
      error: 'MISSING_DATE',
      timeInfo
    };
  }

  return null;
}

// Test cases
console.log('--- TEST 1: tbw_slot_20261026_1730 ---');
const t1 = parseAppointmentSlot('tbw_slot_20261026_1730', '', '');
console.log(t1);
console.log('Starts pretty:', pretty(t1?.starts));
console.log('Ends pretty:', pretty(t1?.ends));

console.log('\n--- TEST 2: tbw_slot_20261026_1000 (m=0) ---');
const t2 = parseAppointmentSlot('tbw_slot_20261026_1000', '', '');
console.log(t2);
console.log('Starts pretty:', pretty(t2?.starts));
console.log('Ends pretty:', pretty(t2?.ends));

console.log('\n--- TEST 3: "5:30 pm - 6:00 pm" with defaultDate 2026-10-26 ---');
const t3 = parseAppointmentSlot('', '5:30 pm - 6:00 pm', '2026-10-26');
console.log(t3);
console.log('Starts pretty:', pretty(t3?.starts));
console.log('Ends pretty:', pretty(t3?.ends));

console.log('\n--- TEST 4: "5:30 PM – 6:00 PM" (en-dash) with defaultDate 2026-10-26 ---');
const t4 = parseAppointmentSlot('', '5:30 PM – 6:00 PM', '2026-10-26');
console.log(t4);
console.log('Starts pretty:', pretty(t4?.starts));

console.log('\n--- TEST 5: "5:30 pm" WITHOUT defaultDate (must NOT substitute today) ---');
const t5 = parseAppointmentSlot('', '5:30 pm', '');
console.log(t5);

console.log('\n--- TEST 6: Unix timestamp 1793016600 (seconds) ---');
const t6 = parseAppointmentSlot('', '1793016600', '');
console.log(t6);
console.log('Starts pretty:', pretty(t6?.starts));

console.log('\n--- TEST 7: ISO date "2026-10-26T17:30:00+05:30" ---');
const t7 = parseAppointmentSlot('', '2026-10-26T17:30:00+05:30', '');
console.log(t7);
console.log('Starts pretty:', pretty(t7?.starts));

console.log('\n--- TEST 8: Malformed / invalid date ---');
console.log('safeDate("random"):', safeDate("random"));
console.log('safeISO("random"):', safeISO("random"));
console.log('pretty("random"):', pretty("random"));
console.log('pretty(null):', pretty(null));
console.log('pretty(undefined):', pretty(undefined));
