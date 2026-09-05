import { db } from '@/lib/db/database';
import { Fuel, Zap, TrendingUp, Clock, Droplets } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function FuelOperationsPage() {
  const payload = db.getSyncPayload();
  const fuelStats = payload.fuel.stats;
  const fuelMbu = payload.fuel.mbuWise;
  const recentFuel = payload.fuel.recentActivities;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-amber-950 text-amber-400 border border-amber-700/50 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
            <span>REPORT 3: FUEL ACTIVITY & GENSET RUNTIME</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Fuel Logistics & Generator Operations
          </h1>
          <p className="text-xs text-slate-300">
            Diesel delivery logs, generator running hours, fuel burns, and site fuel levels.
          </p>
        </div>

        <Link
          href="/upload?type=FUEL_ACTIVITY"
          className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all shadow-md inline-flex items-center space-x-2 self-start"
        >
          <Fuel className="w-3.5 h-3.5" />
          <span>Append Fuel Report</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 rounded-2xl space-y-2 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Fuel Delivered</span>
            <Droplets className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">
            {fuelStats.totalDelivered.toLocaleString()} <span className="text-xs text-slate-300">Liters</span>
          </div>
          <p className="text-[11px] text-slate-400">Total volume dispatched to C-4 sites</p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-2 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total DG Run Hours</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {fuelStats.totalDgRunHours.toLocaleString()} <span className="text-xs text-orange-400">Hours</span>
          </div>
          <p className="text-[11px] text-slate-400">Recorded generator backup run time</p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-2 border-l-4 border-l-teal-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Avg Daily Consumption</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-black text-teal-300 font-mono">
            {fuelStats.avgDailyFuel.toLocaleString()} <span className="text-xs text-slate-300">L / Day</span>
          </div>
          <p className="text-[11px] text-slate-400">Based on recent operational cycle</p>
        </div>
      </div>

      {/* Fuel Activity Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Fuel className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Recent Fuel Deliveries & Genset Activity ({recentFuel.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Auto-appended from Fuel reports</span>
        </div>

        {recentFuel.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Fuel className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p>No fuel activity logged in SQL database yet.</p>
            <p className="mt-1 text-slate-500">
              Upload <span className="font-mono text-amber-400">C-4 Daily Deodar Fuel Activity Report.xlsx</span> from Ingestion Hub.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="p-3">Site ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">MBU</th>
                  <th className="p-3 text-right">Fuel Added (L)</th>
                  <th className="p-3 text-right">DG Runtime (Hrs)</th>
                  <th className="p-3 text-right">Fuel Consumed (L)</th>
                  <th className="p-3 text-right">Balance (L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentFuel.map((f, i) => (
                  <tr key={`${f.siteCode}_${f.date}_${i}`} className="hover:bg-slate-900/40">
                    <td className="p-3 font-mono font-bold text-teal-300">{f.siteCode}</td>
                    <td className="p-3 text-slate-300 font-mono">{f.date}</td>
                    <td className="p-3 text-slate-400">{f.mbu}</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-400">
                      {f.fuelAddedLiters > 0 ? `+${f.fuelAddedLiters} L` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono text-white">
                      {f.dgRuntimeHours > 0 ? `${f.dgRuntimeHours} hrs` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300">
                      {f.fuelConsumptionLiters > 0 ? `${f.fuelConsumptionLiters} L` : '-'}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400">
                      {f.currentBalanceLiters > 0 ? `${f.currentBalanceLiters} L` : '-'}
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
