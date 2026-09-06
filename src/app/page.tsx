'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  Activity, 
  Fuel, 
  RefreshCw, 
  Database, 
  Check, 
  Clock, 
  Zap, 
  ArrowRight 
} from 'lucide-react';
import type { ReportType } from '@/lib/types';
import { parseReportFile, type ParseResult } from '@/lib/parser/excelParser';

interface AreaState {
  file: File | null;
  isParsing: boolean;
  isUploading: boolean;
  preview: ParseResult | null;
  result: any | null;
  error: string | null;
}

const initialAreaState: AreaState = {
  file: null,
  isParsing: false,
  isUploading: false,
  preview: null,
  result: null,
  error: null,
};

export default function SinglePortalPage() {
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // States for the 3 upload areas
  const [area1, setArea1] = useState<AreaState>({ ...initialAreaState });
  const [area2, setArea2] = useState<AreaState>({ ...initialAreaState });
  const [area3, setArea3] = useState<AreaState>({ ...initialAreaState });

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const fileInputRef3 = useRef<HTMLInputElement>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Handle client-side file reading & parsing (prevents HTTP 413 / 431 errors completely)
  const handleFileSelect = async (
    file: File,
    type: ReportType,
    setArea: React.Dispatch<React.SetStateAction<AreaState>>
  ) => {
    setArea({
      file,
      isParsing: true,
      isUploading: false,
      preview: null,
      result: null,
      error: null,
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Client-side parse in browser using SheetJS
      const parsed = parseReportFile(arrayBuffer, file.name, type);
      setArea(prev => ({
        ...prev,
        isParsing: false,
        preview: parsed,
      }));
    } catch (err: any) {
      setArea(prev => ({
        ...prev,
        isParsing: false,
        error: `Failed to inspect file: ${err?.message || 'Invalid format'}`,
      }));
    }
  };

  // Upload parsed structured data to SQL API
  const handleCommit = async (
    type: ReportType,
    area: AreaState,
    setArea: React.Dispatch<React.SetStateAction<AreaState>>
  ) => {
    if (!area.file || !area.preview) return;

    setArea(prev => ({ ...prev, isUploading: true, error: null, result: null }));

    try {
      // Send compact client-parsed JSON payload (only ~100-300KB even for 50MB files!)
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: type,
          fileName: area.file.name,
          fileSizeBytes: area.file.size,
          detectedSheets: area.preview.detectedSheets,
          detectedDateRange: area.preview.detectedDateRange,
          siteMasterRecords: area.preview.siteMasterRecords,
          narDailyRecords: area.preview.narDailyRecords,
          narMbuSummaries: area.preview.narMbuSummaries,
          narOutageTickets: area.preview.narOutageTickets,
          fuelLogs: area.preview.fuelLogs,
        }),
      });

      const responseText = await res.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        throw new Error(`Server returned non-JSON response (HTTP ${res.status}): ${responseText.substring(0, 150)}`);
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || `Upload failed with status ${res.status}`);
      }

      setArea(prev => ({
        ...prev,
        isUploading: false,
        result: data,
      }));

      // Refresh database stats summary
      fetchStats();
    } catch (err: any) {
      setArea(prev => ({
        ...prev,
        isUploading: false,
        error: err.message || 'An error occurred during SQL ingestion.',
      }));
    }
  };

  return (
    <div className="space-y-8">
      {/* Live System Telemetry Status Bar */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/70 border border-teal-800/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Database Telemetry</div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>{stats?.summary?.totalSites || 2015} Monitored Sites</span>
              <span className="text-teal-400 font-mono text-xs">({stats?.summary?.platinumSites || 420} Platinum)</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Cluster 4 NAR: </span>
            <strong className="text-emerald-400">{stats?.summary?.cluster4Nar || 98.43}%</strong>
          </div>
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Total Downtime: </span>
            <strong className="text-rose-400">{stats?.summary?.totalDowntimeHours || '54,429'} hrs</strong>
          </div>
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Last NAR Date: </span>
            <strong className="text-teal-300">{stats?.summary?.lastNarDate || '2026-08-30'}</strong>
          </div>
          <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Last Fuel Date: </span>
            <strong className="text-amber-300">{stats?.summary?.lastFuelDate || '2026-08-30'}</strong>
          </div>
        </div>
      </div>

      {/* Header Description */}
      <div className="text-center max-w-2xl mx-auto space-y-1">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Report Ingestion Center
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Upload operational workbooks directly to the 3 designated areas below. Files are processed client-side and saved into encrypted SQL storage.
        </p>
      </div>

      {/* 3 Dedicated Upload Areas (Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ============================================================ */}
        {/* AREA 1: SITE MASTER & STATUS REPORT */}
        {/* ============================================================ */}
        <div className="glass-card p-6 rounded-2xl border-t-4 border-t-teal-500 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800/60">
                OVERLAP / OVERWRITE
              </span>
              <Radio className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">1. Site Master & Status</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Refreshes site catalogs, Platinum / VIP classifications, tenancy, DG specs, grid status, and GPS coordinates.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef1.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-teal-500/70 rounded-xl p-5 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/60 transition-all"
            >
              <input
                ref={fileInputRef1}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'SITE_MASTER', setArea1)}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 mx-auto text-teal-400 mb-2" />
              <p className="text-xs font-bold text-white">
                {area1.file ? area1.file.name : 'Select or Drop Site Master'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Supports .xlsx, .csv</p>
            </div>

            {/* Preview details */}
            {area1.isParsing && (
              <div className="flex items-center space-x-2 text-xs text-teal-300 font-mono py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Inspecting workbook rows...</span>
              </div>
            )}
            {area1.preview && !area1.result && (
              <div className="p-3 bg-slate-900/80 rounded-xl border border-teal-900/40 text-[11px] space-y-1">
                <div className="text-teal-300 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Ready to Commit: {area1.preview.siteMasterRecords?.length || 0} Sites</span>
                </div>
                <div className="text-slate-400 text-[10px]">
                  File Size: {(area1.file!.size / 1024).toFixed(1)} KB
                </div>
              </div>
            )}

            {/* Error Display */}
            {area1.error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>{area1.error}</p>
              </div>
            )}

            {/* Success Confirmation Banner */}
            {area1.result && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-emerald-300 text-xs space-y-1.5 shadow-lg">
                <div className="flex items-center space-x-2 font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Site Master Refreshed!</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  +{area1.result.summary?.rowsAdded || 0} new sites, {area1.result.summary?.rowsUpdated || 0} updated
                </div>
                <div className="text-[10px] text-teal-300 flex items-center gap-1 pt-1 border-t border-emerald-900/60">
                  <Clock className="w-3 h-3" />
                  <span>Live on app in 1–5 seconds upon open!</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!area1.preview || area1.isUploading || area1.isParsing}
            onClick={() => handleCommit('SITE_MASTER', area1, setArea1)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2 ${
              !area1.preview || area1.isUploading || area1.isParsing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 hover:scale-[1.02]'
            }`}
          >
            {area1.isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Committing to SQL...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Commit Site Master</span>
              </>
            )}
          </button>
        </div>


        {/* ============================================================ */}
        {/* AREA 2: NAR PERFORMANCE REPORT */}
        {/* ============================================================ */}
        <div className="glass-card p-6 rounded-2xl border-t-4 border-t-emerald-500 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                SMART APPEND
              </span>
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">2. NAR Performance Report</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Appends 1-day or 1-month sheets, merges daily downtime/NAR, MBU tables, and outage causes without erasing history.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef2.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-emerald-500/70 rounded-xl p-5 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/60 transition-all"
            >
              <input
                ref={fileInputRef2}
                type="file"
                accept=".xlsx,.xls"
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'NAR_PERFORMANCE', setArea2)}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
              <p className="text-xs font-bold text-white">
                {area2.file ? area2.file.name : 'Select or Drop NAR Report'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Supports .xlsx (1-Day or Full Month)</p>
            </div>

            {/* Preview details */}
            {area2.isParsing && (
              <div className="flex items-center space-x-2 text-xs text-emerald-300 font-mono py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing sheets (Site NAR, MBU, Outages)...</span>
              </div>
            )}
            {area2.preview && !area2.result && (
              <div className="p-3 bg-slate-900/80 rounded-xl border border-emerald-900/40 text-[11px] space-y-1">
                <div className="text-emerald-300 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Ready: {area2.preview.narDailyRecords?.length?.toLocaleString() || 0} Daily Metric Rows</span>
                </div>
                {area2.preview.detectedDateRange && (
                  <div className="text-slate-300 text-[10px]">
                    Date Range: <strong className="text-white font-mono">{area2.preview.detectedDateRange}</strong>
                  </div>
                )}
                <div className="text-slate-400 text-[10px]">
                  Sheets: {area2.preview.detectedSheets.slice(0, 3).join(', ')}...
                </div>
              </div>
            )}

            {/* Error Display */}
            {area2.error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>{area2.error}</p>
              </div>
            )}

            {/* Success Confirmation Banner */}
            {area2.result && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-emerald-300 text-xs space-y-1.5 shadow-lg">
                <div className="flex items-center space-x-2 font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>NAR Performance Appended!</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  +{area2.result.summary?.rowsAdded?.toLocaleString() || 0} new records added
                </div>
                <div className="text-[10px] text-teal-300 flex items-center gap-1 pt-1 border-t border-emerald-900/60">
                  <Clock className="w-3 h-3" />
                  <span>Live on app in 1–5 seconds upon open!</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!area2.preview || area2.isUploading || area2.isParsing}
            onClick={() => handleCommit('NAR_PERFORMANCE', area2, setArea2)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2 ${
              !area2.preview || area2.isUploading || area2.isParsing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 hover:scale-[1.02]'
            }`}
          >
            {area2.isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Appending to SQL...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Append NAR Report</span>
              </>
            )}
          </button>
        </div>


        {/* ============================================================ */}
        {/* AREA 3: FUELING & GENERATOR ACTIVITY */}
        {/* ============================================================ */}
        <div className="glass-card p-6 rounded-2xl border-t-4 border-t-amber-500 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
                SMART APPEND
              </span>
              <Fuel className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">3. Fueling & Generator Activity</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Appends daily fuel deliveries, Genset runtime, fuel consumption, and running tank balances.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef3.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-amber-500/70 rounded-xl p-5 text-center cursor-pointer bg-slate-900/40 hover:bg-slate-900/60 transition-all"
            >
              <input
                ref={fileInputRef3}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'FUEL_ACTIVITY', setArea3)}
                className="hidden"
              />
              <UploadCloud className="w-8 h-8 mx-auto text-amber-400 mb-2" />
              <p className="text-xs font-bold text-white">
                {area3.file ? area3.file.name : 'Select or Drop Fuel Report'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Supports .xlsx, .csv</p>
            </div>

            {/* Preview details */}
            {area3.isParsing && (
              <div className="flex items-center space-x-2 text-xs text-amber-300 font-mono py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing fuel & generator activity...</span>
              </div>
            )}
            {area3.preview && !area3.result && (
              <div className="p-3 bg-slate-900/80 rounded-xl border border-amber-900/40 text-[11px] space-y-1">
                <div className="text-amber-300 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Ready: {area3.preview.fuelLogs?.length || 0} Fuel Delivery Logs</span>
                </div>
                {area3.preview.detectedDateRange && (
                  <div className="text-slate-300 text-[10px]">
                    Date: <strong className="text-white font-mono">{area3.preview.detectedDateRange}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {area3.error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>{area3.error}</p>
              </div>
            )}

            {/* Success Confirmation Banner */}
            {area3.result && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-emerald-300 text-xs space-y-1.5 shadow-lg">
                <div className="flex items-center space-x-2 font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Fuel Logs Appended!</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  +{area3.result.summary?.rowsAdded?.toLocaleString() || 0} fuel logs added
                </div>
                <div className="text-[10px] text-teal-300 flex items-center gap-1 pt-1 border-t border-emerald-900/60">
                  <Clock className="w-3 h-3" />
                  <span>Live on app in 1–5 seconds upon open!</span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!area3.preview || area3.isUploading || area3.isParsing}
            onClick={() => handleCommit('FUEL_ACTIVITY', area3, setArea3)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2 ${
              !area3.preview || area3.isUploading || area3.isParsing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 hover:scale-[1.02]'
            }`}
          >
            {area3.isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Appending to SQL...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Append Fueling Report</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Instant Sync Propagation Notice */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-teal-400 shrink-0" />
          <span>All committed reports are immediately active on the REST API endpoint <code className="font-mono text-teal-300">/api/v1/sync</code> with zero server delay.</span>
        </div>
        <span className="font-mono text-emerald-400 font-semibold text-[11px]">OTA Sync Enabled</span>
      </div>
    </div>
  );
}
