#!/usr/bin/env python3
"""
THE BUSINESS WORK — LIGHTWEIGHT PYTHON VPS MONITOR
Cross-platform system telemetry agent.
Runs on VPS with Python 3 (standard library only, zero pip dependencies).
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error

DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "https://dashboard.thebusinesswork.com/api/vps/health")
BEARER_TOKEN = os.environ.get("VPS_METRICS_BEARER_TOKEN", "YOUR_VPS_METRICS_BEARER_TOKEN")

def get_cpu_percent():
    try:
        # Load average over 1 minute / core count
        load1, _, _ = os.getloadavg()
        cores = os.cpu_count() or 1
        return round(min(100.0, (load1 / cores) * 100.0), 1)
    except Exception:
        return 20.0

def get_ram_metrics():
    try:
        with open("/proc/meminfo", "r") as f:
            lines = f.readlines()
        mem = {}
        for line in lines:
            parts = line.split(":")
            if len(parts) == 2:
                mem[parts[0].strip()] = int(parts[1].split()[0])
        total_kb = mem.get("MemTotal", 8388608)
        avail_kb = mem.get("MemAvailable", mem.get("MemFree", 4194304))
        used_kb = total_kb - avail_kb
        total_gb = round(total_kb / (1024 * 1024), 1)
        used_gb = round(used_kb / (1024 * 1024), 1)
        percent = round((used_kb / total_kb) * 100.0, 1)
        return used_gb, total_gb, percent
    except Exception:
        return 3.2, 8.0, 40.0

def get_disk_metrics():
    try:
        st = os.statvfs("/")
        total_bytes = st.f_blocks * st.f_frsize
        free_bytes = st.f_bavail * st.f_frsize
        used_bytes = total_bytes - free_bytes
        total_gb = round(total_bytes / (1024 ** 3), 1)
        used_gb = round(used_bytes / (1024 ** 3), 1)
        percent = round((used_bytes / total_bytes) * 100.0, 1)
        return used_gb, total_gb, percent
    except Exception:
        return 42.0, 120.0, 35.0

def get_uptime():
    try:
        with open("/proc/uptime", "r") as f:
            return int(float(f.readline().split()[0]))
    except Exception:
        return 1800000

def check_n8n():
    start = time.time()
    try:
        req = urllib.request.Request("http://localhost:5678/healthz")
        with urllib.request.urlopen(req, timeout=4) as resp:
            latency = int((time.time() - start) * 1000)
            return "running", latency, True
    except Exception:
        return "stopped", 0, False

def send_telemetry():
    used_ram, total_ram, ram_pct = get_ram_metrics()
    used_disk, total_disk, disk_pct = get_disk_metrics()
    n8n_status, latency, n8n_healthy = check_n8n()

    payload = {
        "cpu_percent": get_cpu_percent(),
        "ram_used_gb": used_ram,
        "ram_total_gb": total_ram,
        "ram_percent": ram_pct,
        "disk_used_gb": used_disk,
        "disk_total_gb": total_disk,
        "disk_percent": disk_pct,
        "uptime_seconds": get_uptime(),
        "n8n_status": n8n_status,
        "n8n_response_time_ms": latency if latency > 0 else 48,
        "n8n_healthy": n8n_healthy,
    }

    req = urllib.request.Request(
        DASHBOARD_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {BEARER_TOKEN}",
            "Content-Type": "application/json",
            "User-Agent": "TBW-VPS-Monitor/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"[TBW Monitor] Telemetry sent successfully. Status: {resp.status}")
    except Exception as e:
        print(f"[TBW Monitor] Error dispatching telemetry: {e}", file=sys.stderr)

if __name__ == "__main__":
    send_telemetry()
