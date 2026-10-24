#!/bin/bash
# ==============================================================================
# THE BUSINESS WORK — LIGHTWEIGHT VPS HEALTH MONITORING AGENT
# Platform: Ubuntu 24.04 LTS (1 vCPU, 1 GB RAM, 10 GB Disk)
# Runs via cron every 5 minutes.
# Ephemeral execution (~250ms), zero persistent daemon memory overhead.
# Strictly outbound HTTPS — Zero inbound ports opened.
# ==============================================================================

# 1. Concurrency Protection (Prevent overlapping executions)
LOCKFILE="/var/lock/tbw-vps-monitor.lock"
if command -v flock >/dev/null 2>&1; then
    exec 200>"$LOCKFILE" || exit 1
    flock -n 200 || exit 0
fi

# 2. Secure Secret Retrieval
# Secrets are loaded exclusively from a permission-restricted file (chmod 600)
# or from the execution environment. Never hardcoded or echoed.
MONITOR_ENV_FILE="/etc/tbw-monitor.env"
if [ -f "$MONITOR_ENV_FILE" ]; then
    # shellcheck disable=SC1090
    . "$MONITOR_ENV_FILE"
fi

BEARER_TOKEN="${VPS_METRICS_BEARER_TOKEN:-}"
DASHBOARD_URL="${DASHBOARD_URL:-https://dashboard.thebusinesswork.com/api/vps/health}"

if [ -z "$BEARER_TOKEN" ]; then
    echo "[ERROR] VPS_METRICS_BEARER_TOKEN is not configured. Set it in $MONITOR_ENV_FILE (chmod 600) or execution environment." >&2
    exit 1
fi

COLLECTION_WARNINGS=()

# 3. CPU Utilization (Accurate two-sample /proc/stat delta across 500ms on 1 vCPU)
CPU_PERCENT="null"
if [ -r /proc/stat ]; then
    read -r _ u1 n1 s1 i1 w1 q1 sq1 _ < /proc/stat 2>/dev/null || true
    sleep 0.5
    read -r _ u2 n2 s2 i2 w2 q2 sq2 _ < /proc/stat 2>/dev/null || true

    PREV_IDLE=$(( ${i1:-0} + ${w1:-0} ))
    IDLE=$(( ${i2:-0} + ${w2:-0} ))
    PREV_TOTAL=$(( ${u1:-0} + ${n1:-0} + ${s1:-0} + ${i1:-0} + ${w1:-0} + ${q1:-0} + ${sq1:-0} ))
    TOTAL=$(( ${u2:-0} + ${n2:-0} + ${s2:-0} + ${i2:-0} + ${w2:-0} + ${q2:-0} + ${sq2:-0} ))

    TOTAL_DIFF=$((TOTAL - PREV_TOTAL))
    IDLE_DIFF=$((IDLE - PREV_IDLE))

    if [ "$TOTAL_DIFF" -gt 0 ]; then
        CPU_PERCENT=$(awk "BEGIN { pct = (1 - ($IDLE_DIFF / $TOTAL_DIFF)) * 100; if (pct < 0) pct = 0; if (pct > 100) pct = 100; printf \"%.1f\", pct }")
    elif [ -r /proc/loadavg ]; then
        LOAD1=$(awk '{print $1}' /proc/loadavg 2>/dev/null || true)
        if [ -n "$LOAD1" ]; then
            CPU_PERCENT=$(awk "BEGIN { pct = $LOAD1 * 100; if (pct > 100) pct = 100; printf \"%.1f\", pct }")
        fi
    fi
fi

if [ "$CPU_PERCENT" = "null" ]; then
    COLLECTION_WARNINGS+=("\"CPU metrics unavailable: /proc/stat unreadable\"")
fi

# 4. RAM Usage (Distinguish used memory from reclaimable Linux cache)
RAM_TOTAL_GB="null"
RAM_USED_GB="null"
RAM_PERCENT="null"

if [ -r /proc/meminfo ]; then
    TOTAL_MEM_KB=$(awk '/MemTotal:/ {print $2}' /proc/meminfo 2>/dev/null || true)
    AVAIL_MEM_KB=$(awk '/MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null || awk '/MemFree:/ {print $2}' /proc/meminfo 2>/dev/null || true)

    if [ -n "$TOTAL_MEM_KB" ] && [ -n "$AVAIL_MEM_KB" ] && [ "$TOTAL_MEM_KB" -gt 0 ] 2>/dev/null; then
        USED_MEM_KB=$((TOTAL_MEM_KB - AVAIL_MEM_KB))
        RAM_TOTAL_GB=$(awk "BEGIN {printf \"%.2f\", $TOTAL_MEM_KB / 1048576}")
        RAM_USED_GB=$(awk "BEGIN {printf \"%.2f\", $USED_MEM_KB / 1048576}")
        RAM_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($USED_MEM_KB / $TOTAL_MEM_KB) * 100}")
    fi
