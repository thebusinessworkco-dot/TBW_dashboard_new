// Test WhatsApp Webhook and Send endpoints locally
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- Testing WhatsApp API Endpoints ---');

  // Test 1: GET /api/whatsapp/webhook with wrong token
  try {
    const res1 = await fetch(`${BASE_URL}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=123456`);
    console.log(`Test 1 (GET webhook wrong token): Status ${res1.status} (Expected 403) -> ${res1.status === 403 ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    console.error('Test 1 error:', e.message);
  }

  // Test 2: POST /api/whatsapp/send without live credentials
  try {
    const res2 = await fetch(`${BASE_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: '919876543210',
        content: 'Test automated dispatch check',
      }),
    });
    const data2 = await res2.json();
    console.log(`Test 2 (POST send without token): Status ${res2.status} (Expected 503) -> ${res2.status === 503 ? 'PASS' : 'FAIL'}`);
    console.log(`Test 2 error message: "${data2.error}"`);
    console.log(`Test 2 no dummy wamid simulated: ${!data2.messageId?.includes('simulated') ? 'PASS' : 'FAIL'}`);
  } catch (e) {
    console.error('Test 2 error:', e.message);
  }

  // Test 3: POST /api/n8n/webhook takeover check
  try {
    const res3 = await fetch(`${BASE_URL}/api/n8n/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'check_takeover',
        phone: '919876543210',
      }),
    });
    const data3 = await res3.json();
    console.log(`Test 3 (POST n8n check_takeover): Status ${res3.status} -> ${res3.status === 200 || res3.status === 503 ? 'PASS' : 'FAIL'}`);
    console.log('Test 3 response:', data3);
  } catch (e) {
    console.error('Test 3 error:', e.message);
  }

  console.log('--- Finished Endpoint Tests ---');
}

runTests();
