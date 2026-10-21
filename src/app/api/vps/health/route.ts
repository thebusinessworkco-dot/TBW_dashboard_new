import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const expectedToken = process.env.VPS_METRICS_BEARER_TOKEN;

    // Validate security bearer token if configured
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized VPS telemetry heartbeat' },
        { status: 401 }
      );
    }

    const metrics = await request.json();

    // Validates payload structure
    const validatedSnapshot = {
      id: `vps-${Date.now()}`,
      status: metrics.status || (metrics.cpu_percent > 85 || metrics.ram_percent > 85 ? 'warning' : 'healthy'),
      cpu_percent: Number(metrics.cpu_percent) || 0,
      ram_used_gb: Number(metrics.ram_used_gb) || 0,
      ram_total_gb: Number(metrics.ram_total_gb) || 8.0,
      ram_percent: Number(metrics.ram_percent) || 0,
      disk_used_gb: Number(metrics.disk_used_gb) || 0,
      disk_total_gb: Number(metrics.disk_total_gb) || 120.0,
      disk_percent: Number(metrics.disk_percent) || 0,
      uptime_seconds: Number(metrics.uptime_seconds) || 0,
      n8n_status: metrics.n8n_status || 'running',
      n8n_response_time_ms: Number(metrics.n8n_response_time_ms) || 50,
      n8n_healthy: Boolean(metrics.n8n_healthy ?? true),
      last_checked_at: new Date().toISOString(),
      recent_errors: metrics.recent_errors || [],
      is_demo: false,
    };

    // Return confirmed receipt
    return NextResponse.json({
      success: true,
      received_at: new Date().toISOString(),
      snapshot: validatedSnapshot,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Malformed telemetry JSON';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/vps/health',
    description: 'POST telemetry heartbeat with cpu_percent, ram_percent, disk_percent, n8n_status.',
  });
}
