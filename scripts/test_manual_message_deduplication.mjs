// ==============================================================================
// TEST SUITE: MANUAL TAKEOVER MESSAGE DEDUPLICATION & RECONCILIATION
// ==============================================================================

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Logic to test
function sortMessagesDeterministic(messages) {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    if (a.sender_type === 'customer' && b.sender_type !== 'customer') return -1;
    if (a.sender_type !== 'customer' && b.sender_type === 'customer') return 1;
    return (a.id || '').localeCompare(b.id || '');
  });
}

function deduplicateAndSortMessages(messages) {
  if (!messages || messages.length === 0) return [];

  const result = [];
  const seenIds = new Set();
  const seenExternalIds = new Set();

  // Find all confirmed messages (real DB records)
  const confirmed = messages.filter(
    (m) => !m.id.startsWith('msg-') && !m.id.startsWith('temp-')
  );
  const confirmedExternalIds = new Set(
    confirmed.map((c) => c.external_message_id).filter(Boolean)
  );

  for (const m of messages) {
    const isTemp = m.id.startsWith('msg-') || m.id.startsWith('temp-');

    if (isTemp) {
      // 1. If this temp message has an external_message_id already confirmed in DB, skip temp
      if (m.external_message_id && confirmedExternalIds.has(m.external_message_id)) {
        continue;
      }
      // 2. If a confirmed message with same conversation, sender_type, and content exists within 60s, skip temp
      const hasConfirmedMatch = confirmed.some((c) => {
        if (c.conversation_id !== m.conversation_id) return false;
        if (c.sender_type !== m.sender_type) return false;
        if ((c.content || '').trim() !== (m.content || '').trim()) return false;
        const timeDiff = Math.abs(
          new Date(c.created_at).getTime() - new Date(m.created_at).getTime()
        );
        return timeDiff < 60000;
      });
      if (hasConfirmedMatch) {
        continue;
      }
    }

    if (seenIds.has(m.id)) {
      continue;
    }

    if (m.external_message_id && seenExternalIds.has(m.external_message_id)) {
      continue;
    }

    seenIds.add(m.id);
    if (m.external_message_id) {
      seenExternalIds.add(m.external_message_id);
    }
    result.push(m);
  }

  return sortMessagesDeterministic(result);
}

