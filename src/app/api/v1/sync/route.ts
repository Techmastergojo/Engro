import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Extract API Key from headers or query param
    const apiKey = req.headers.get('x-engro-api-key') || 
                   req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
                   req.nextUrl.searchParams.get('key');

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'Unauthorized. Missing x-engro-api-key header.',
          message: 'Access to telecom operational telemetry requires a valid enterprise API key.'
        }, 
        { status: 401 }
      );
    }

    // 2. Validate API Key against database
    const isValid = db.validateApiKey(apiKey);
    if (!isValid) {
      return NextResponse.json(
        { 
          error: 'Forbidden. Invalid or revoked API key.',
          message: 'The provided API key does not match active authorization credentials.'
        }, 
        { status: 403 }
      );
    }

    // 3. Compile dynamic sync payload
    const payload = db.getSyncPayload();

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Engro-Sync-Version': payload.version,
        'X-Engro-Records-Sites': String(payload.summary.totalSites)
      }
    });
  } catch (err: any) {
    console.error('API Sync Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: err?.message || 'Failed to generate sync payload.' },
      { status: 500 }
    );
  }
}