fi

if [ "$RAM_PERCENT" = "null" ]; then
    COLLECTION_WARNINGS+=("\"RAM metrics unavailable: /proc/meminfo unreadable\"")
fi

# 5. Root Partition Disk Usage (df -k /)
DISK_TOTAL_GB="null"
DISK_USED_GB="null"
DISK_AVAIL_GB="null"
DISK_PERCENT="null"

DISK_LINE=$(df -k / 2>/dev/null | awk 'NR==2')
if [ -n "$DISK_LINE" ]; then
    DISK_TOTAL_KB=$(echo "$DISK_LINE" | awk '{print $2}')
    DISK_USED_KB=$(echo "$DISK_LINE" | awk '{print $3}')
    DISK_AVAIL_KB=$(echo "$DISK_LINE" | awk '{print $4}')
    DISK_PCT_RAW=$(echo "$DISK_LINE" | awk '{gsub("%",""); print $5}')

    if [ -n "$DISK_TOTAL_KB" ] && [ "$DISK_TOTAL_KB" -gt 0 ] 2>/dev/null; then
        DISK_TOTAL_GB=$(awk "BEGIN {printf \"%.2f\", $DISK_TOTAL_KB / 1048576}")
        DISK_USED_GB=$(awk "BEGIN {printf \"%.2f\", ${DISK_USED_KB:-0} / 1048576}")
        DISK_AVAIL_GB=$(awk "BEGIN {printf \"%.2f\", ${DISK_AVAIL_KB:-0} / 1048576}")
        DISK_PERCENT=${DISK_PCT_RAW:-null}
    fi
fi

if [ "$DISK_PERCENT" = "null" ]; then
    COLLECTION_WARNINGS+=("\"Disk metrics unavailable: df unreadable\"")
fi

# 6. Uptime
UPTIME_SECONDS="null"
if [ -r /proc/uptime ]; then
    UPTIME_RAW=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || true)
    if [ -n "$UPTIME_RAW" ]; then
        UPTIME_SECONDS="$UPTIME_RAW"
    fi
fi

if [ "$UPTIME_SECONDS" = "null" ]; then
    COLLECTION_WARNINGS+=("\"Uptime metric unavailable: /proc/uptime unreadable\"")
fi

# 7. Exact Docker Container & Application Health Checks
check_docker_container() {
    local target="$1"
    if ! command -v docker >/dev/null 2>&1; then
        echo "unknown"
        return
    fi
    local state
    state=$(docker inspect --format '{{.State.Status}}' "$target" 2>/dev/null || echo "not_found")
    if [ "$state" = "running" ]; then
        local health
        health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$target" 2>/dev/null || echo "none")
        if [ "$health" = "unhealthy" ]; then
            echo "unhealthy"
        else
            echo "running"
        fi
    elif [ "$state" = "exited" ] || [ "$state" = "dead" ]; then
        echo "stopped"
    elif [ "$state" = "restarting" ]; then
        echo "restarting"
    else
        echo "$state"
    fi
}

C_N8N=$(check_docker_container "tbw-n8n-n8n-1")
C_CADDY=$(check_docker_container "tbw-n8n-caddy-1")
C_BRIDGE=$(check_docker_container "tbw-instagram-bridge-instagram-bridge-1")

# 8. Exact Systemd Service Checks
check_systemd_service() {
    local target="$1"
    if ! command -v systemctl >/dev/null 2>&1; then
        echo "unknown"
        return
    fi
    if systemctl is-active --quiet "$target" 2>/dev/null; then
        echo "active"
    elif systemctl status "$target" >/dev/null 2>&1; then
        echo "inactive"
    else
        echo "not_found"
    fi
}

S_DASHBOARD=$(check_systemd_service "tbw-dashboard-api")
S_EVENT=$(check_systemd_service "tbw-instagram-event-api")

# 9. Multi-Tier Application Health Verification
# Tier 1: Local n8n port 5678
# Tier 2: Public TLS loopback via Caddy
N8N_HEALTHY=false
N8N_LATENCY_MS="null"

START_TS=$(date +%s%3N 2>/dev/null || date +%s)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://127.0.0.1:5678/healthz 2>/dev/null)
CURL_EXIT=$?

if [ $CURL_EXIT -eq 0 ] && [ "$HTTP_CODE" = "200" ]; then
    END_TS=$(date +%s%3N 2>/dev/null || date +%s)
    N8N_HEALTHY=true
    N8N_LATENCY_MS=$((END_TS - START_TS))
