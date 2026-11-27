import { NextResponse } from 'next/server';

/**
 * META WHATSAPP CLOUD API — MEDIA PROXY
 *
 * Retrieves incoming customer images/documents from Meta Graph API
 * by WhatsApp Media ID and streams the file to the dashboard.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse('Media ID required', { status: 400 });
    }

    const token =
      process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN ||
      process.env.META_ACCESS_TOKEN ||
      process.env.WHATSAPP_ACCESS_TOKEN;

    if (!token) {
      // Return a clean SVG placeholder if token is not yet configured in env
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200" fill="#f4f2ec">
        <rect width="300" height="200" rx="12" fill="#FAF8F5" stroke="#E2DDD3" stroke-width="2"/>
        <circle cx="150" cy="85" r="28" fill="#141413" opacity="0.08"/>
        <path d="M140 75h20l4 5h10a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4h-38a4 4 0 0 1-4-4V84a4 4 0 0 1 4-4h4z" stroke="#555047" stroke-width="2" fill="none"/>
        <circle cx="150" cy="95" r="7" stroke="#555047" stroke-width="2" fill="none"/>
        <text x="150" y="138" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#555047" text-anchor="middle">WhatsApp Media File</text>
        <text x="150" y="156" font-family="system-ui, sans-serif" font-size="10" fill="#888177" text-anchor="middle">Configure Meta Token to Stream</text>
      </svg>`;
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 1. Ask Meta Graph API for the media download URL
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      console.warn(`[WhatsApp Media Proxy] Failed to get URL for media ${id}:`, errText);
      return new NextResponse('Media not found on Meta server', { status: 404 });
    }

    const metaData = await metaRes.json();
    const mediaDownloadUrl = metaData.url;
    const mimeType = metaData.mime_type || 'image/jpeg';

    if (!mediaDownloadUrl) {
      return new NextResponse('Download URL missing from Meta response', { status: 502 });
    }

    // 2. Fetch the binary payload using the same bearer token
    const fileRes = await fetch(mediaDownloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!fileRes.ok) {
      return new NextResponse('Failed to fetch media file bytes', { status: 502 });
    }

    const fileBuffer = await fileRes.arrayBuffer();

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch (err: unknown) {
    console.error('[WhatsApp Media Proxy Error]:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
