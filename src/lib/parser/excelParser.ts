import * as XLSX from 'xlsx';
import type { 
  ReportType, 
  SiteMasterRecord, 
  NarDailyRecord, 
  NarMbuSummaryRecord, 
  NarOutageTicket, 
  FuelActivityRecord 
} from '../types';

export interface ParseResult {
  reportType: ReportType;
  fileName: string;
  detectedSheets: string[];
  detectedDateRange?: string;
  siteMasterRecords?: SiteMasterRecord[];
  narDailyRecords?: NarDailyRecord[];
  narMbuSummaries?: NarMbuSummaryRecord[];
  narOutageTickets?: NarOutageTicket[];
  fuelLogs?: FuelActivityRecord[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
  warnings: string[];
}

function safeFloat(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? fallback : num;
}

function parseDateStr(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // If Excel serial number (e.g. 45535)
  if (/^\d{5}$/.test(str)) {
    const d = new Date((parseInt(str) - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  // If format like "01-Aug-2026" or "1/8/2026"
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return d.toISOString().split('T')[0];
  }
  return str;
}

export function parseReportFile(buffer: Buffer | ArrayBuffer | Uint8Array, fileName: string, forcedType?: ReportType): ParseResult {
  const isArray = buffer instanceof ArrayBuffer || buffer instanceof Uint8Array || (typeof Buffer !== 'undefined' && !Buffer.isBuffer(buffer));
  const workbook = XLSX.read(buffer as any, { 
    type: isArray ? 'array' : 'buffer', 
    cellDates: true 
  });
  const sheetNames = workbook.SheetNames;
  const warnings: string[] = [];

  // Auto-detect Report Type if not forced
  let reportType: ReportType = forcedType || 'SITE_MASTER';
  if (!forcedType) {
    const namesUpper = sheetNames.map(s => s.toUpperCase());
    if (namesUpper.some(s => s.includes('MBUWISE') || s.includes('SITEWISEDT') || s.includes('SITE NAR') || s.includes('NAR'))) {
      reportType = 'NAR_PERFORMANCE';
    } else if (namesUpper.some(s => s.includes('FUEL') || s.includes('DEODAR FUEL') || s.includes('DAILY FUEL'))) {
      reportType = 'FUEL_ACTIVITY';
    } else if (fileName.toLowerCase().includes('fuel')) {
      reportType = 'FUEL_ACTIVITY';
    } else if (fileName.toLowerCase().includes('nar') || fileName.toLowerCase().includes('performance')) {
      reportType = 'NAR_PERFORMANCE';
    }
  }

  // ==========================================
  // PARSE REPORT 1: SITE MASTER (OVERLAP/UPSERT)
  // ==========================================
  if (reportType === 'SITE_MASTER') {
    const siteMasterRecords: SiteMasterRecord[] = [];
    
    // Search across sheets if first sheet is index/meta
    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
      if (!rows || rows.length === 0) continue;

      // Find header index
      let headerIdx = -1;
      for (let i = 0; i < Math.min(15, rows.length); i++) {
        const rowStr = JSON.stringify(rows[i] || '').toUpperCase();
        if (rowStr.includes('SITE') || rowStr.includes('CODE') || rowStr.includes('NAME') || rowStr.includes('MBU')) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) continue;

      const headers: string[] = (rows[headerIdx] || []).map((h: any) => String(h || '').trim().toUpperCase());
      const codeIdx = headers.findIndex((h: string) => h.includes('SITE ID') || h.includes('SITE CODE') || h.includes('SITE_ID') || h === 'CODE' || h === 'SITE');
      const nameIdx = headers.findIndex((h: string) => h.includes('SITE NAME') || h.includes('NAME'));
      const mbuIdx = headers.findIndex((h: string) => h.includes('MBU') || h.includes('REGION') || h.includes('CLUSTER'));
      const tierIdx = headers.findIndex((h: string) => h.includes('TIER') || h.includes('CATEGORY') || h.includes('TYPE') || h.includes('PRIORITY') || h.includes('PLATINUM'));
      const tenancyIdx = headers.findIndex((h: string) => h.includes('TENANCY') || h.includes('SHARING') || h.includes('OPERATOR'));
      const dgIdx = headers.findIndex((h: string) => h.includes('DG') || h.includes('GENSET') || h.includes('GENERATOR'));
      const gridIdx = headers.findIndex((h: string) => h.includes('GRID') || h.includes('COMMERCIAL POWER') || h.includes('WAPDA'));
      const latIdx = headers.findIndex((h: string) => h.includes('LAT'));
      const longIdx = headers.findIndex((h: string) => h.includes('LONG') || h.includes('LNG'));

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const codeRaw = codeIdx >= 0 ? row[codeIdx] : row[0];
        if (!codeRaw) continue;
        const code = String(codeRaw).trim().toUpperCase();
        if (!code || code === 'TOTAL' || code === 'SITE ID' || code === 'CODE') continue;

        const name = nameIdx >= 0 && row[nameIdx] ? String(row[nameIdx]).trim() : `Site ${code}`;
        const mbu = mbuIdx >= 0 && row[mbuIdx] ? String(row[mbuIdx]).trim() : 'Cluster 4';
        
        let tier = 'STANDARD';
        if (tierIdx >= 0 && row[tierIdx]) {
          const tStr = String(row[tierIdx]).toUpperCase();
          if (tStr.includes('PLATINUM') || tStr.includes('VIP')) tier = 'PLATINUM';
          else if (tStr.includes('GOLD')) tier = 'GOLD';
          else if (tStr.includes('SILVER')) tier = 'SILVER';
          else tier = tStr;
        }

        const tenancy = tenancyIdx >= 0 && row[tenancyIdx] ? String(row[tenancyIdx]).trim() : 'Single';
        const dgCapacity = dgIdx >= 0 && row[dgIdx] ? String(row[dgIdx]).trim() : undefined;
        const gridStatus = gridIdx >= 0 && row[gridIdx] ? String(row[gridIdx]).trim() : undefined;
        const latitude = latIdx >= 0 ? safeFloat(row[latIdx], 0) : undefined;
        const longitude = longIdx >= 0 ? safeFloat(row[longIdx], 0) : undefined;

        siteMasterRecords.push({
          code,
          name,
          mbu,
          tier,
          tenancy,
          dgCapacity,
          gridStatus,
          latitude,
          longitude,
          status: 'ACTIVE',
          lastUpdated: new Date().toISOString()
        });
      }

      if (siteMasterRecords.length > 0) break; // Found main site master sheet
    }

    return {
      reportType: 'SITE_MASTER',
      fileName,
      detectedSheets: sheetNames,
      siteMasterRecords,
      summary: {
        totalRows: siteMasterRecords.length,
        validRows: siteMasterRecords.length,
        errorRows: 0
      },
      warnings
    };
  }

  // ==========================================
  // PARSE REPORT 2: NAR PERFORMANCE (APPEND)
  // ==========================================
  if (reportType === 'NAR_PERFORMANCE') {
    const narDailyRecords: NarDailyRecord[] = [];
    const narMbuSummaries: NarMbuSummaryRecord[] = [];
    const narOutageTickets: NarOutageTicket[] = [];
    const datesFound: Set<string> = new Set();
    const siteMbuMap: Record<string, string> = {};

    // 1. Check for SiteWiseDT / Site info
    for (const sName of sheetNames) {
      if (sName.toUpperCase().includes('SITEWISEDT') || sName.toUpperCase().includes('DT') || sName.toUpperCase().includes('SITE')) {
        const sheet = workbook.Sheets[sName];
        const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0) continue;
          const code = r[0] ? String(r[0]).trim().toUpperCase() : '';
          const mbu = r[2] ? String(r[2]).trim() : (r[1] ? String(r[1]).trim() : 'Cluster 4');
          if (code && code !== 'SITE ID' && code !== 'TOTAL') {
            siteMbuMap[code] = mbu;
          }
        }
      }
    }

