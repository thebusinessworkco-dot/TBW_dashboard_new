import fs from 'fs';
import vm from 'vm';

console.log('Testing complete fixes...');

// Let's test the IF condition expression
function testIfCondition(adminAlertPayload) {
  const json = { adminAlertPayload };
  return Boolean(json.adminAlertPayload && typeof json.adminAlertPayload === 'object' && json.adminAlertPayload.messaging_product === 'whatsapp' && json.adminAlertPayload.to);
}

console.log('Condition with null:', testIfCondition(null)); // MUST be false
console.log('Condition with undefined:', testIfCondition(undefined)); // MUST be false
console.log('Condition with empty obj:', testIfCondition({})); // MUST be false
console.log('Condition with valid payload:', testIfCondition({ messaging_product: 'whatsapp', to: '918604600292', type: 'text' })); // MUST be true

if (testIfCondition(null) !== false || testIfCondition({}) !== false || testIfCondition({ messaging_product: 'whatsapp', to: '918604600292' }) !== true) {
  throw new Error('IF condition check failed!');
}
console.log('IF condition tests PASSED!\n');

// Test confirmSlotId generation and parsing
const slotDate = '2026-10-26';
const startHour = 18;
const startMin = 30;
const confirmSlotId = `tbw_appt_confirm_${slotDate.replace(/-/g, '')}_${String(startHour).padStart(2,'0')}${String(startMin).padStart(2,'0')}`;
console.log('Generated confirmSlotId:', confirmSlotId);

const idMatch = confirmSlotId.match(/^tbw_appt_confirm_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
if (!idMatch) throw new Error('ID regex failed!');
const parsedDate = `${idMatch[1]}-${idMatch[2]}-${idMatch[3]}`;
const parsedH = Number(idMatch[4]);
const parsedM = Number(idMatch[5]);
console.log('Parsed slot:', { parsedDate, parsedH, parsedM });
if (parsedDate !== '2026-10-26' || parsedH !== 18 || parsedM !== 30) {
  throw new Error('Parsed slot mismatch!');
}
console.log('Slot encoding and parsing tests PASSED!\n');