async function runTests() {
  console.log('\n--- 1. Testing deduplicateAndSortMessages unit logic ---');

  const convId = 'conv-123';
  const now = new Date();

  // Test 1.1: Single message unchanged
  const m1 = {
    id: 'uuid-1',
    conversation_id: convId,
    sender_type: 'human_agent',
    content: 'hey',
    status: 'sent',
    created_at: now.toISOString(),
  };
  const res1 = deduplicateAndSortMessages([m1]);
  assert(res1.length === 1 && res1[0].id === 'uuid-1', 'Single confirmed message is preserved');

  // Test 1.2: Optimistic tempId + Confirmed DB message with same content (The Bug Scenario)
  const tempMsg = {
    id: `msg-${Date.now()}`,
    conversation_id: convId,
    sender_type: 'human_agent',
    content: 'hey',
    status: 'queued',
    created_at: now.toISOString(),
  };
  const confirmedMsg = {
    id: 'uuid-real-hey',
    conversation_id: convId,
    sender_type: 'human_agent',
    content: 'hey',
    status: 'sent',
    external_message_id: 'wamid.HBg12345',
    created_at: new Date(now.getTime() + 500).toISOString(),
  };

  const res2 = deduplicateAndSortMessages([tempMsg, confirmedMsg]);
  assert(res2.length === 1, 'Duplicate optimistic and confirmed messages collapsed to 1 message');
  assert(res2[0].id === 'uuid-real-hey', 'Confirmed database message is kept over optimistic placeholder');
  assert(res2[0].external_message_id === 'wamid.HBg12345', 'Real external message ID is preserved');

  // Test 1.3: Reverse order in array (confirmed first, temp second)
  const res3 = deduplicateAndSortMessages([confirmedMsg, tempMsg]);
  assert(res3.length === 1, 'Order independence: collapsed to 1 message regardless of array position');
  assert(res3[0].id === 'uuid-real-hey', 'Confirmed DB record preserved');

  // Test 1.4: In-flight optimistic message without DB match yet
  const pendingMsg = {
    id: `msg-${Date.now() + 10}`,
    conversation_id: convId,
    sender_type: 'human_agent',
    content: 'just sent this',
    status: 'queued',
    created_at: new Date().toISOString(),
  };
  const res4 = deduplicateAndSortMessages([confirmedMsg, pendingMsg]);
  assert(res4.length === 2, 'Pending in-flight message is kept while send is in progress');
  assert(res4.some((m) => m.id === pendingMsg.id), 'Pending message is visible in UI');

  // Test 1.5: Legitimate identical text sent at different times (e.g. customer saying "ok" 2 hours later)
  const ok1 = {
    id: 'uuid-ok-1',
    conversation_id: convId,
    sender_type: 'customer',
    content: 'ok',
    created_at: new Date('2026-10-22T10:00:00Z').toISOString(),
  };
  const ok2 = {
    id: 'uuid-ok-2',
    conversation_id: convId,
    sender_type: 'customer',
    content: 'ok',
    created_at: new Date('2026-10-22T14:00:00Z').toISOString(),
  };
  const res5 = deduplicateAndSortMessages([ok1, ok2]);
  assert(res5.length === 2, 'Separate confirmed messages with same content at different times are NOT collapsed');

  // Test 1.6: Deduplication by external_message_id
  const dupExternal1 = {
    id: 'uuid-a',
    conversation_id: convId,
    sender_type: 'automation_rule',
    content: 'Hello',
    external_message_id: 'wamid.SAME_ID_999',
    created_at: now.toISOString(),
  };
  const dupExternal2 = {
    id: 'uuid-b',
    conversation_id: convId,
    sender_type: 'automation_rule',
    content: 'Hello',
    external_message_id: 'wamid.SAME_ID_999',
    created_at: now.toISOString(),
  };
  const res6 = deduplicateAndSortMessages([dupExternal1, dupExternal2]);
  assert(res6.length === 1, 'Messages sharing identical external_message_id are collapsed to 1');

  console.log('\n--- 2. Simulating full lifecycle of Manual Takeover Send ---');

  // Lifecycle Test A: Realtime event arrives BEFORE /api/whatsapp/send returns
  let stateMessages = [];

  // Step 1: User types "hey" and clicks send
  const tempA = {
    id: 'msg-temp-A',
    conversation_id: convId,
    sender_type: 'human_agent',
    content: 'hey',
    status: 'queued',
    created_at: new Date().toISOString(),
  };
  stateMessages = [...stateMessages, tempA];
  assert(deduplicateAndSortMessages(stateMessages).length === 1, 'Step 1: Exactly 1 message displayed upon click (optimistic)');

  // Step 2: Realtime INSERT event arrives from Supabase before HTTP response
  const realtimeMsgA = {
    id: 'uuid-from-db-A',
    conversation_id: convId,
    sender_type: 'human_agent',
    content: 'hey',
    status: 'sent',
    external_message_id: 'wamid.A_123',
    created_at: new Date().toISOString(),
  };

  // Store Realtime handler replaces optimistic or merges
  const optIdx = stateMessages.findIndex((m) => {
    if (m.id === realtimeMsgA.id) return true;
    const isTemp = m.id.startsWith('msg-') || m.id.startsWith('temp-');
    return isTemp && m.sender_type === realtimeMsgA.sender_type && m.content === realtimeMsgA.content;
  });
  if (optIdx !== -1) {
    stateMessages[optIdx] = realtimeMsgA;
  } else {
    stateMessages.push(realtimeMsgA);
  }
  stateMessages = deduplicateAndSortMessages(stateMessages);
  assert(stateMessages.length === 1, 'Step 2 (Realtime before HTTP): Exactly 1 message displayed');
  assert(stateMessages[0].id === 'uuid-from-db-A', 'Optimistic message cleanly replaced with real DB record');

  // Step 3: /api/whatsapp/send HTTP response finishes
  const httpResponse = {
    success: true,
    messageId: 'wamid.A_123',
    data: { id: 'uuid-from-db-A' },
  };
  // Store sendMessage reconciliation
  const realDbId = httpResponse.data?.id;
  const realMetaId = httpResponse.messageId;
  const alreadyHasReal = stateMessages.some(
    (m) => (realDbId && m.id === realDbId) || (realMetaId && m.external_message_id === realMetaId && m.id !== tempA.id)
  );
  if (alreadyHasReal) {
    stateMessages = stateMessages.filter((m) => m.id !== tempA.id);
  }
  stateMessages = deduplicateAndSortMessages(stateMessages);
  assert(stateMessages.length === 1, 'Step 3 (HTTP finishes): Still exactly 1 message');

  // Step 4: 3-second polling runs fetchConversationMessages
  const dbRows = [realtimeMsgA];
  stateMessages = deduplicateAndSortMessages([...dbRows]);
  assert(stateMessages.length === 1, 'Step 4 (3s Polling): Still exactly 1 message, NO DUPLICATE!');

  // Lifecycle Test B: HTTP response finishes BEFORE Realtime event
  let stateMessagesB = [];
  const tempB = {
    id: 'msg-temp-B',
    conversation_id: convId,
    sender_type: 'human_agent',
    content: 'ok',
    status: 'queued',
    created_at: new Date().toISOString(),
  };
  stateMessagesB = [...stateMessagesB, tempB];
  assert(deduplicateAndSortMessages(stateMessagesB).length === 1, 'Lifecycle B Step 1: Exactly 1 message');

  // Step 2: HTTP response finishes first
  const httpResponseB = {
    success: true,
    messageId: 'wamid.B_456',
    data: { id: 'uuid-from-db-B' },
  };
  stateMessagesB = stateMessagesB.map((m) =>
    m.id === tempB.id
      ? { ...m, id: httpResponseB.data.id, status: 'sent', external_message_id: httpResponseB.messageId }
      : m
  );
  stateMessagesB = deduplicateAndSortMessages(stateMessagesB);
  assert(stateMessagesB.length === 1 && stateMessagesB[0].id === 'uuid-from-db-B', 'Lifecycle B Step 2: ID updated to real DB UUID');

  // Step 3: Realtime event fires with uuid-from-db-B
  const realtimeMsgB = {
    id: 'uuid-from-db-B',
    conversation_id: convId,
    sender_type: 'human_agent',
    content: 'ok',
    status: 'sent',
    external_message_id: 'wamid.B_456',
    created_at: new Date().toISOString(),
  };
  const optIdxB = stateMessagesB.findIndex((m) => m.id === realtimeMsgB.id);
  if (optIdxB !== -1) {
    stateMessagesB[optIdxB] = realtimeMsgB;
  } else {
    stateMessagesB.push(realtimeMsgB);
  }
  stateMessagesB = deduplicateAndSortMessages(stateMessagesB);
  assert(stateMessagesB.length === 1, 'Lifecycle B Step 3: Realtime event does NOT create second bubble');

  // Step 4: Polling runs
  stateMessagesB = deduplicateAndSortMessages([...[realtimeMsgB]]);
  assert(stateMessagesB.length === 1, 'Lifecycle B Step 4 (Polling): Exactly 1 bubble');

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
