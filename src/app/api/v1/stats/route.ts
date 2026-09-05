import { NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = db.getDatabaseStats();
    const payload = db.getSyncPayload();
    const recentAudits = db.getAuditLogs(10);
    const sites = db.getAllSites();

    return NextResponse.json({
      success: true,
      stats,
      summary: payload.summary,
      recentAudits,
      recentSites: sites.slice(0, 10),
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
