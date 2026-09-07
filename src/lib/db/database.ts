import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { 
  SiteMasterRecord, 
  NarDailyRecord, 
  NarMbuSummaryRecord, 
  NarOutageTicket, 
  FuelActivityRecord, 
  ApiKeyRecord, 
  UploadAuditLog,
  SyncPayload
} from '../types';

// Data directory for local SQL/JSON storage
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'engro_portal_database.json');
const TMP_DB_FILE = '/tmp/engro_portal_database.json';

interface DatabaseSchema {
  version: number;
  sitesMaster: Record<string, SiteMasterRecord>;
  narDaily: Record<string, NarDailyRecord>; // key: `${siteCode}_${date}`
  narMbuSummary: Record<string, NarMbuSummaryRecord>; // key: `${mbu}_${month}`
  narOutageTickets: NarOutageTicket[];
  fuelLogs: FuelActivityRecord[];
  apiKeys: Record<string, ApiKeyRecord>;
  auditLogs: UploadAuditLog[];
}

function getDefaultSchema(): DatabaseSchema {
  return {
    version: 1,
    sitesMaster: {},
    narDaily: {},
    narMbuSummary: {},
    narOutageTickets: [],
    fuelLogs: [],
    apiKeys: {
      'default-mobile-key': {
        id: 'default-mobile-key',
        keyPrefix: 'engro_live_',
        hashedKey: crypto.createHash('sha256').update('engro_live_c4_telecom_secret_2026').digest('hex'),
        name: 'Engro Connect Android Mobile App (Default)',
        createdAt: new Date().toISOString(),
        isActive: true
      }
    },
    auditLogs: []
  };
}

class PortalDatabase {
  private db: DatabaseSchema;
  private initialized = false;

  constructor() {
    this.db = getDefaultSchema();
    this.init();
  }

