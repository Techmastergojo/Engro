export type ReportType = 'SITE_MASTER' | 'NAR_PERFORMANCE' | 'FUEL_ACTIVITY';

export interface SiteMasterRecord {
  code: string;
  name: string;
  mbu: string;
  tier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'VIP' | 'STANDARD' | string;
  tenancy: string;
  dgCapacity?: string;
  gridStatus?: string;
  latitude?: number;
  longitude?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | string;
  lastUpdated: string;
}

export interface NarDailyRecord {
  siteCode: string;
  date: string; // YYYY-MM-DD
  mbu: string;
  downtimeMinutes: number;
  narPercentage: number;
}

export interface NarMbuSummaryRecord {
  mbu: string;
  month: string; // YYYY-MM
  tdtHours: number;
  tnarPercentage: number;
  totalSites: number;
}

export interface NarOutageTicket {
  ticketId?: string;
  siteCode: string;
  date: string;
  domain: string;
  reason: string;
  durationMinutes: number;
  comments?: string;
}

export interface FuelActivityRecord {
  siteCode: string;
  date: string; // YYYY-MM-DD
  mbu: string;
  fuelAddedLiters: number;
  dgRuntimeHours: number;
  fuelConsumptionLiters: number;
  currentBalanceLiters: number;
  remarks?: string;
}

export interface ApiKeyRecord {
  id: string;
  keyPrefix: string;
  hashedKey: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export interface UploadAuditLog {
  id: string;
  reportType: ReportType;
  fileName: string;
  fileSizeBytes: number;
  detectedDateRange?: string;
  rowsProcessed: number;
  rowsAdded: number;
  rowsUpdated: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  details: string;
  timestamp: string;
}

export interface SyncPayload {
  version: string;
  generatedAt: string;
  summary: {
    totalSites: number;
    platinumSites: number;
    activeSites: number;
    cluster4Nar: number;
    totalDowntimeHours: number;
    totalFuelDelivered: number;
    lastNarDate: string;
    lastFuelDate: string;
  };
  mbuList?: string[];
  sites: Record<string, SiteMasterRecord>;
  nar: {
    mbuWise: Array<{ mbu: string; tdtHours: number; tnar: number; sitesCount: number }>;
    mbuTotals?: Record<string, { tdtMinutes: number; tdtHours: number; tnar: number; totalSites?: number }>;
    c4Total?: { avgNar: number; totalDtHours: number; totalSites: number };
    sites: Array<{
      code: string;
      name: string;
      mbu: string;
      avgNar: number;
      dtHours: number;
      dtMinutes: number;
      outageStats?: {
        totalDt: number;
        dtHours: number;
        count: number;
        reasons: Record<string, number>;
        domains: Record<string, number>;
      } | null;
      daily: Record<string, number>;
    }>;
  };
  fuel: {
    stats: {
      totalDelivered: number;
      totalConsumed: number;
      totalDgRunHours: number;
      avgDailyFuel: number;
    };
    mbuWise: Record<string, { totalDelivered: number; totalConsumed: number; dgHours: number }>;
    recentActivities: FuelActivityRecord[];
  };
}
