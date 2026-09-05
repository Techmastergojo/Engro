import { db } from '@/lib/db/database';
import { Activity, AlertTriangle, ArrowUpRight, BarChart3, Radio } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NarIntelligencePage() {
  const payload = db.getSyncPayload();
  const mbuWise = payload.nar.mbuWise;
  const sites = payload.nar.sites;

  // 20 Worst Sites sorted by NAR ascending
  const worstSites = [...sites]
    .filter(s => s.avgNar < 100)
    .sort((a, b) => a.avgNar - b.avgNar)
    .slice(0, 20);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-emerald-950 text-emerald-400 border border-emerald-700/50 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>REPORT 2: NAR PERFORMANCE & OUTAGE INTELLIGENCE</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Cluster 4 NAR & MBU Performance Graphs
          </h1>
          <p className="text-xs text-slate-300">
            Real-time Network Availability Rate (NAR), total downtime hours, and outage cause analytics.
          </p>
        </div>

        <Link
          href="/upload?type=NAR_PERFORMANCE"
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all shadow-md inline-flex items-center space-x-2 self-start"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Append NAR Report</span>
        </Link>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 rounded-2xl space-y-2 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-400 uppercase">C-4 Overall Availability</span>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {payload.summary.cluster4Nar}%
          </div>
          <p className="text-[11px] text-slate-400">Total Analyzed Sites: {sites.length}</p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-2 border-l-4 border-l-rose-500">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Cluster Downtime</span>
          <div className="text-3xl font-black text-white font-mono">
            {payload.summary.totalDowntimeHours.toLocaleString()} <span className="text-xs text-rose-400">Hrs</span>
          </div>
          <p className="text-[11px] text-slate-400">Across all MBU market units</p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-2 border-l-4 border-l-teal-500">
          <span className="text-xs font-semibold text-slate-400 uppercase">Telemetry Date</span>
          <div className="text-2xl font-black text-teal-300 font-mono">
            {payload.summary.lastNarDate}
          </div>
          <p className="text-[11px] text-slate-400">Historical & Daily appended</p>
        </div>
      </div>

      {/* MBU-Wise Performance Bar Chart Section */}
      <div className="glass-card p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">MBU-Wise Performance & Downtime Comparison</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Data Source: MBUWiseContribution</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mbuWise.map((m) => {
            const narWidth = Math.min(100, Math.max(0, m.tnar));
            const isHigh = m.tnar >= 98.0;
            return (
              <div key={m.mbu} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{m.mbu}</span>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="font-mono text-slate-400">DT: <strong className="text-rose-300">{m.tdtHours}h</strong></span>
                    <span className={`font-mono font-bold ${isHigh ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {m.tnar}% NAR
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHigh ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-rose-400'
                    }`}
                    style={{ width: `${narWidth}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{m.sitesCount} Sites Monitored</span>
                  <span>Target: 99.0%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 20 Worst Performing Sites Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Top 20 Worst Performing Sites (High Downtime)
            </h2>
          </div>
          <span className="text-xs text-rose-400 font-medium">Requiring Operational Focus</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Site ID</th>
                <th className="p-3">Site Name</th>
                <th className="p-3">MBU</th>
                <th className="p-3 text-right">Avg NAR</th>
                <th className="p-3 text-right">Total Downtime</th>
                <th className="p-3">Top Outage Cause</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {worstSites.map((site, index) => {
                const topReason = site.outageStats?.reasons 
                  ? Object.entries(site.outageStats.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General Outage'
                  : 'Power Outage';

                return (
                  <tr key={site.code} className="hover:bg-slate-900/40">
                    <td className="p-3 font-mono font-bold text-rose-400">#{index + 1}</td>
                    <td className="p-3 font-mono font-bold text-teal-300">{site.code}</td>
                    <td className="p-3 font-medium text-white">{site.name}</td>
                    <td className="p-3 text-slate-300">{site.mbu}</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-400">{site.avgNar}%</td>
                    <td className="p-3 text-right font-mono text-white">{site.dtHours} hrs</td>
                    <td className="p-3 text-slate-400 truncate max-w-xs">{topReason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
