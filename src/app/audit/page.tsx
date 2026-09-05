import { db } from '@/lib/db/database';
import { History, CheckCircle2, AlertTriangle, FileSpreadsheet, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AuditPage() {
  const audits = db.getAuditLogs(100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 bg-purple-950 text-purple-400 border border-purple-700/50 px-3 py-1 rounded-full text-xs font-semibold mb-2">
          <History className="w-3.5 h-3.5 text-purple-400" />
          <span>SECURITY & COMPLIANCE AUDIT TRAIL</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Report Ingestion Audit Logs
        </h1>
        <p className="text-xs text-slate-300">
          Immutable logging of every Excel/CSV file processed, schema validations, and database row changes.
        </p>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Ingestion Activity History ({audits.length})
          </span>
          <span className="text-xs text-slate-400 font-mono">Real-time Append Logs</span>
        </div>

        {audits.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p>No audit records yet. All future report uploads will be logged here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3">Log ID</th>
                  <th className="p-3">Report Pipeline</th>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Detected Dates</th>
                  <th className="p-3 text-right">Rows Added</th>
                  <th className="p-3 text-right">Rows Updated</th>
                  <th className="p-3">Details</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {audits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 font-mono text-slate-500">{a.id}</td>
                    <td className="p-3 font-semibold text-teal-300">{a.reportType}</td>
                    <td className="p-3 text-white font-mono">{a.fileName}</td>
                    <td className="p-3 text-slate-400">{a.detectedDateRange || 'N/A'}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">+{a.rowsAdded}</td>
                    <td className="p-3 text-right font-mono font-bold text-blue-400">{a.rowsUpdated}</td>
                    <td className="p-3 text-slate-400 text-[11px] truncate max-w-xs">{a.details}</td>
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
