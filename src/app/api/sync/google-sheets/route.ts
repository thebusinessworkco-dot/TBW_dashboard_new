import { NextResponse } from 'next/server';
import { syncMasterGoogleSheets } from '@/lib/sheets/google-sheets-sync';

export async function GET() {
  try {
    const result = await syncMasterGoogleSheets();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Sync execution failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await syncMasterGoogleSheets();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Sync execution failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
