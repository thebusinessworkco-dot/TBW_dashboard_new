import { NextResponse } from 'next/server';
import {
  getAllReelRules,
  getReelRuleByMediaId,
  saveReelRule,
  deleteReelRule,
} from '@/lib/instagram/reel-automation';

/**
 * REELS MANAGER CRUD ENDPOINT: /api/instagram/reels
 * Supports GET (list all), POST (create/update rule), DELETE (remove rule)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('media_id');

    if (mediaId) {
      const rule = await getReelRuleByMediaId(mediaId);
      if (!rule) {
        return NextResponse.json({ error: 'Reel rule not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, rule }, { status: 200 });
    }

    const rules = await getAllReelRules();
    return NextResponse.json({ success: true, rules }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch reel rules';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { media_id, title } = body;

    if (!media_id || !title) {
      return NextResponse.json(
        { success: false, error: 'media_id and title are required' },
        { status: 400 }
      );
    }

    const saved = await saveReelRule(body);
    return NextResponse.json({ success: true, rule: saved }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save reel rule';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('media_id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id or media_id is required' }, { status: 400 });
    }

    const deleted = await deleteReelRule(id);
    return NextResponse.json({ success: deleted }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to delete reel rule';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
