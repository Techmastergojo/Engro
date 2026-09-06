import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Engro Connect - Data Operations & Report Ingestion Hub',
  description: 'Enterprise Telecom Data Portal for Site Master, NAR Performance, and Fueling Activity',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-teal-500 selection:text-slate-950">
        {/* Top Header */}
        <header className="border-b border-teal-900/30 bg-slate-900/70 backdrop-blur-md px-6 py-4 sticky top-0 z-30 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-400/40 flex items-center justify-center text-teal-400 font-extrabold text-base shadow-md">
                EC
              </div>
              <div>
                <h1 className="font-bold text-base tracking-wide text-white leading-tight flex items-center gap-2">
                  <span>ENGRO ENFRASHARE</span>
                  <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-700/50 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    Data Operations
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-medium">Cluster 4 Telemetry & Report Ingestion Hub</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-slate-950/80 border border-teal-900/40 px-3 py-1.5 rounded-xl text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300 font-mono text-[11px]">SQL Sync: Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Single-Section Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          {children}
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
          <p>Engro Enfrashare Telecommunications · Real-time SQL Database Sync Engine</p>
        </footer>
      </body>
    </html>
  );
}