  private init() {
    if (this.initialized) return;
    try {
      // 1. Try local data dir
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.db = { ...getDefaultSchema(), ...JSON.parse(raw) };
        this.initialized = true;
        return;
      }

      // 2. Try /tmp dir (serverless runtime)
      if (fs.existsSync(TMP_DB_FILE)) {
        const raw = fs.readFileSync(TMP_DB_FILE, 'utf-8');
        this.db = { ...getDefaultSchema(), ...JSON.parse(raw) };
        this.initialized = true;
        return;
      }

      this.db = getDefaultSchema();
      this.initialized = true;
    } catch (err) {
      console.error('Failed to initialize database:', err);
      this.db = getDefaultSchema();
      this.initialized = true;
    }
  }

  private save() {
    const jsonStr = JSON.stringify(this.db, null, 2);
    // 1. Save to local data dir if writable
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, jsonStr, 'utf-8');
    } catch (_) {
      // Ignore read-only filesystem error on serverless hosting
    }

    // 2. Save to /tmp for serverless container caching
    try {
      fs.writeFileSync(TMP_DB_FILE, jsonStr, 'utf-8');
    } catch (_) {}
  }

  // ==========================================
  // 1. SITE MASTER & STATUS (UPSERT / OVERWRITE)
  // ==========================================
  public upsertSiteMasterRecords(records: SiteMasterRecord[]): { added: number; updated: number; unchanged: number } {
    this.init();
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const record of records) {
      const key = record.code.trim().toUpperCase();
      const existing = this.db.sitesMaster[key];
      if (existing) {
        const isSame = existing.name === record.name && 
                       existing.mbu === record.mbu && 
                       existing.tier === record.tier && 
                       existing.tenancy === record.tenancy &&
                       existing.gridStatus === record.gridStatus;
        if (isSame) {
          unchanged++;
        } else {
          this.db.sitesMaster[key] = {
            ...existing,
            ...record,
            lastUpdated: new Date().toISOString()
          };
          updated++;
        }
      } else {
        this.db.sitesMaster[key] = {
          ...record,
          code: key,
          lastUpdated: new Date().toISOString()
        };
        added++;
      }
    }

    this.save();
    return { added, updated, unchanged };
  }

  public getAllSites(): SiteMasterRecord[] {
    this.init();
    return Object.values(this.db.sitesMaster);
  }

  public getSiteByCode(code: string): SiteMasterRecord | undefined {
    this.init();
    return this.db.sitesMaster[code.trim().toUpperCase()];
  }

  // ==========================================
  // 2. NAR PERFORMANCE (SMART APPEND & MERGE)
  // ==========================================
  public appendNarDailyRecords(records: NarDailyRecord[]): { added: number; updated: number; unchanged: number } {
    this.init();
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const rec of records) {
      const key = `${rec.siteCode.trim().toUpperCase()}_${rec.date}`;
      const existing = this.db.narDaily[key];
      if (existing) {
        if (existing.narPercentage === rec.narPercentage && existing.downtimeMinutes === rec.downtimeMinutes) {
          unchanged++;
        } else {
          this.db.narDaily[key] = rec;
          updated++;
        }
      } else {
        this.db.narDaily[key] = rec;
        added++;
      }
    }

    this.save();
    return { added, updated, unchanged };
  }

  public appendNarMbuSummaries(records: NarMbuSummaryRecord[]): { added: number; updated: number; unchanged: number } {
    this.init();
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const rec of records) {
      const key = `${rec.mbu.trim().toUpperCase()}_${rec.month}`;
      const existing = this.db.narMbuSummary[key];
      if (existing) {
        if (existing.tdtHours === rec.tdtHours && existing.tnarPercentage === rec.tnarPercentage) {
          unchanged++;
        } else {
          this.db.narMbuSummary[key] = rec;
          updated++;
        }
      } else {
        this.db.narMbuSummary[key] = rec;
        added++;
      }
    }

    this.save();
    return { added, updated, unchanged };
  }

  public appendNarOutageTickets(tickets: NarOutageTicket[]): { added: number; unchanged: number } {
    this.init();
    let added = 0;
    let unchanged = 0;
    for (const t of tickets) {
      const exists = this.db.narOutageTickets.some(
        existing => existing.siteCode === t.siteCode && existing.date === t.date && existing.reason === t.reason
      );
      if (!exists) {
        this.db.narOutageTickets.push(t);
        added++;
      } else {
        unchanged++;
      }
    }
    this.save();
    return { added, unchanged };
  }

  // ==========================================
  // 3. FUEL ACTIVITY (SMART APPEND)
  // ==========================================
  public appendFuelLogs(logs: FuelActivityRecord[]): { added: number; updated: number; unchanged: number } {
    this.init();
    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const log of logs) {
      const existingIdx = this.db.fuelLogs.findIndex(
        l => l.siteCode.toUpperCase() === log.siteCode.toUpperCase() && l.date === log.date
      );

      if (existingIdx >= 0) {
        const existing = this.db.fuelLogs[existingIdx];
        const isSame = existing.fuelAddedLiters === log.fuelAddedLiters && 
                       existing.dgRuntimeHours === log.dgRuntimeHours && 
                       existing.fuelConsumptionLiters === log.fuelConsumptionLiters && 
                       existing.currentBalanceLiters === log.currentBalanceLiters;
        if (isSame) {
          unchanged++;
        } else {
          this.db.fuelLogs[existingIdx] = log;
          updated++;
        }
      } else {
        this.db.fuelLogs.push(log);
        added++;
      }
    }

    this.save();
    return { added, updated, unchanged };
  }

  public getFuelLogs(limit = 500): FuelActivityRecord[] {
    this.init();
    return this.db.fuelLogs.slice(-limit).reverse();
  }

  // ==========================================
  // 4. API KEYS & SECURITY
  // ==========================================
  public createApiKey(name: string): { rawKey: string; record: ApiKeyRecord } {
    this.init();
    const rawSecret = `engro_live_${crypto.randomBytes(24).toString('hex')}`;
    const id = `key_${Date.now()}`;
    const hashedKey = crypto.createHash('sha256').update(rawSecret).digest('hex');

    const record: ApiKeyRecord = {
      id,
      keyPrefix: rawSecret.substring(0, 15) + '...',
      hashedKey,
      name,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    this.db.apiKeys[id] = record;
    this.save();
    return { rawKey: rawSecret, record };
  }

  public validateApiKey(rawKey: string): boolean {
    this.init();
    if (!rawKey) return false;
    const hashed = crypto.createHash('sha256').update(rawKey).digest('hex');

    for (const keyRecord of Object.values(this.db.apiKeys)) {
      if (keyRecord.isActive && keyRecord.hashedKey === hashed) {
        keyRecord.lastUsedAt = new Date().toISOString();
        this.save();
        return true;
      }
    }
    return false;
  }

  public getApiKeys(): ApiKeyRecord[] {
    this.init();
    return Object.values(this.db.apiKeys);
  }

  public toggleApiKey(id: string, isActive: boolean): boolean {
    this.init();
    if (this.db.apiKeys[id]) {
      this.db.apiKeys[id].isActive = isActive;
      this.save();
      return true;
    }
    return false;
  }

  public deleteApiKey(id: string): boolean {
    this.init();
    if (this.db.apiKeys[id]) {
      delete this.db.apiKeys[id];
      this.save();
      return true;
    }
    return false;
  }

  // ==========================================
  // 5. AUDIT LOGS
  // ==========================================
  public addAuditLog(entry: Omit<UploadAuditLog, 'id' | 'timestamp'>): UploadAuditLog {
    this.init();
    const log: UploadAuditLog = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    this.db.auditLogs.unshift(log);
    // Keep last 100 logs
    if (this.db.auditLogs.length > 100) {
      this.db.auditLogs = this.db.auditLogs.slice(0, 100);
    }
    this.save();
    return log;
  }

  public getAuditLogs(limit = 50): UploadAuditLog[] {
    this.init();
    return this.db.auditLogs.slice(0, limit);
  }

  // ==========================================
  // 6. SYNC PAYLOAD (COMPILED FOR MOBILE APP)
  // ==========================================
  public getSyncPayload(): SyncPayload {
    this.init();
    const sites = this.db.sitesMaster;
    const narDaily = Object.values(this.db.narDaily);
    const outageTickets = this.db.narOutageTickets;
    const fuelLogs = this.db.fuelLogs;

    // Group daily metrics by site
    const siteDailyMap: Record<string, Record<string, number>> = {};
    const siteDtMinutesMap: Record<string, number> = {};
    const siteMbuMap: Record<string, string> = {};

    for (const d of narDaily) {
      const code = d.siteCode.toUpperCase();
      if (!siteDailyMap[code]) siteDailyMap[code] = {};
      siteDailyMap[code][d.date] = d.narPercentage;
      siteDtMinutesMap[code] = (siteDtMinutesMap[code] || 0) + (d.downtimeMinutes || 0);
      if (d.mbu) siteMbuMap[code] = d.mbu;
    }

    // Group outage stats by site
    const outageStatsMap: Record<string, { totalDt: number; dtHours: number; count: number; reasons: Record<string, number>; domains: Record<string, number> }> = {};
    for (const t of outageTickets) {
      const code = t.siteCode.toUpperCase();
      if (!outageStatsMap[code]) {
        outageStatsMap[code] = { totalDt: 0, dtHours: 0, count: 0, reasons: {}, domains: {} };
      }
      outageStatsMap[code].totalDt += t.durationMinutes;
      outageStatsMap[code].count += 1;
      outageStatsMap[code].reasons[t.reason] = (outageStatsMap[code].reasons[t.reason] || 0) + 1;
      outageStatsMap[code].domains[t.domain] = (outageStatsMap[code].domains[t.domain] || 0) + 1;
    }

    // Calculate site summary
    const allSiteCodes = Array.from(new Set([
      ...Object.keys(sites),
      ...Object.keys(siteDailyMap)
    ]));

    const compiledSites = allSiteCodes.map(code => {
      const master = sites[code];
      const daily = siteDailyMap[code] || {};
      const dates = Object.keys(daily);
      const totalNar = dates.length > 0 
        ? dates.reduce((acc, dt) => acc + (daily[dt] || 0), 0) / dates.length
        : 100;
      
      const dtMins = siteDtMinutesMap[code] || 0;
      const stats = outageStatsMap[code];
      if (stats) {
        stats.dtHours = Number((stats.totalDt / 60).toFixed(1));
      }

      return {
        code,
        name: master?.name || `Site ${code}`,
        mbu: master?.mbu || siteMbuMap[code] || 'Cluster 4',
        avgNar: Number(totalNar.toFixed(2)),
        dtHours: Number((dtMins / 60).toFixed(1)),
        dtMinutes: dtMins,
        outageStats: stats || null,
        daily
      };
    });

    // MBU Wise aggregation
    const mbuMap: Record<string, { tdtHours: number; tnar: number; sitesCount: number; sumNar: number }> = {};
    for (const s of compiledSites) {
      const m = s.mbu || 'C4-General';
      if (!mbuMap[m]) {
        mbuMap[m] = { tdtHours: 0, tnar: 0, sitesCount: 0, sumNar: 0 };
      }
      mbuMap[m].tdtHours += s.dtHours;
      mbuMap[m].sumNar += s.avgNar;
      mbuMap[m].sitesCount += 1;
    }

    const mbuWise = Object.entries(mbuMap).map(([mbu, data]) => ({
      mbu,
      tdtHours: Number(data.tdtHours.toFixed(1)),
      tnar: data.sitesCount > 0 ? Number((data.sumNar / data.sitesCount).toFixed(2)) : 100,
      sitesCount: data.sitesCount
    }));

    const mbuTotals: Record<string, { tdtHours: number; tdtMinutes: number; tnar: number; totalSites: number }> = {};
    for (const [mbu, data] of Object.entries(mbuMap)) {
      mbuTotals[mbu] = {
        tdtHours: Number(data.tdtHours.toFixed(1)),
        tdtMinutes: Number((data.tdtHours * 60).toFixed(0)),
        tnar: data.sitesCount > 0 ? Number((data.sumNar / data.sitesCount).toFixed(2)) : 100,
        totalSites: data.sitesCount
      };
    }

    const cluster4Nar = mbuWise.length > 0
      ? Number((mbuWise.reduce((acc, m) => acc + m.tnar, 0) / mbuWise.length).toFixed(2))
      : 98.43;

    const totalDowntimeHours = Number(
      compiledSites.reduce((acc, s) => acc + s.dtHours, 0).toFixed(1)
    );

    const platinumCount = Object.values(sites).filter(s => s.tier?.toUpperCase() === 'PLATINUM' || s.tier?.toUpperCase() === 'VIP').length;

    const mbuList = Object.keys(mbuTotals).length > 0
      ? Object.keys(mbuTotals)
      : ['C4-1 Sukkur', 'C4-2 Larkana', 'C4-3 Jacobabad', 'C4-4 Nawabshah', 'C4-5 Mirpurkhas', 'C4-6 Hyderabad', 'C4-7 Kotri', 'C4-8 Badin'];

    // Fuel Stats
    let totalDelivered = 0;
    let totalConsumed = 0;
    let totalDgRunHours = 0;
    const fuelMbuMap: Record<string, { totalDelivered: number; totalConsumed: number; dgHours: number }> = {};

    for (const f of fuelLogs) {
      totalDelivered += f.fuelAddedLiters || 0;
      totalConsumed += f.fuelConsumptionLiters || 0;
      totalDgRunHours += f.dgRuntimeHours || 0;

      const m = f.mbu || 'Cluster 4';
      if (!fuelMbuMap[m]) {
        fuelMbuMap[m] = { totalDelivered: 0, totalConsumed: 0, dgHours: 0 };
      }
      fuelMbuMap[m].totalDelivered += f.fuelAddedLiters || 0;
      fuelMbuMap[m].totalConsumed += f.fuelConsumptionLiters || 0;
      fuelMbuMap[m].dgHours += f.dgRuntimeHours || 0;
    }

    return {
      version: '2026.09-v1',
      generatedAt: new Date().toISOString(),
      summary: {
        totalSites: compiledSites.length,
        platinumSites: platinumCount,
        activeSites: compiledSites.filter(s => s.avgNar > 0).length,
        cluster4Nar,
        totalDowntimeHours,
        totalFuelDelivered: totalDelivered,
        lastNarDate: narDaily.length > 0 ? narDaily[narDaily.length - 1].date : '2026-08-30',
        lastFuelDate: fuelLogs.length > 0 ? fuelLogs[fuelLogs.length - 1].date : '2026-08-30'
      },
      mbuList,
      sites,
      nar: {
        mbuWise,
        mbuTotals,
        c4Total: {
          avgNar: cluster4Nar,
          totalDtHours: totalDowntimeHours,
          totalSites: compiledSites.length
        },
        sites: compiledSites
      },
      fuel: {
        stats: {
          totalDelivered,
          totalConsumed,
          totalDgRunHours: Number(totalDgRunHours.toFixed(1)),
          avgDailyFuel: fuelLogs.length > 0 ? Number((totalDelivered / Math.max(1, new Set(fuelLogs.map(f => f.date)).size)).toFixed(1)) : 0
        },
        mbuWise: fuelMbuMap,
        recentActivities: fuelLogs.slice(-200).reverse()
      }
    };
  }

  public getDatabaseStats() {
    this.init();
    return {
      totalSitesMaster: Object.keys(this.db.sitesMaster).length,
      totalNarDailyRecords: Object.keys(this.db.narDaily).length,
      totalMbuSummaries: Object.keys(this.db.narMbuSummary).length,
      totalOutageTickets: this.db.narOutageTickets.length,
      totalFuelLogs: this.db.fuelLogs.length,
      totalApiKeys: Object.keys(this.db.apiKeys).length,
      totalAuditLogs: this.db.auditLogs.length
    };
  }
}

// Global Singleton
const globalForDb = globalThis as unknown as { engroPortalDb?: PortalDatabase };
export const db = globalForDb.engroPortalDb || new PortalDatabase();
if (process.env.NODE_ENV !== 'production') globalForDb.engroPortalDb = db;
