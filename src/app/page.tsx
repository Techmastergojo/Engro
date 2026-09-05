import Link from 'next/link';
import { 
  Database, 
  Radio, 
  Activity, 
  Fuel, 
  UploadCloud, 
  ArrowUpRight, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Zap,
  Server
} from 'lucide-react';
import { db } from '@/lib/db/database';

export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  const stats = db.getDatabaseStats();
  const payload = db.getSyncPayload();
  const audits = db.getAuditLogs(6);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-950 p-8 border border-teal-800/40 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-teal-950 text-teal-400 border border-teal-700/50 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
              <Zap className="w-3.5 h-3.5 text-teal-400" />
              <span>ENGRO ENFRASHARE DATA OPERATIONS</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Enterprise Telecom Data Portal & API Hub
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Ingest, validate, and append mission-critical operational Excel reports into encrypted SQL storage. Automatically feeds live daily NAR, fueling, and site status telemetry to the mobile app fleet without requiring APK updates.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link 
              href="/upload" 
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105 text-sm"
            >
              <UploadCloud className="w-4 h-4 text-slate-950" />
              <span>Ingest New Reports</span>
            </Link>
            <Link 
              href="/api-keys" 
              className="inline-flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>API Authorization</span>
            </Link>
          </div>
        </div>
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Top 4 Real-time KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sites Master</span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Radio className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{payload.summary.totalSites.toLocaleString()}</span>
            <span className="text-xs text-teal-400 font-semibold">{payload.summary.platinumSites} Platinum</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {stats.totalSitesMaster > 0 ? 'Synchronized with SQL Master' : 'Awaiting first Site Master upload'}
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cluster 4 Average NAR</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-emerald-400">{payload.summary.cluster4Nar}%</span>
            <span className="text-xs text-slate-400">Target: 99.0%</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Last NAR Date: <span className="text-slate-300 font-mono">{payload.summary.lastNarDate}</span>
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Downtime</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-white">{payload.summary.totalDowntimeHours.toLocaleString()}</span>
            <span className="text-xs text-rose-400 font-semibold">Hours</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {stats.totalOutageTickets} Classified Outage Incidents
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fuel Activity Total</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-400">{payload.summary.totalFuelDelivered.toLocaleString()}</span>
            <span className="text-xs text-slate-400">Liters</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Last Fuel Date: <span className="text-slate-300 font-mono">{payload.summary.lastFuelDate}</span>
          </p>
        </div>
      </div>

      {/* 3 Dedicated Ingestion Pipelines */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Operational Report Pipelines</h2>
            <p className="text-xs text-slate-400">3 specialized ingestion modules with smart overlap, append, and range merging</p>
          </div>
          <Link href="/upload" className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center space-x-1">
            <span>Open Ingestion Center</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pipeline 1: Site Master */}
          <div className="glass-card p-6 rounded-2xl border-l-4 border-l-teal-500 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800/60">
                  Overlap Mode (Upsert)
                </span>
                <Radio className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="font-bold text-base text-white">Report 1: Site Master & Status</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ingests site catalogs, Platinum / VIP classifications, tenancy, power grid configs, and coordinates. Overwrites and refreshes site master statuses.
              </p>
              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Current Records:</span>
                  <span className="text-white font-mono">{stats.totalSitesMaster} sites</span>
                </div>
                <div className="flex justify-between">
                  <span>Platinum Tier:</span>
                  <span className="text-teal-400 font-mono">{payload.summary.platinumSites} sites</span>
                </div>
              </div>
            </div>
            <Link 
              href="/upload?type=SITE_MASTER" 
              className="w-full py-2 px-3 text-center bg-teal-950/80 hover:bg-teal-900 border border-teal-700/60 rounded-xl text-xs font-semibold text-teal-300 transition-all flex items-center justify-center space-x-2"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Site Master</span>
            </Link>
          </div>

          {/* Pipeline 2: NAR Performance */}
          <div className="glass-card p-6 rounded-2xl border-l-4 border-l-emerald-500 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  Smart Append (Merge)
                </span>
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-base text-white">Report 2: NAR Performance</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ingests 1-day or 1-month workbooks. Appends daily downtime and NAR metrics, merges MBU performance, and updates 6-month historical graphs without erasing history.
              </p>
              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Daily Metric Rows:</span>
                  <span className="text-white font-mono">{stats.totalNarDailyRecords.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Outage Incidents:</span>
                  <span className="text-emerald-400 font-mono">{stats.totalOutageTickets}</span>
                </div>
              </div>
            </div>
            <Link 
              href="/upload?type=NAR_PERFORMANCE" 
              className="w-full py-2 px-3 text-center bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 rounded-xl text-xs font-semibold text-emerald-300 transition-all flex items-center justify-center space-x-2"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload NAR Performance</span>
            </Link>
          </div>

          {/* Pipeline 3: Fuel Activity */}
          <div className="glass-card p-6 rounded-2xl border-l-4 border-l-amber-500 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                  Smart Append (Merge)
                </span>
                <Fuel className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-bold text-base text-white">Report 3: Fueling & Genset Activity</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ingests daily fuel additions, generator running hours, fuel burns, and current balances. Appends new logs and extends fueling history seamlessly.
              </p>
              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                <div className="flex justify-between">
                  <span>Fuel Logs:</span>
                  <span className="text-white font-mono">{stats.totalFuelLogs.toLocaleString()} logs</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Delivered:</span>
                  <span className="text-amber-400 font-mono">{payload.summary.totalFuelDelivered.toLocaleString()} L</span>
                </div>
              </div>
            </div>
            <Link 
              href="/upload?type=FUEL_ACTIVITY" 
              className="w-full py-2 px-3 text-center bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 rounded-xl text-xs font-semibold text-amber-300 transition-all flex items-center justify-center space-x-2"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Fuel Activity</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Ingestion History & Audit Log */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h2 className="text-base font-bold text-white">Recent Ingestion Audit Trail</h2>
          </div>
          <Link href="/audit" className="text-xs text-teal-400 hover:text-teal-300 font-semibold">
            View All Audit Logs
          </Link>
        </div>

        {audits.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            No report uploads logged yet. Upload your first Excel workbook from the Ingestion Hub.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3 rounded-l-lg">Report Type</th>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Detected Dates</th>
                  <th className="p-3 text-right">Rows Added</th>
                  <th className="p-3 text-right">Rows Updated</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 rounded-r-lg text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {audits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-semibold text-teal-300">{a.reportType}</td>
                    <td className="p-3 text-slate-200 font-mono">{a.fileName}</td>
                    <td className="p-3 text-slate-400">{a.detectedDateRange || 'N/A'}</td>
                    <td className="p-3 text-right font-mono text-emerald-400">+{a.rowsAdded}</td>
                    <td className="p-3 text-right font-mono text-blue-400">{a.rowsUpdated}</td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>SUCCESS</span>
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-500 font-mono">
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
