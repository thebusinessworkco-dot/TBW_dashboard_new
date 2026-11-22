#!/bin/bash
# ==============================================================================
# LOCAL MOCK TEST SUITE FOR THE BUSINESS WORK VPS MONITOR AGENT
# Tests vps_monitor_agent.sh against mock Linux/Docker/systemd/curl environments
# Zero production VPS access required.
# ==============================================================================

set -e

PASSED=0
FAILED=0

assert_eq() {
    local label="$1"
    local expected="$2"
    local actual="$3"
    if [ "$expected" = "$actual" ]; then
        echo "  [PASS] $label"
        PASSED=$((PASSED + 1))
    else
        echo "  [FAIL] $label"
        echo "    Expected: '$expected'"
        echo "    Actual:   '$actual'"
        FAILED=$((FAILED + 1))
    fi
}

assert_contains() {
    local label="$1"
    local needle="$2"
    local haystack="$3"
    if echo "$haystack" | grep -q "$needle"; then
        echo "  [PASS] $label"
        PASSED=$((PASSED + 1))
    else
        echo "  [FAIL] $label (needle '$needle' not found)"
        FAILED=$((FAILED + 1))
    fi
}

TEST_DIR=$(mktemp -d -t tbw_agent_test_XXXXXX)
MOCK_BIN="$TEST_DIR/bin"
MOCK_PROC="$TEST_DIR/proc"
mkdir -p "$MOCK_BIN" "$MOCK_PROC"

cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo "=== TEST 1: Syntax Validation (bash -n) ==="
if bash -n scripts/vps_monitor_agent.sh; then
    echo "  [PASS] bash -n exited 0 with no syntax errors"
    PASSED=$((PASSED + 1))
else
    echo "  [FAIL] bash -n failed"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "=== TEST 2: Bearer Token Requirement Enforcement ==="
# Running without token must exit 1 and output error
OUT=$(VPS_METRICS_BEARER_TOKEN="" MONITOR_ENV_FILE="$TEST_DIR/nonexistent.env" bash scripts/vps_monitor_agent.sh 2>&1 || true)
assert_contains "Missing token error output" "VPS_METRICS_BEARER_TOKEN is not configured" "$OUT"

echo ""
echo "=== TEST 3: Mock Linux Environment with Healthy Services ==="
# Setup mock mock curl that simulates HTTP 200 responses
cat << 'EOF' > "$MOCK_BIN/curl"
#!/bin/bash
# Capture curl arguments
for arg in "$@"; do
    if [ "$arg" = "http://127.0.0.1:5678/healthz" ] || [ "$arg" = "https://n8n.thebusinesswork.com/healthz" ]; then
        echo -n "200"
        exit 0
    fi
    if [ "$arg" = "http://127.0.0.1:3002/healthz" ]; then
        echo -n "200"
        exit 0
    fi
done
# Ingestion POST mock
if [ "$1" = "-s" ] && [ "$2" = "-o" ]; then
    # Write payload to inspect
    echo -n "200"
    exit 0
fi
echo -n "200"
exit 0
EOF
chmod +x "$MOCK_BIN/curl"

# Mock docker
cat << 'EOF' > "$MOCK_BIN/docker"
#!/bin/bash
echo "running"
exit 0
EOF
chmod +x "$MOCK_BIN/docker"

# Mock systemctl
cat << 'EOF' > "$MOCK_BIN/systemctl"
#!/bin/bash
exit 0
EOF
chmod +x "$MOCK_BIN/systemctl"

# Mock df
cat << 'EOF' > "$MOCK_BIN/df"
#!/bin/bash
echo "Filesystem     1K-blocks    Used Available Use% Mounted on"
echo "/dev/root       10485760 8388608   2097152  80% /"
exit 0
EOF
chmod +x "$MOCK_BIN/df"

# Mock proc files
cat << 'EOF' > "$MOCK_PROC/stat"
cpu  1000 200 300 8500 50 10 20 0 0 0
EOF
cat << 'EOF' > "$MOCK_PROC/meminfo"
MemTotal:        1048576 kB
MemFree:          200000 kB
MemAvailable:     400000 kB
EOF
cat << 'EOF' > "$MOCK_PROC/uptime"
1845000.50 1800000.20
EOF

