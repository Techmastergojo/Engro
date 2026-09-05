const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'engro_portal_database.json');

const perfFile = path.join(rootDir, 'C4 Overall Performance Aug-2026 (3).xlsx');
const fuelFile = path.join(rootDir, 'C-4 Daily Deodar Fuel Activity Report 30th August-2026.xlsx');
const csvFile = path.join(rootDir, 'Engro Enfrashare.csv');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('--- Initializing Engro Portal Database Baseline Seed ---');

let db = {
  version: 1,
  sitesMaster: {},
  narDaily: {},
  narMbuSummary: {},
  narOutageTickets: [],
  fuelLogs: [],
  apiKeys: {
    'default-mobile-key': {
      id: 'default-mobile-key',
      keyPrefix: 'engro_live_c4...',
      hashedKey: crypto.createHash('sha256').update('engro_live_c4_telecom_secret_2026').digest('hex'),
      name: 'Engro Connect Android Mobile App (Default)',
      createdAt: new Date().toISOString(),
      isActive: true
    }
  },
  auditLogs: []
};

// 1. Seed Site Master from CSV
if (fs.existsSync(csvFile)) {
  console.log('Seeding Site Master from Engro Enfrashare.csv...');
  const text = fs.readFileSync(csvFile, 'utf-8');
  const lines = text.split('\n');
  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const code = (parts[0] || '').trim().toUpperCase();
    if (code && code !== 'SITE ID' && code !== 'TOTAL') {
      db.sitesMaster[code] = {
        code,
        name: (parts[1] || `Site ${code}`).trim(),
        mbu: (parts[2] || 'Cluster 4').trim(),
        tier: (parts[3] || 'STANDARD').toUpperCase().includes('PLATINUM') ? 'PLATINUM' : 'STANDARD',
        tenancy: (parts[4] || 'Single').trim(),
        status: 'ACTIVE',
        lastUpdated: new Date().toISOString()
      };
      count++;
    }
  }
  console.log(`Seeded ${count} sites to Site Master.`);
}

// 2. Seed NAR Performance
if (fs.existsSync(perfFile)) {
  console.log('Seeding NAR Performance from Excel...');
  try {
    const wb = XLSX.readFile(perfFile, { cellDates: true });
    
    // MBUWiseContribution
    if (wb.SheetNames.includes('MBUWiseContribution')) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['MBUWiseContribution'], { header: 1 });
      for (let i = 1; i <= Math.min(8, rows.length - 1); i++) {
        const r = rows[i];
        if (r && r[0] && String(r[0]).startsWith('C4-')) {
          const mbuName = String(r[0]).trim();
          const tdt = typeof r[1] === 'number' ? r[1] : 0;
          let tnar = typeof r[2] === 'number' ? r[2] : 0;
          if (tnar <= 1.0) tnar = Number((tnar * 100).toFixed(2));
          db.narMbuSummary[`${mbuName}_2026-08`] = {
            mbu: mbuName,
            month: '2026-08',
            tdtHours: Number((tdt / 60).toFixed(1)),
            tnarPercentage: tnar,
            totalSites: 0
          };
        }
      }
    }

    // Site NAR-Day
    if (wb.SheetNames.includes('Site NAR-Day')) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['Site NAR-Day'], { header: 1 });
      const headerRow = rows[0] || [];
      const dateCols = [];
      for (let c = 5; c < headerRow.length; c++) {
        const val = headerRow[c];
        if (val) {
          const dStr = val instanceof Date ? val.toISOString().split('T')[0] : String(val).trim();
          dateCols.push({ colIdx: c, dateStr: dStr });
        }
      }

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[0]) continue;
        const code = String(r[0]).trim().toUpperCase();
        if (!code || code === 'TOTAL' || code === 'SITE ID') continue;
        const mbu = (r[2] ? String(r[2]).trim() : '') || 'Cluster 4';

        for (const col of dateCols) {
          const raw = r[col.colIdx];
          if (raw !== undefined && raw !== null && raw !== '') {
            let pct = typeof raw === 'number' ? raw : parseFloat(raw);
            if (!isNaN(pct)) {
              if (pct <= 1.0) pct = Number((pct * 100).toFixed(2));
              db.narDaily[`${code}_${col.dateStr}`] = {
                siteCode: code,
                date: col.dateStr,
                mbu,
                downtimeMinutes: 0,
                narPercentage: pct
              };
            }
          }
        }
      }
      console.log(`Seeded ${Object.keys(db.narDaily).length} daily NAR records.`);
    }

    // Consolidated RSL (Outage Tickets)
    if (wb.SheetNames.includes('Consolidated RSL Aug-26')) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['Consolidated RSL Aug-26'], { header: 1 });
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[0]) continue;
        const code = String(r[0]).trim().toUpperCase();
        if (!code || code === 'SITE ID') continue;
        const domain = r[10] ? String(r[10]).trim() : 'Operational';
        const reason = r[11] ? String(r[11]).trim() : 'Outage';
        const dur = typeof r[12] === 'number' ? r[12] : 0;
        db.narOutageTickets.push({
          siteCode: code,
          date: '2026-08-30',
          domain,
          reason,
          durationMinutes: dur
        });
      }
      console.log(`Seeded ${db.narOutageTickets.length} outage tickets.`);
    }
  } catch (err) {
    console.warn('Error reading performance workbook for seed:', err.message);
  }
}

// 3. Seed Fuel Logs
if (fs.existsSync(fuelFile)) {
  console.log('Seeding Fuel logs from Excel...');
  try {
    const wb = XLSX.readFile(fuelFile, { cellDates: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let count = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue;
      const code = String(r[0]).trim().toUpperCase();
      if (!code || code === 'TOTAL' || code === 'SITE ID') continue;
      db.fuelLogs.push({
        siteCode: code,
        date: '2026-08-30',
        mbu: r[2] ? String(r[2]).trim() : 'Cluster 4',
        fuelAddedLiters: typeof r[5] === 'number' ? r[5] : 0,
        dgRuntimeHours: typeof r[6] === 'number' ? r[6] : 0,
        fuelConsumptionLiters: typeof r[7] === 'number' ? r[7] : 0,
        currentBalanceLiters: typeof r[8] === 'number' ? r[8] : 0
      });
      count++;
    }
    console.log(`Seeded ${count} fuel logs.`);
  } catch (err) {
    console.warn('Error reading fuel workbook for seed:', err.message);
  }
}

// Add baseline Audit Log
db.auditLogs.push({
  id: 'audit_baseline_seed',
  reportType: 'NAR_PERFORMANCE',
  fileName: 'C4 Overall Performance Aug-2026 (3).xlsx',
  fileSizeBytes: 22067399,
  detectedDateRange: '2026-08-01 to 2026-08-31',
  rowsProcessed: Object.keys(db.narDaily).length,
  rowsAdded: Object.keys(db.narDaily).length,
  rowsUpdated: 0,
  status: 'SUCCESS',
  details: 'Initial system baseline seeding from company operational workbooks.',
  timestamp: new Date().toISOString()
});

fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), 'utf-8');
console.log('Database successfully seeded at:', dbFile);
