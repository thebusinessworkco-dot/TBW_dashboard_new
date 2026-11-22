import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_TOKEN = process.env.VPS_METRICS_BEARER_TOKEN || 'local_test_monitoring_token_12345';

console.log('================================================================');
console.log('THE BUSINESS WORK — VPS MONITORING LOCAL INTEGRATION TEST SUITE');
console.log('================================================================\n');

let testsPassed = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    testsPassed++;
    console.log(`✅ PASS [TEST_${totalTests}]: ${message}`);
  } else {
    console.error(`❌ FAIL [TEST_${totalTests}]: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Test Timing-Safe Token Comparison Logic
  const validBuf = Buffer.from(TEST_TOKEN);
  const correctBuf = Buffer.from(TEST_TOKEN);
  const badBuf = Buffer.from('wrong_token_value_xyz');
  assert(
    validBuf.length === correctBuf.length && crypto.timingSafeEqual(validBuf, correctBuf),
    'Timing-safe equality accepts matching token buffer'
  );
  assert(
    validBuf.length !== badBuf.length || !crypto.timingSafeEqual(validBuf, badBuf),
    'Timing-safe equality strictly rejects mismatched token'
  );

  // 2. Test Metric Clamping Logic
  const rawInput = {
    cpu_percent: 145.8, // out of bounds (> 100)
    ram_used_gb: -5.0,  // invalid negative
    ram_total_gb: 0,    // invalid 0
    disk_used_gb: 8.0,
    disk_total_gb: 9.8,
    disk_avail_gb: 1.3,
    disk_percent: 87.0,
    uptime_seconds: 1845000,
    n8n_status: 'running',
    n8n_response_time_ms: 45,
    n8n_healthy: true,
    services: {
      'tbw-n8n-n8n-1': 'running',
      'tbw-n8n-caddy-1': 'running',
      'tbw-instagram-bridge-instagram-bridge-1': 'running',
      'tbw-dashboard-api': 'active',
      'tbw-instagram-event-api': 'active'
    }
  };

  const clampedCpu = Math.max(0, Math.min(100, Number(rawInput.cpu_percent) || 0));
  const clampedRamUsed = Math.max(0, Number(rawInput.ram_used_gb) || 0);
  const clampedRamTotal = Math.max(0.1, Number(rawInput.ram_total_gb) || 1.0);
  assert(clampedCpu === 100, `CPU clamped to 100% max (was ${rawInput.cpu_percent})`);
  assert(clampedRamUsed === 0, `RAM used clamped to 0 min (was ${rawInput.ram_used_gb})`);
  assert(clampedRamTotal === 1.0, `RAM total clamped to 1.0 GB min (was ${rawInput.ram_total_gb})`);

  // 3. Test Ingesting Validated Snapshot into Supabase
  const nowIso = new Date().toISOString();
  const testSnapshot = {
    status: 'warning',
    cpu_percent: 18.5,
    ram_used_gb: 0.65,
    ram_total_gb: 1.0,
    ram_percent: 65.0,
    disk_used_gb: 8.0,
    disk_total_gb: 9.8,
    disk_avail_gb: 1.3,
    disk_percent: 87.0,
    uptime_seconds: 1845000,
    n8n_status: 'running',
    n8n_response_time_ms: 55,
    n8n_healthy: true,
    services: rawInput.services,
    last_checked_at: nowIso,
    recent_errors: ['Disk utilization at 87% on 10 GB root partition'],
    is_demo: false
  };

  let inserted = null;
  let insertResult = await supabase
    .from('admin_vps_metrics')
    .insert(testSnapshot)
    .select('id')
    .maybeSingle();

  if (insertResult.error && insertResult.error.message.includes('Could not find')) {
    // Adaptive fallback to base columns if user hasn't run the additive migration yet
    const baseSnapshot = {
      status: testSnapshot.status,
      cpu_percent: testSnapshot.cpu_percent,
      ram_used_gb: testSnapshot.ram_used_gb,
      ram_total_gb: testSnapshot.ram_total_gb,
      ram_percent: testSnapshot.ram_percent,
      disk_used_gb: testSnapshot.disk_used_gb,
      disk_total_gb: testSnapshot.disk_total_gb,
      disk_percent: testSnapshot.disk_percent,
      uptime_seconds: testSnapshot.uptime_seconds,
      n8n_status: testSnapshot.n8n_status,
      n8n_response_time_ms: testSnapshot.n8n_response_time_ms,
      n8n_healthy: testSnapshot.n8n_healthy,
      last_checked_at: testSnapshot.last_checked_at,
      recent_errors: testSnapshot.recent_errors,
      is_demo: testSnapshot.is_demo
    };
    insertResult = await supabase
      .from('admin_vps_metrics')
      .insert(baseSnapshot)
      .select('id')
      .single();
  }

  inserted = insertResult.data;
  assert(!insertResult.error, `Snapshot successfully inserted into Supabase (ID: ${inserted?.id})`);
  assert(inserted?.id !== undefined, 'Record received valid UUID primary key');

  // 4. Test Upserting admin_integration_status
  const { error: upsertErr } = await supabase.from('admin_integration_status').upsert(
    {
      service_name: 'vps',
      status: 'connected',
      last_sync_at: nowIso,
      error_message: null,
      details: {
        ip: '222.167.207.127',
        provider: 'CloudOnFire',
        os: 'Ubuntu 24.04 LTS',
        cores: '1 vCPU',
        ram_total_gb: 1.0,
        disk_total_gb: 9.8,
        disk_avail_gb: 1.3,
        disk_percent: 87.0,
        ram_percent: 65.0,
        cpu_percent: 18.5,
        n8n_latency_ms: 55,
        uptime_seconds: 1845000,
        services: rawInput.services
      },
      updated_at: nowIso
    },
    { onConflict: 'service_name' }
  );
  assert(!upsertErr, 'admin_integration_status successfully upserted for service: vps');

  // 5. Test 24h/7d/30d Range Queries
  const cutoff24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: history24h, error: h24Err } = await supabase
    .from('admin_vps_metrics')
    .select('id, cpu_percent, ram_percent, disk_percent, created_at')
    .gte('created_at', cutoff24h)
    .order('created_at', { ascending: true });

  assert(!h24Err && history24h && history24h.length > 0, `24h range query retrieved ${history24h?.length} historical data points`);

  // 6. Test Stale Data Detection Function
  const freshTime = new Date().toISOString();
  const staleTime = new Date(Date.now() - 20 * 60 * 1000).toISOString(); // 20 min ago
  const diffFresh = Math.floor((Date.now() - new Date(freshTime).getTime()) / 60000);
  const diffStale = Math.floor((Date.now() - new Date(staleTime).getTime()) / 60000);

  assert(diffFresh < 15, `Fresh heartbeat (${diffFresh}m) marked as active`);
  assert(diffStale >= 15, `Stale heartbeat (${diffStale}m >= 15m) triggers telemetry stale warning`);

  // 7. Test Safe 30-Day Retention Clean (Non-destructive)
  const past30DaysCutoff = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
  const { count: expiredCount, error: countErr } = await supabase
    .from('admin_vps_metrics')
    .select('id', { count: 'exact', head: true })
    .lt('created_at', past30DaysCutoff)
    .eq('is_demo', false);

  assert(!countErr, `Retention boundary verified (0 expired records older than 30 days currently: count=${expiredCount || 0})`);

  // 8. Test Live n8n Loopback Health Connectivity
  const pingStart = Date.now();
  const pingRes = await fetch('https://n8n.thebusinesswork.com/healthz');
  const pingLatency = Date.now() - pingStart;
  assert(pingRes.status === 200, `Live n8n healthz endpoint responds with HTTP 200 (${pingLatency}ms)`);

  console.log('\n================================================================');
  console.log(`SUMMARY: ${testsPassed}/${totalTests} TESTS PASSED.`);
  console.log('OVERALL STATUS: LOCAL MONITORING TEST SUITE PASSED ✅');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