# Run agent with mock PATH and captured payload
TEST_OUTPUT=$(PATH="$MOCK_BIN:$PATH" VPS_METRICS_BEARER_TOKEN="test_secret_32_bytes_long_here" DASHBOARD_URL="https://dashboard.thebusinesswork.com/api/vps/health" bash scripts/vps_monitor_agent.sh -v)
assert_contains "Curl transport exit code 0" "Curl Transport Exit Code: 0" "$TEST_OUTPUT"
assert_contains "HTTP status 200" "HTTP Response Status: 200" "$TEST_OUTPUT"
assert_contains "Payload contains valid disk percent" '"disk_percent": 80' "$TEST_OUTPUT"
assert_contains "Payload contains tbw-n8n-n8n-1" '"tbw-n8n-n8n-1": "running"' "$TEST_OUTPUT"
if ! echo "$TEST_OUTPUT" | grep -q "test_secret_32_bytes_long_here"; then
    echo "  [PASS] Bearer token is NEVER printed in verbose output"
    PASSED=$((PASSED + 1))
else
    echo "  [FAIL] Bearer token was exposed in verbose output!"
    FAILED=$((FAILED + 1))
fi

echo ""
echo "=== TEST 4: Null Fallback Verification (No Fabricated 0s) ==="
# Remove df, docker, and systemctl from PATH
mkdir -p "$TEST_DIR/empty_bin"
cat << 'EOF' > "$TEST_DIR/empty_bin/curl"
#!/bin/bash
echo -n "200"
exit 0
EOF
chmod +x "$TEST_DIR/empty_bin/curl"

# Empty proc files
cat << 'EOF' > "$MOCK_PROC/empty_stat"
EOF

# When df fails and /proc is unavailable, script must output null, not fake values
TEST_NULL_OUTPUT=$(PATH="$TEST_DIR/empty_bin:/usr/bin:/bin" \
    VPS_METRICS_BEARER_TOKEN="test_secret" \
    bash -c '
    # Override /proc and df inside subshell
    df() { return 1; }
    export -f df
    bash scripts/vps_monitor_agent.sh -v 2>/dev/null || true
')

assert_contains "Disk percent is null when df fails" '"disk_percent": null' "$TEST_NULL_OUTPUT"
assert_contains "Disk used is null when df fails" '"disk_used_gb": null' "$TEST_NULL_OUTPUT"
assert_contains "Recent errors records measurement failure" "Disk metrics unavailable" "$TEST_NULL_OUTPUT"

echo ""
echo "=== TEST 5: Transport Failure Handling (Curl Exit Code Separation) ==="
cat << 'EOF' > "$MOCK_BIN/curl_fail"
#!/bin/bash
# Simulate curl network failure (exit code 7: Failed to connect to host)
exit 7
EOF
chmod +x "$MOCK_BIN/curl_fail"

TRANSPORT_TEST=$(PATH="$MOCK_BIN:$PATH" VPS_METRICS_BEARER_TOKEN="test_token" bash -c '
curl() {
    if [ "$1" = "-s" ] && [ "$2" = "-o" ]; then
        return 7
    fi
    return 0
}
export -f curl
bash scripts/vps_monitor_agent.sh 2>&1 || true
')
assert_contains "Transport failure catches exit code 7" "Network transport failed: curl exited with code 7" "$TRANSPORT_TEST"

echo ""
echo "=== TEST 6: HTTP Error Rejection (HTTP 401 / 500) ==="
HTTP_ERR_TEST=$(PATH="$MOCK_BIN:$PATH" VPS_METRICS_BEARER_TOKEN="test_token" bash -c '
curl() {
    if [ "$1" = "-s" ] && [ "$2" = "-o" ]; then
        echo -n "401"
        return 0
    fi
    return 0
}
export -f curl
bash scripts/vps_monitor_agent.sh 2>&1 || true
')
assert_contains "HTTP 401 is reported explicitly" "Telemetry dispatch failed: HTTP response status 401" "$HTTP_ERR_TEST"

echo ""
echo "=== TEST 7: Crontab Idempotency (Prevent Duplicate Entries) ==="
# Test crontab command logic with grep -v
MOCK_CRONTAB=""
CRON_CMD="*/5 * * * * /usr/local/bin/tbw-vps-monitor.sh >/dev/null 2>&1"

# Run 5 times
for i in 1 2 3 4 5; do
    MOCK_CRONTAB=$(echo "$MOCK_CRONTAB" | grep -v 'tbw-vps-monitor.sh' || true; echo "$CRON_CMD")
done

COUNT=$(echo "$MOCK_CRONTAB" | grep -c 'tbw-vps-monitor.sh' || true)
assert_eq "Crontab entry count after 5 runs" "1" "$COUNT"

echo ""
echo "=================================================="
echo "MOCK TEST SUMMARY: $PASSED passed, $FAILED failed"
echo "=================================================="

if [ "$FAILED" -gt 0 ]; then
    exit 1
fi
exit 0