else
    # Fallback Tier 2: Via Caddy TLS loopback
    START_TS=$(date +%s%3N 2>/dev/null || date +%s)
    HTTP_CODE_CADDY=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 https://n8n.thebusinesswork.com/healthz 2>/dev/null)
    CURL_EXIT_CADDY=$?
    if [ $CURL_EXIT_CADDY -eq 0 ] && [ "$HTTP_CODE_CADDY" = "200" ]; then
        END_TS=$(date +%s%3N 2>/dev/null || date +%s)
        N8N_HEALTHY=true
        N8N_LATENCY_MS=$((END_TS - START_TS))
    else
        N8N_HEALTHY=false
        N8N_LATENCY_MS="null"
        COLLECTION_WARNINGS+=("\"n8n application health probe failed (HTTP $HTTP_CODE / Caddy $HTTP_CODE_CADDY)\"")
    fi
fi

# Reflect actual application health onto service status
if [ "$C_N8N" = "running" ] && [ "$N8N_HEALTHY" != "true" ]; then
    C_N8N="unhealthy"
fi

# Application health probe for tbw-instagram-event-api on port 3002
if [ "$S_EVENT" = "active" ]; then
    EVENT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 http://127.0.0.1:3002/healthz 2>/dev/null)
    EVENT_CURL_EXIT=$?
    if [ $EVENT_CURL_EXIT -ne 0 ] || [ "$EVENT_HTTP" != "200" ]; then
        # Try docker bridge address
        EVENT_HTTP_BRIDGE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 1 http://172.18.0.1:3002/healthz 2>/dev/null)
        EVENT_BRIDGE_EXIT=$?
        if [ $EVENT_BRIDGE_EXIT -ne 0 ] || [ "$EVENT_HTTP_BRIDGE" != "200" ]; then
            S_EVENT="degraded"
            COLLECTION_WARNINGS+=("\"tbw-instagram-event-api systemd active but port 3002 /healthz unresponsive\"")
        fi
    fi
fi

# 10. Warnings Array
if [ "$DISK_PERCENT" != "null" ] && [ "$DISK_PERCENT" -ge 85 ] 2>/dev/null; then
    COLLECTION_WARNINGS+=("\"Root disk usage elevated at ${DISK_PERCENT}% (${DISK_USED_GB} GB / ${DISK_TOTAL_GB} GB)\"")
fi

# Build JSON array of warnings
RECENT_ERRORS="[]"
if [ ${#COLLECTION_WARNINGS[@]} -gt 0 ]; then
    JOINED_WARNINGS=$(IFS=, ; echo "${COLLECTION_WARNINGS[*]}")
    RECENT_ERRORS="[${JOINED_WARNINGS}]"
fi

# 11. Build Telemetry JSON Payload
PAYLOAD=$(cat <<JSON
{
  "cpu_percent": ${CPU_PERCENT},
  "ram_used_gb": ${RAM_USED_GB},
  "ram_total_gb": ${RAM_TOTAL_GB},
  "ram_percent": ${RAM_PERCENT},
  "disk_used_gb": ${DISK_USED_GB},
  "disk_total_gb": ${DISK_TOTAL_GB},
  "disk_avail_gb": ${DISK_AVAIL_GB},
  "disk_percent": ${DISK_PERCENT},
  "uptime_seconds": ${UPTIME_SECONDS},
  "n8n_status": "${C_N8N}",
  "n8n_response_time_ms": ${N8N_LATENCY_MS},
  "n8n_healthy": ${N8N_HEALTHY},
  "services": {
    "tbw-n8n-n8n-1": "${C_N8N}",
    "tbw-n8n-caddy-1": "${C_CADDY}",
    "tbw-instagram-bridge-instagram-bridge-1": "${C_BRIDGE}",
    "tbw-dashboard-api": "${S_DASHBOARD}",
    "tbw-instagram-event-api": "${S_EVENT}"
  },
  "recent_errors": ${RECENT_ERRORS}
}
JSON
)

# 12. Dispatch with Explicit Curl Exit & HTTP Response Status Separation
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
     --max-time 6 \
     -X POST "$DASHBOARD_URL" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $BEARER_TOKEN" \
     -d "$PAYLOAD" 2>/dev/null)
CURL_EXIT=$?

if [ "$1" = "--verbose" ] || [ "$1" = "-v" ]; then
    echo "--- Telemetry Collection Summary ---"
    echo "Target Endpoint: $DASHBOARD_URL"
    echo "Curl Transport Exit Code: $CURL_EXIT"
    echo "HTTP Response Status: ${HTTP_STATUS:-none}"
    echo "Payload: $PAYLOAD"
fi

if [ $CURL_EXIT -ne 0 ]; then
    echo "[ERROR] Network transport failed: curl exited with code $CURL_EXIT" >&2
    exit 1
fi

if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "201" ]; then
    echo "[ERROR] Telemetry dispatch failed: HTTP response status ${HTTP_STATUS:-unknown}" >&2
    exit 1
fi

exit 0
