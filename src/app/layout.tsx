import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { 
  Database, 
  UploadCloud, 
  Radio, 
  Activity, 
  Fuel, 
  Key, 
  History, 
  ShieldCheck,
  Server,
  Layers
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Engro Connect Data Portal & Ingestion Hub',
  description: 'Enterprise Telecom Data Management, Multi-Report Ingestion, and Secure Mobile Sync API',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 flex min-h-screen">
        {/* Left Sidebar */}
        <aside className="w-64 bg-slate-900/80 border-r border-teal-900/30 flex flex-col justify-between p-4 sticky top-0 h-screen shrink-0 backdrop-blur-md">
          <div className="space-y-6">
            {/* Brand Header */}
            <div className="flex items-center space-x-3 px-2 py-3 bg-gradient-to-r from-teal-950 to-slate-900 rounded-xl border border-teal-800/40">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-400 font-bold text-lg shadow-lg">
                EC
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-wide text-white leading-tight">ENGRO CONNECT</h1>
                <p className="text-[11px] text-teal-400 font-medium tracking-wider uppercase">Data Web Portal</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1">
                Data Management
              </div>
              <Link 
                href="/" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-teal-900/30 transition-all group"
              >
                <Database className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                <span>Executive Overview</span>
              </Link>
              <Link 
                href="/upload" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/50 transition-all shadow-sm group"
              >
                <UploadCloud className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>3-in-1 Ingestion Hub</span>
              </Link>

              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 pt-4 py-1">
                Telecom Telemetry
              </div>
              <Link 
                href="/sites" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-teal-900/30 transition-all group"
              >
                <Radio className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                <span>Site Master (Platinum/VIP)</span>
              </Link>
              <Link 
                href="/nar" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-teal-900/30 transition-all group"
              >
                <Activity className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                <span>NAR & Outages</span>
              </Link>
              <Link 
                href="/fuel" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-teal-900/30 transition-all group"
              >
                <Fuel className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Fueling & Genset</span>
              </Link>

              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 pt-4 py-1">
                Security & Sync API
              </div>
              <Link 
                href="/api-keys" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-teal-900/30 transition-all group"
              >
                <Key className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Mobile API Keys</span>
              </Link>
              <Link 
                href="/audit" 
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-teal-900/30 transition-all group"
              >
                <History className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Audit Logs</span>
              </Link>
            </nav>
          </div>

          {/* Footer Server Status Card */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-teal-950/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300 font-medium">SQL Engine</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40">ONLINE</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Sync Endpoint:</span>
              <span className="text-teal-400 font-mono">/api/v1/sync</span>
            </div>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
              AES-256 Encrypted & Isolated
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Topbar */}
          <header className="h-16 border-b border-teal-900/30 bg-slate-900/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center space-x-3">
              <Layers className="w-5 h-5 text-teal-400" />
              <span className="font-semibold text-sm text-slate-200">Engro Enfrashare Data Operations</span>
              <span className="text-xs bg-teal-950 text-teal-300 border border-teal-800/50 px-2 py-0.5 rounded-full font-mono">
                Cluster 4 Telemetry
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Protected API</span>
              </div>
              <Link 
                href="/upload" 
                className="flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-lg shadow-teal-900/30 transition-all hover:scale-105"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload New Report</span>
              </Link>
            </div>
          </header>

          {/* Page Body */}
          <div className="p-8 flex-1">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
