import fs from 'fs';

// Let's inspect what istDate generates
const now = Date.now();
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

const todayIST = istDate(0);
const todayLastSlotStartMs = Date.parse(`${todayIST}T21:30:00+05:30`);
const hasTodaySlots = now < todayLastSlotStartMs;
const startOffset = hasTodaySlots ? 0 : 1;
const validDates = Array.from({ length: 6 }, (_, i) => istDate(startOffset + i));

console.log('now:', now, new Date(now).toISOString());
console.log('todayIST:', todayIST);
console.log('todayLastSlotStartMs:', todayLastSlotStartMs);
console.log('hasTodaySlots:', hasTodaySlots);
console.log('validDates:', validDates);

const targetDate = validDates[0];
const cleanDateStr = targetDate.replace(/-/g, '');
const slotId = `tbw_slot_${cleanDateStr}_1000`;
console.log('slotId:', slotId);

const slotMatch = slotId.match(/^tbw_slot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
console.log('slotMatch:', slotMatch);
if (slotMatch) {
  const slotDate = `${slotMatch[1]}-${slotMatch[2]}-${slotMatch[3]}`;
  const h = parseInt(slotMatch[4], 10);
  const m = parseInt(slotMatch[5], 10);
  const startMs = Date.parse(`${slotDate}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+05:30`);
  console.log('startMs:', startMs, new Date(startMs).toISOString());
  console.log('startMs <= now?', startMs <= now);
}
