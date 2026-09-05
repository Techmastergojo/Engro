import { NextRequest, NextResponse } from 'next/server';
import { parseReportFile } from '@/lib/parser/excelParser';
import { db } from '@/lib/db/database';
import type { ReportType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const forcedType = formData.get('reportType') as ReportType | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided in request.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parseResult = parseReportFile(buffer, file.name, forcedType || undefined);

    let rowsAdded = 0;
    let rowsUpdated = 0;

    // Apply data based on report type
    if (parseResult.reportType === 'SITE_MASTER' && parseResult.siteMasterRecords) {
      const res = db.upsertSiteMasterRecords(parseResult.siteMasterRecords);
      rowsAdded = res.added;
      rowsUpdated = res.updated;
    } else if (parseResult.reportType === 'NAR_PERFORMANCE') {
      if (parseResult.narDailyRecords && parseResult.narDailyRecords.length > 0) {
        const res = db.appendNarDailyRecords(parseResult.narDailyRecords);
        rowsAdded += res.added;
        rowsUpdated += res.updated;
      }
      if (parseResult.narMbuSummaries && parseResult.narMbuSummaries.length > 0) {
        const res = db.appendNarMbuSummaries(parseResult.narMbuSummaries);
        rowsAdded += res.added;
        rowsUpdated += res.updated;
      }
      if (parseResult.narOutageTickets && parseResult.narOutageTickets.length > 0) {
        const res = db.appendNarOutageTickets(parseResult.narOutageTickets);
        rowsAdded += res.added;
      }
    } else if (parseResult.reportType === 'FUEL_ACTIVITY' && parseResult.fuelLogs) {
      const res = db.appendFuelLogs(parseResult.fuelLogs);
      rowsAdded = res.added;
      rowsUpdated = res.updated;
    }

    // Add Audit Log
    const auditLog = db.addAuditLog({
      reportType: parseResult.reportType,
      fileName: file.name,
      fileSizeBytes: file.size,
      detectedDateRange: parseResult.detectedDateRange,
      rowsProcessed: parseResult.summary.totalRows,
      rowsAdded,
      rowsUpdated,
      status: parseResult.warnings.length > 0 ? 'WARNING' : 'SUCCESS',
      details: `Processed ${parseResult.summary.validRows} valid rows from sheets: ${parseResult.detectedSheets.join(', ')}`
    });

    return NextResponse.json({
      success: true,
      reportType: parseResult.reportType,
      fileName: file.name,
      detectedSheets: parseResult.detectedSheets,
      detectedDateRange: parseResult.detectedDateRange,
      summary: {
        totalRows: parseResult.summary.totalRows,
        validRows: parseResult.summary.validRows,
        rowsAdded,
        rowsUpdated
      },
      auditLog,
      warnings: parseResult.warnings
    });
  } catch (err: any) {
    console.error('File Ingestion Error:', err);
    return NextResponse.json(
      { error: 'Failed to process file', message: err?.message || 'Unknown ingestion failure.' },
      { status: 500 }
    );
  }
}
