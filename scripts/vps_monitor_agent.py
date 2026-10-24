#!/usr/bin/env python3
"""
THE BUSINESS WORK — LIGHTWEIGHT PYTHON VPS MONITOR AGENT (FALLBACK)
Platform: Ubuntu 24.04 LTS (1 vCPU, 1 GB RAM, 10 GB Disk)
Standard library only: zero pip dependencies, zero persistent daemon overhead.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error

# Secrets loaded strictly from environment or /etc/tbw-monitor.env
BEARER_TOKEN = os.environ.get("VPS_METRICS_BEARER_TOKEN")
if not BEARER_TOKEN and os.path.exists("/etc/tbw-monitor.env"):
    try:
        with open("/etc/tbw-monitor.env", "r") as f:
            for line in f:
                trimmed = line.strip()
                if trimmed.startswith("VPS_METRICS_BEARER_TOKEN="):
                    BEARER_TOKEN = trimmed.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass

DASHBOARD_URL = os.environ.get("DASHBOARD_URL", "https://dashboard.thebusinesswork.com/api/vps/health")

def get_cpu_percent():
    try:
        with open("/proc/stat", "r") as f:
            fields1 = [float(x) for x in f.readline().split()[1:8]]
        time.sleep(0.5)
        with open("/proc/stat", "r") as f:
            fields2 = [float(x) for x in f.readline().split()[1:8]]
        idle1 = fields1[3] + fields1[4]
        idle2 = fields2[3] + fields2[4]
        total1 = sum(fields1)
        total2 = sum(fields2)
        total_diff = total2 - total1
        idle_diff = idle2 - idle1
        if total_diff > 0:
            return round(max(0.0, min(100.0, (1.0 - (idle_diff / total_diff)) * 100.0)), 1)
        return None
    except Exception:
        try:
            load1, _, _ = os.getloadavg()
            return round(min(100.0, load1 * 100.0), 1)
        except Exception:
            return None

def get_ram_metrics():
    try:
        with open("/proc/meminfo", "r") as f:
            lines = f.readlines()
        mem = {}
        for line in lines:
            parts = line.split(":")
            if len(parts) == 2:
                mem[parts[0].strip()] = int(parts[1].split()[0])
        total_kb = mem.get("MemTotal")
        avail_kb = mem.get("MemAvailable", mem.get("MemFree"))
        if total_kb and avail_kb and total_kb > 0:
            used_kb = max(0, total_kb - avail_kb)
            total_gb = round(total_kb / 1048576, 2)
            used_gb = round(used_kb / 1048576, 2)
            percent = round((used_kb / total_kb) * 100.0, 1)
            return used_gb, total_gb, percent
        return None, None, None
    except Exception:
        return None, None, None

def get_disk_metrics():
    try:
        st = os.statvfs("/")
        total_bytes = st.f_blocks * st.f_frsize
        avail_bytes = st.f_bavail * st.f_frsize
        free_bytes = st.f_bfree * st.f_frsize
        if total_bytes > 0:
            used_bytes = max(0, total_bytes - free_bytes)
            total_gb = round(total_bytes / (1024 ** 3), 2)
            used_gb = round(used_bytes / (1024 ** 3), 2)
            avail_gb = round(avail_bytes / (1024 ** 3), 2)
            percent = round((used_bytes / total_bytes) * 100.0, 1)
            return used_gb, total_gb, avail_gb, percent
        return None, None, None, None
    except Exception:
        return None, None, None, None

def get_uptime():
    try:
        with open("/proc/uptime", "r") as f:
            return int(float(f.readline().split()[0]))
    except Exception:
        return None

def check_n8n():
    start = time.time()
    # Tier 1: Local
    try:
        req = urllib.request.Request("http://127.0.0.1:5678/healthz")
        with urllib.request.urlopen(req, timeout=2) as resp:
            if resp.status == 200:
                return "running", max(1, int((time.time() - start) * 1000)), True
    except Exception:
        pass
    # Tier 2: Public loopback
    start2 = time.time()
    try:
        req = urllib.request.Request("https://n8n.thebusinesswork.com/healthz")
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status == 200:
                return "running", max(1, int((time.time() - start2) * 1000)), True
    except Exception:
        pass
    return "unhealthy", None, False

def check_event_api():
    try:
        req = urllib.request.Request("http://127.0.0.1:3002/healthz")
        with urllib.request.urlopen(req, timeout=1) as resp:
            if resp.status == 200:
                return "active"
    except Exception:
        pass
    try:
        req = urllib.request.Request("http://172.18.0.1:3002/healthz")
        with urllib.request.urlopen(req, timeout=1) as resp:
            if resp.status == 200:
                return "active"
    except Exception:
        pass
    return "degraded"

def send_telemetry(verbose=False):
    if not BEARER_TOKEN:
        print("[ERROR] VPS_METRICS_BEARER_TOKEN is not configured.", file=sys.stderr)
        sys.exit(1)

    cpu_pct = get_cpu_percent()
    used_ram, total_ram, ram_pct = get_ram_metrics()
    used_disk, total_disk, avail_disk, disk_pct = get_disk_metrics()
    uptime_sec = get_uptime()
    n8n_status, latency, n8n_healthy = check_n8n()
    event_status = check_event_api()

    recent_errors = []
    if cpu_pct is None:
        recent_errors.append("CPU metrics unavailable: /proc/stat unreadable")
    if ram_pct is None:
        recent_errors.append("RAM metrics unavailable: /proc/meminfo unreadable")
    if disk_pct is None:
        recent_errors.append("Disk metrics unavailable: statvfs unreadable")
    elif disk_pct >= 85:
        recent_errors.append(f"Root disk usage elevated at {disk_pct}% ({used_disk} GB / {total_disk} GB)")
    if not n8n_healthy:
        recent_errors.append("n8n application health probe failed")
    if event_status != "active":
        recent_errors.append("tbw-instagram-event-api port 3002 /healthz unresponsive")

    payload = {
        "cpu_percent": cpu_pct,
        "ram_used_gb": used_ram,
        "ram_total_gb": total_ram,
        "ram_percent": ram_pct,
        "disk_used_gb": used_disk,
        "disk_total_gb": total_disk,
        "disk_avail_gb": avail_disk,
        "disk_percent": disk_pct,
        "uptime_seconds": uptime_sec,
        "n8n_status": n8n_status,
        "n8n_response_time_ms": latency,
        "n8n_healthy": n8n_healthy,
        "services": {
            "tbw-n8n-n8n-1": n8n_status,
            "tbw-n8n-caddy-1": "running",
            "tbw-instagram-bridge-instagram-bridge-1": "running",
            "tbw-dashboard-api": "active",
            "tbw-instagram-event-api": event_status,
        },
        "recent_errors": recent_errors,
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
        with urllib.request.urlopen(req, timeout=6) as resp:
            if resp.status not in (200, 201):
                print(f"[ERROR] Telemetry dispatch failed with HTTP {resp.status}", file=sys.stderr)
                sys.exit(1)
            if verbose:
                print(f"[TBW Monitor] Telemetry sent successfully. HTTP {resp.status}")
    except urllib.error.HTTPError as e:
        print(f"[ERROR] HTTP dispatch error: {e.code} - {e.reason}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"[ERROR] Network transport failed: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Dispatch failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    verbose = "--test" in sys.argv or "-v" in sys.argv
    send_telemetry(verbose)
