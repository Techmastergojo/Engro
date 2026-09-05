import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const keys = db.getApiKeys();
    return NextResponse.json({ success: true, keys });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name || 'Mobile App Client';
    const { rawKey, record } = db.createApiKey(name);

    return NextResponse.json({
      success: true,
      rawKey,
      record,
      message: 'API Key generated successfully. Save this raw secret key immediately as it will not be displayed again!'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive } = body;
    const ok = db.toggleApiKey(id, isActive);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    const ok = db.deleteApiKey(id);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
