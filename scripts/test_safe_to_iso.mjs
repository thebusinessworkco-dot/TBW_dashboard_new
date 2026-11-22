function toISO(date, h, min) {
  if (!date) return '';
  const hNum = Number(h) || 0;
  const mNum = Number(min) || 0;
  const baseMs = Date.parse(`${date}T${String(hNum).padStart(2, '0')}:00:00+05:30`);
  if (isNaN(baseMs)) return '';
  const targetMs = baseMs + mNum * 60000;
  const d = new Date(targetMs);
  return !isNaN(d.getTime()) ? d.toISOString() : '';
}

console.log('17:30 =>', toISO('2026-10-26', 17, 30));
console.log('17:60 (m + 30) =>', toISO('2026-10-26', 17, 60));
console.log('23:60 rollover =>', toISO('2026-10-26', 23, 60));
console.log('invalid date =>', toISO('invalid', 17, 30));
console.log('null date =>', toISO(null, 17, 30));
