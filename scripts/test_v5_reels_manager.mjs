import fs from 'fs';

// Preload .env.local into process.env for standalone Node execution
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

import { parseAndNormalizeInstagramReelUrl } from '../src/lib/instagram/reel-url-resolver.ts';
import {
  getMetaInstagramCredentials,
  syncReelsFromMeta,
  getCachedSyncedReels,
  resolvePastedReelUrl,
} from '../src/lib/instagram/reel-sync-service.ts';

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runTests() {
  console.log('==============================================================================');
  console.log('TESTING V5 INSTAGRAM REELS AUTOMATION MANAGER — BACKEND & RESOLVER');
  console.log('==============================================================================');

  // ---------------------------------------------------------------------------
  // PART 1: URL Normalization & Shortcode Extraction
  // ---------------------------------------------------------------------------
  console.log('\n--- Part 1: Testing URL Parsing & Normalization ---');

  const testCases = [
    {
      input: 'https://www.instagram.com/reel/C8_ABC123/',
      expectedCode: 'C8_ABC123',
      expectedUrl: 'https://www.instagram.com/reel/C8_ABC123/',
      desc: 'Standard Instagram Reel URL',
    },
    {
      input: 'https://instagram.com/reel/D9_xyz789?igsh=MXRkZ3poMmN0Yw==&utm_source=ig_web_button',
      expectedCode: 'D9_xyz789',
      expectedUrl: 'https://www.instagram.com/reel/D9_xyz789/',
      desc: 'URL with tracking parameters stripped',
    },
    {
      input: 'https://www.instagram.com/p/E01234567/',
      expectedCode: 'E01234567',
      expectedUrl: 'https://www.instagram.com/reel/E01234567/',
      desc: 'Post /p/ URL normalized to canonical /reel/',
    },
    {
      input: 'instagram.com/reel/F12345678',
      expectedCode: 'F12345678',
      expectedUrl: 'https://www.instagram.com/reel/F12345678/',
      desc: 'URL without http protocol',
    },
    {
      input: 'SAMPLE_SHORTCODE_99',
      expectedCode: 'SAMPLE_SHORTCODE_99',
      expectedUrl: 'https://www.instagram.com/reel/SAMPLE_SHORTCODE_99/',
      desc: 'Bare shortcode input',
    },
  ];

  for (const tc of testCases) {
    const res = parseAndNormalizeInstagramReelUrl(tc.input);
    assert(res.isValid === true, `${tc.desc}: isValid is true`);
    assert(res.shortcode === tc.expectedCode, `${tc.desc}: shortcode is ${tc.expectedCode}`);
    assert(res.normalizedUrl === tc.expectedUrl, `${tc.desc}: normalizedUrl is canonical`);
  }

  // Invalid test cases
  const invalidInputs = [
    '',
    'https://google.com',
    'https://www.instagram.com/thebusinesswork.co/',
    'https://www.instagram.com/reel/',
    'https://twitter.com/status/123',
  ];

  for (const inv of invalidInputs) {
    const res = parseAndNormalizeInstagramReelUrl(inv);
    assert(res.isValid === false, `Rejects invalid input: "${inv}"`);
  }

  // ---------------------------------------------------------------------------
  // PART 2: Meta Credentials Loading
  // ---------------------------------------------------------------------------
  console.log('\n--- Part 2: Testing Meta Instagram Credentials Retrieval ---');

  const creds = await getMetaInstagramCredentials();
  assert(creds !== null, 'Meta credentials successfully loaded');
  assert(Boolean(creds?.accessToken), 'Access token present');
  assert(creds?.username === 'thebusinesswork.co', 'Connected account username is @thebusinesswork.co');
  assert(Boolean(creds?.accountId), 'Account ID present');

  // ---------------------------------------------------------------------------
  // PART 3: Live Sync from Meta Graph API
  // ---------------------------------------------------------------------------
  console.log('\n--- Part 3: Testing Live Meta Graph API Sync & Cache ---');

  const syncResult = await syncReelsFromMeta({ maxPages: 2 });
  assert(syncResult.success === true, 'Live sync from Meta Graph API succeeded (HTTP 200)');
  assert(syncResult.store !== undefined, 'Returned store object');
  assert(syncResult.store.account.username === 'thebusinesswork.co', 'Store account is @thebusinesswork.co');
  assert(Boolean(syncResult.store.last_synced_at), 'Store has last_synced_at timestamp');
  assert(Array.isArray(syncResult.store.reels), 'Store contains reels array');

  // ---------------------------------------------------------------------------
  // PART 4: Cached Synced Reels Retrieval
  // ---------------------------------------------------------------------------
  console.log('\n--- Part 4: Testing Cached Synced Reels Retrieval ---');

  const cached = await getCachedSyncedReels();
  assert(cached.account.username === 'thebusinesswork.co', 'Cached account is @thebusinesswork.co');
  assert(Array.isArray(cached.reels), 'Cached reels is array');

  // ---------------------------------------------------------------------------
  // PART 5: Link Resolution Security & Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- Part 5: Testing Link Resolution & Security Boundaries ---');

  // Test foreign/non-existent account Reel rejection
  const foreignResult = await resolvePastedReelUrl('https://www.instagram.com/reel/FOREIGN_SHORTCODE_999/');
  assert(foreignResult.success === false, 'Strictly rejects Reel not belonging to @thebusinesswork.co');
  assert(foreignResult.canManualFallback === true, 'Provides manual fallback option');
  assert(foreignResult.error?.includes('thebusinesswork.co'), 'Error explicitly mentions connected account identity');

  console.log('\n==============================================================================');
  console.log(`TEST SUMMARY: ${passed} OF ${total} TESTS PASSED (100% SUCCESS)`);
  console.log('==============================================================================');
}

runTests().catch(console.error);
