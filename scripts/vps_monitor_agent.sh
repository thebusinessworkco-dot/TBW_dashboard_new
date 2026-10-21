#!/bin/bash
# ==============================================================================
# THE BUSINESS WORK — LIGHTWEIGHT VPS HEALTH MONITORING SCRIPT
# Runs on your VPS via cron every 5 minutes.
# Sends CPU, RAM, Disk, and n8n status to your Admin Dashboard securely.
# Zero incoming ports or SSH exposure required.
# ==============================================================================

DASHBOARD_URL="https://dashboard.thebusinesswork.com/api/vps/health"
BEARER_TOKEN="YOUR_VPS_METRICS_BEARER_TOKEN"

# 1. CPU Percentage
CPU_IDLE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print $1}')
CPU_USAGE=$(echo "100 - $CPU_IDLE" | bc 2>/dev/null || awk "BEGIN {print 100 - $CPU_IDLE}")

# 2. RAM Usage
RAM_TOTAL=$(free -m | awk '/Mem:/ { printf("%.1f", $2/1024) }')
RAM_USED=$(free -m | awk '/Mem:/ { printf("%.1f", $3/1024) }')
RAM_PERCENT=$(free -m | awk '/Mem:/ { printf("%.1f", ($3/$2)*100) }')

# 3. Disk Usage
DISK_TOTAL=$(df -h / | awk 'NR==2 { print $2 }' | sed 's/G//')
DISK_USED=$(df -h / | awk 'NR==2 { print $3 }' | sed 's/G//')
DISK_PERCENT=$(df -h / | awk 'NR==2 { print $5 }' | sed 's/%//')

# 4. Server Uptime (seconds)
UPTIME_SECONDS=$(cat /proc/uptime | awk '{print int($1)}')

# 5. n8n Service Status & Response Latency
N8N_HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" --max-time 5 http://localhost:5678/healthz 2>/dev/null || echo "000")
N8N_TIME_MS=$(curl -o /dev/null -s -w "%{time_total}" --max-time 5 http://localhost:5678/healthz 2>/dev/null | awk '{printf("%d", $1*1000)}')

if [ "$N8N_HTTP_STATUS" = "200" ]; then
  N8N_STATUS="running"
  N8N_HEALTHY=true
else
  # check docker container if port not direct
  if docker ps --filter "name=n8n" --filter "status=running" | grep -q n8n; then
    N8N_STATUS="running"
    N8N_HEALTHY=true
  else
    N8N_STATUS="stopped"
    N8N_HEALTHY=false
  fi
fi

# 6. Dispatch Payload
curl -s -X POST "$DASHBOARD_URL" \
  -H "Authorization: Bearer $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"cpu_percent\": ${CPU_USAGE:-0},
    \"ram_used_gb\": ${RAM_USED:-0},
    \"ram_total_gb\": ${RAM_TOTAL:-8.0},
    \"ram_percent\": ${RAM_PERCENT:-0},
    \"disk_used_gb\": ${DISK_USED:-0},
    \"disk_total_gb\": ${DISK_TOTAL:-120.0},
    \"disk_percent\": ${DISK_PERCENT:-0},
    \"uptime_seconds\": ${UPTIME_SECONDS:-0},
    \"n8n_status\": \"${N8N_STATUS}\",
    \"n8n_response_time_ms\": ${N8N_TIME_MS:-45},
    \"n8n_healthy\": ${N8N_HEALTHY}
  }" > /dev/null
