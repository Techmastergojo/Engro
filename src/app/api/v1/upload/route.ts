import { NextRequest, NextResponse } from 'next/server';
import { parseReportFile } from '@/lib/parser/excelParser';
import { db } from '@/lib/db/database';
import type { ReportType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let reportType: ReportType = 'NAR_PERFORMANCE';
    let fileName = 'Uploaded_Report.xlsx';
    let fileSizeBytes = 0;
    let detectedSheets: string[] = [];
    let detectedDateRange: string | undefined = undefined;

    let rowsAdded = 0;
    let rowsUpdated = 0;
    let totalRows = 0;
    let validRows = 0;
    let warnings: string[] = [];

    if (contentType.includes('application/json')) {
      // 1. DIRECT JSON INGESTION (Fast & Reliable from Client Parser, with batching support)
      const body = await req.json();
      reportType = body.reportType || 'NAR_PERFORMANCE';
      fileName = body.fileName || 'Report.xlsx';
      fileSizeBytes = body.fileSizeBytes || 0;
      detectedSheets = body.detectedSheets || [];
      detectedDateRange = body.detectedDateRange;

      const isBatch = body.isBatch === true;
      const isLastBatch = body.isLastBatch !== false; // defaults to true if not specified
      const batchIndex = body.batchIndex ?? 0;
      const totalBatches = body.totalBatches ?? 1;

      if (reportType === 'SITE_MASTER' && body.siteMasterRecords) {
        const res = db.upsertSiteMasterRecords(body.siteMasterRecords);
        rowsAdded = res.added;
        rowsUpdated = res.updated;
        totalRows = body.siteMasterRecords.length;
        validRows = body.siteMasterRecords.length;
      } else if (reportType === 'NAR_PERFORMANCE') {
        if (body.narDailyRecords && body.narDailyRecords.length > 0) {
          const res = db.appendNarDailyRecords(body.narDailyRecords);
          rowsAdded += res.added;
          rowsUpdated += res.updated;
          totalRows += body.narDailyRecords.length;
          validRows += body.narDailyRecords.length;
        }
        if (body.narMbuSummaries && body.narMbuSummaries.length > 0) {
          const res = db.appendNarMbuSummaries(body.narMbuSummaries);
          rowsAdded += res.added;
          rowsUpdated += res.updated;
        }
        if (body.narOutageTickets && body.narOutageTickets.length > 0) {
          const res = db.appendNarOutageTickets(body.narOutageTickets);
          rowsAdded += res.added;
          totalRows += body.narOutageTickets.length;
          validRows += body.narOutageTickets.length;
        }
      } else if (reportType === 'FUEL_ACTIVITY' && body.fuelLogs) {
        const res = db.appendFuelLogs(body.fuelLogs);
        rowsAdded = res.added;
        rowsUpdated = res.updated;
        totalRows = body.fuelLogs.length;
        validRows = body.fuelLogs.length;
      }

      // If this is an intermediate batch in a multi-batch upload, return fast acknowledgment
      if (isBatch && !isLastBatch) {
        return NextResponse.json({
          success: true,
          inProgress: true,
          batchIndex,
          totalBatches,
          rowsAdded,
          rowsUpdated,
          totalRows
        });
      }

      // If client provided cumulative totals for the whole batch sequence
      if (body.cumulativeStats) {
        rowsAdded += (body.cumulativeStats.rowsAdded || 0);
        rowsUpdated += (body.cumulativeStats.rowsUpdated || 0);
        totalRows = body.cumulativeStats.totalRows || totalRows;
        validRows = body.cumulativeStats.validRows || validRows;
      }

    } else {
      // 2. MULTIPART FORM-DATA (Raw File Upload fallback for smaller files)
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const forcedType = formData.get('reportType') as ReportType | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided in request.' }, { status: 400 });
      }

      fileName = file.name;
      fileSizeBytes = file.size;
      const buffer = Buffer.from(await file.arrayBuffer());
      const parseResult = parseReportFile(buffer, file.name, forcedType || undefined);

      reportType = parseResult.reportType;
      detectedSheets = parseResult.detectedSheets;
      detectedDateRange = parseResult.detectedDateRange;
      totalRows = parseResult.summary.totalRows;
      validRows = parseResult.summary.validRows;
      warnings = parseResult.warnings;

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
        rowsAdded += res.added;
        rowsUpdated += res.updated;
      }
    }

    // Record audit log entry
    const auditLog = db.addAuditLog({
      reportType,
      fileName,
      fileSizeBytes,
      detectedDateRange,
      rowsProcessed: totalRows,
      rowsAdded,
      rowsUpdated,
      status: warnings.length > 0 ? 'WARNING' : 'SUCCESS',
      details: `Processed ${validRows} valid rows from sheets: ${detectedSheets.join(', ')}`
    });

    const currentStats = db.getDatabaseStats();

    return NextResponse.json({
      success: true,
      reportType,
      fileName,
      detectedSheets,
      detectedDateRange: detectedDateRange || 'All Dates',
      summary: {
        totalRows,
        validRows,
        rowsAdded,
        rowsUpdated
      },
      auditLog,
      stats: currentStats,
      syncInfo: {
        apiEndpoint: '/api/v1/sync',
        availableImmediately: true,
        propagationTime: 'Available immediately! Active mobile app fleet automatically synchronizes upon next app open or foregrounding (1-3 seconds).',
        timestamp: new Date().toISOString()
      },
      warnings
    });
  } catch (err: any) {
    console.error('File Ingestion Error:', err);
    return NextResponse.json(
      { 
        error: 'Failed to process file', 
        message: err?.message || 'Unknown ingestion failure occurred while processing workbook.' 
      },
      { status: 500 }
    );
  }
}
