import { db } from '@/lib/db/database';
import { Radio, ShieldAlert, Zap, Filter, Search, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function SitesMasterPage() {
  const sites = db.getAllSites();
  const platinumSites = sites.filter(s => s.tier?.toUpperCase() === 'PLATINUM' || s.tier?.toUpperCase() === 'VIP');
  const goldSites = sites.filter(s => s.tier?.toUpperCase() === 'GOLD');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 bg-teal-950 text-teal-400 border border-teal-700/50 px-3 py-1 rounded-full text-xs font-semibold mb-2">
            <Radio className="w-3.5 h-3.5 text-teal-400" />
            <span>REPORT 1: SITE MASTER & STATUS REPOSITORY</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Site Master & Tier Classifications
          </h1>
          <p className="text-xs text-slate-300">
            Current operational site catalog with Platinum/VIP tiers, tenancy, power config, and grid status.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-teal-950/80 border border-teal-800/60 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400">Total Sites: </span>
            <span className="font-bold text-teal-300 font-mono">{sites.length}</span>
          </div>
          <div className="bg-emerald-950/80 border border-emerald-800/60 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400">Platinum/VIP: </span>
            <span className="font-bold text-emerald-300 font-mono">{platinumSites.length}</span>
          </div>
          <Link
            href="/upload?type=SITE_MASTER"
            className="px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all shadow-md"
          >
            Update Site Master
          </Link>
        </div>
      </div>

      {/* Sites Data Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="text-xs font-bold text-white uppercase tracking-wider">
            Site Master Database Records ({sites.length})
          </div>
        </div>

        {sites.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Radio className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p>No site master records in SQL database yet.</p>
            <p className="mt-1 text-slate-500">
              Upload <span className="font-mono text-teal-400">Engro Enfrashare.csv</span> or Site Master Excel sheet from the Ingestion Hub.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="p-3">Site ID</th>
                  <th className="p-3">Site Name</th>
                  <th className="p-3">MBU / Cluster</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Tenancy</th>
                  <th className="p-3">DG Capacity</th>
                  <th className="p-3">Grid Status</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Last Synchronized</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sites.map((site) => {
                  const isPlat = site.tier?.toUpperCase() === 'PLATINUM' || site.tier?.toUpperCase() === 'VIP';
                  return (
                    <tr key={site.code} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-teal-300">{site.code}</td>
                      <td className="p-3 font-medium text-white">{site.name}</td>
                      <td className="p-3 text-slate-300">{site.mbu}</td>
                      <td className="p-3">
                        {isPlat ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/50 shadow-sm">
                            <Zap className="w-3 h-3" />
                            <span>{site.tier}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {site.tier || 'STANDARD'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-400">{site.tenancy || 'Single'}</td>
                      <td className="p-3 text-slate-400 font-mono">{site.dgCapacity || '-'}</td>
                      <td className="p-3 text-slate-400">{site.gridStatus || 'Active'}</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                          <CheckCircle className="w-3 h-3" />
                          <span>ACTIVE</span>
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-500 font-mono">
                        {new Date(site.lastUpdated).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