    // 2. Scan ALL sheets for Daily NAR matrix or flat rows
    for (const sName of sheetNames) {
      const sheet = workbook.Sheets[sName];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
      if (!rows || rows.length < 2) continue;

      // Check header row (row 0 or find first non-empty header)
      let headerIdx = 0;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        if (rows[i] && rows[i].length > 2) {
          headerIdx = i;
          break;
        }
      }

      const headerRow = rows[headerIdx] || [];
      const dateCols: Array<{ colIdx: number; dateStr: string }> = [];

      // Check if columns 3..N are dates (Matrix layout)
      for (let c = 2; c < headerRow.length; c++) {
        const val = headerRow[c];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          const parsed = parseDateStr(val);
          // Check if parsed looks like a valid date format YYYY-MM-DD or contains date info
          if (parsed && (parsed.includes('-') || parsed.includes('/'))) {
            dateCols.push({ colIdx: c, dateStr: parsed });
            datesFound.add(parsed);
          }
        }
      }

      if (dateCols.length > 0) {
        // Matrix layout: Row has Site ID, columns are dates
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0) continue;
          const code = r[0] ? String(r[0]).trim().toUpperCase() : '';
          if (!code || code === 'TOTAL' || code === 'SITE ID' || code === 'AVERAGE') continue;
          const mbu = (r[2] ? String(r[2]).trim() : '') || siteMbuMap[code] || 'Cluster 4';

          for (const col of dateCols) {
            const rawNar = r[col.colIdx];
            if (rawNar !== undefined && rawNar !== null && rawNar !== '') {
              let narPct = safeFloat(rawNar, 100);
              if (narPct <= 1.0 && narPct > 0) narPct = Number((narPct * 100).toFixed(2));
              narDailyRecords.push({
                siteCode: code,
                date: col.dateStr,
                mbu,
                downtimeMinutes: 0,
                narPercentage: narPct
              });
            }
          }
        }
      } else {
        // Flat Table layout: Columns are [Site ID, Date, NAR%, Downtime]
        const headersUpper: string[] = headerRow.map((h: any) => String(h || '').toUpperCase());
        const siteIdx = headersUpper.findIndex((h: string) => h.includes('SITE') || h.includes('CODE') || h === 'ID');
        const dateIdx = headersUpper.findIndex((h: string) => h.includes('DATE') || h.includes('DAY'));
        const narIdx = headersUpper.findIndex((h: string) => h.includes('NAR') || h.includes('AVAILABILITY') || h.includes('UPTIME'));
        const dtIdx = headersUpper.findIndex((h: string) => h.includes('DOWNTIME') || h.includes('DT') || h.includes('MINUTES'));

        if (siteIdx >= 0 && (narIdx >= 0 || dtIdx >= 0)) {
          for (let i = headerIdx + 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.length === 0) continue;
            const code = r[siteIdx] ? String(r[siteIdx]).trim().toUpperCase() : '';
            if (!code || code === 'TOTAL' || code === 'SITE ID') continue;

            const dateStr = dateIdx >= 0 && r[dateIdx] ? parseDateStr(r[dateIdx]) : new Date().toISOString().split('T')[0];
            datesFound.add(dateStr);

            let narVal = narIdx >= 0 ? safeFloat(r[narIdx], 100) : 100;
            if (narVal <= 1.0 && narVal > 0) narVal = Number((narVal * 100).toFixed(2));
            const dtMins = dtIdx >= 0 ? safeFloat(r[dtIdx], 0) : 0;

            narDailyRecords.push({
              siteCode: code,
              date: dateStr,
              mbu: siteMbuMap[code] || 'Cluster 4',
              downtimeMinutes: dtMins,
              narPercentage: narVal
            });
          }
        }
      }

      // Check for MBU Summaries
      if (sName.toUpperCase().includes('MBU')) {
        for (let i = 1; i <= Math.min(10, rows.length - 1); i++) {
          const r = rows[i];
          if (!r) continue;
          const mbuName = r[0] ? String(r[0]).trim() : '';
          if (mbuName && (mbuName.toUpperCase().startsWith('C4-') || mbuName.toUpperCase().includes('MBU'))) {
            const tdtMins = safeFloat(r[1], 0);
            let tnar = safeFloat(r[2], 0);
            if (tnar <= 1.0 && tnar > 0) tnar = Number((tnar * 100).toFixed(2));
            narMbuSummaries.push({
              mbu: mbuName,
              month: new Date().toISOString().substring(0, 7),
              tdtHours: Number((tdtMins / 60).toFixed(1)),
              tnarPercentage: tnar,
              totalSites: 0
            });
          }
        }
      }

      // Check for Outage Tickets
      if (sName.toUpperCase().includes('RSL') || sName.toUpperCase().includes('OUTAGE') || sName.toUpperCase().includes('TICKET')) {
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0) continue;
          const code = r[0] ? String(r[0]).trim().toUpperCase() : '';
          if (!code || code === 'SITE ID') continue;
          const dateStr = parseDateStr(r[1] || r[2]);
          const domain = r[10] ? String(r[10]).trim() : (r[5] ? String(r[5]).trim() : 'Operational');
          const reason = r[11] ? String(r[11]).trim() : (r[6] ? String(r[6]).trim() : 'Outage');
          const durationMins = safeFloat(r[12] || r[7], 0);

          narOutageTickets.push({
            siteCode: code,
            date: dateStr,
            domain,
            reason,
            durationMinutes: durationMins
          });
        }
      }
    }

    const sortedDates = Array.from(datesFound).sort();
    const detectedDateRange = sortedDates.length > 0 
      ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}` 
      : 'Live Period';

    return {
      reportType: 'NAR_PERFORMANCE',
      fileName,
      detectedSheets: sheetNames,
      detectedDateRange,
      narDailyRecords,
      narMbuSummaries,
      narOutageTickets,
      summary: {
        totalRows: narDailyRecords.length + narOutageTickets.length,
        validRows: narDailyRecords.length + narOutageTickets.length,
        errorRows: 0
      },
      warnings
    };
  }

  // ==========================================
  // PARSE REPORT 3: FUEL ACTIVITY (APPEND)
  // ==========================================
  if (reportType === 'FUEL_ACTIVITY') {
    const fuelLogs: FuelActivityRecord[] = [];
    const datesFound: Set<string> = new Set();

    for (const sName of sheetNames) {
      const sheet = workbook.Sheets[sName];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
      if (!rows || rows.length === 0) continue;

      let headerIdx = 0;
      for (let i = 0; i < Math.min(15, rows.length); i++) {
        const rowStr = JSON.stringify(rows[i] || '').toUpperCase();
        if (rowStr.includes('SITE') || rowStr.includes('FUEL') || rowStr.includes('ACTIVITY') || rowStr.includes('DIESEL')) {
          headerIdx = i;
          break;
        }
      }

      const headers: string[] = (rows[headerIdx] || []).map((h: any) => String(h || '').trim().toUpperCase());
      const codeIdx = headers.findIndex((h: string) => h.includes('SITE') || h.includes('CODE') || h.includes('ID'));
      const dateIdx = headers.findIndex((h: string) => h.includes('DATE') || h.includes('DAY'));
      const mbuIdx = headers.findIndex((h: string) => h.includes('MBU') || h.includes('REGION'));
      const fuelAddedIdx = headers.findIndex((h: string) => h.includes('ADDED') || h.includes('DELIVER') || h.includes('QTY') || h.includes('LITRE') || h.includes('LITERS') || h.includes('POUR'));
      const dgHoursIdx = headers.findIndex((h: string) => h.includes('RUNTIME') || h.includes('HOURS') || h.includes('HR') || h.includes('RUN') || h.includes('DG'));
      const fuelConsIdx = headers.findIndex((h: string) => h.includes('CONSUM') || h.includes('BURN'));
      const balIdx = headers.findIndex((h: string) => h.includes('BALANCE') || h.includes('CLOSING') || h.includes('CURRENT') || h.includes('STOCK'));

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length === 0) continue;
        const codeRaw = codeIdx >= 0 ? r[codeIdx] : r[0];
        if (!codeRaw) continue;
        const code = String(codeRaw).trim().toUpperCase();
        if (!code || code === 'TOTAL' || code === 'SITE ID' || code === 'CODE') continue;

        const dateStr = dateIdx >= 0 && r[dateIdx] ? parseDateStr(r[dateIdx]) : new Date().toISOString().split('T')[0];
        datesFound.add(dateStr);

        const mbu = mbuIdx >= 0 && r[mbuIdx] ? String(r[mbuIdx]).trim() : 'Cluster 4';
        const fuelAddedLiters = fuelAddedIdx >= 0 ? safeFloat(r[fuelAddedIdx], 0) : 0;
        const dgRuntimeHours = dgHoursIdx >= 0 ? safeFloat(r[dgHoursIdx], 0) : 0;
        const fuelConsumptionLiters = fuelConsIdx >= 0 ? safeFloat(r[fuelConsIdx], 0) : 0;
        const currentBalanceLiters = balIdx >= 0 ? safeFloat(r[balIdx], 0) : 0;

        fuelLogs.push({
          siteCode: code,
          date: dateStr,
          mbu,
          fuelAddedLiters,
          dgRuntimeHours,
          fuelConsumptionLiters,
          currentBalanceLiters
        });
      }

      if (fuelLogs.length > 0) break;
    }

    const sortedDates = Array.from(datesFound).sort();
    const detectedDateRange = sortedDates.length > 0 
      ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}` 
      : 'All Dates';

    return {
      reportType: 'FUEL_ACTIVITY',
      fileName,
      detectedSheets: sheetNames,
      detectedDateRange,
      fuelLogs,
      summary: {
        totalRows: fuelLogs.length,
        validRows: fuelLogs.length,
        errorRows: 0
      },
      warnings
    };
  }

  return {
    reportType,
    fileName,
    detectedSheets: sheetNames,
    summary: { totalRows: 0, validRows: 0, errorRows: 0 },
    warnings: ['No recognized records found in workbook.']
  };
}
