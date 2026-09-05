'use client';

import React, { useState, useRef } from 'react';
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
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Check
} from 'lucide-react';
import type { ReportType } from '@/lib/types';
import * as XLSX from 'xlsx';
import Link from 'next/link';

export default function UploadHubPage() {
  const [selectedType, setSelectedType] = useState<ReportType>('NAR_PERFORMANCE');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<{
    sheetNames: string[];
    dateRange?: string;
    totalRows: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    setUploadResult(null);
    setErrorMsg(null);
    setPreviewInfo(null);

    // Fast client-side workbook inspection
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        let dateRange: string | undefined = undefined;
        let totalRows = 0;

        // Auto-detect dates if NAR sheet
        if (workbook.SheetNames.includes('Site NAR-Day')) {
          const ws = workbook.Sheets['Site NAR-Day'];
          const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
          totalRows = rows.length;
          if (rows.length > 0 && rows[0]) {
            const h = rows[0];
            const dates = [];
            for (let c = 5; c < h.length; c++) {
              if (h[c]) dates.push(h[c]);
            }
            if (dates.length > 0) {
              dateRange = `${dates[0]} to ${dates[dates.length - 1]}`;
            }
          }
        } else {
          const ws = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });
          totalRows = rows.length;
        }

        setPreviewInfo({
          sheetNames: workbook.SheetNames,
          dateRange,
          totalRows
        });
      } catch (err) {
        console.warn('Preview inspection error:', err);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleUploadAndCommit = async () => {
    if (!file) return;
    setIsUploading(true);
    setErrorMsg(null);
    setUploadResult(null);
    setUploadProgress('Parsing workbook & validating schemas...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('reportType', selectedType);

      setUploadProgress('Committing records to encrypted SQL Database...');

      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData,
      });

      const responseText = await res.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (_) {
        throw new Error(`Server returned non-JSON response (HTTP ${res.status}): ${responseText.substring(0, 150)}`);
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to upload report');
      }

      setUploadResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during file ingestion.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Title & Info */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 bg-emerald-950 text-emerald-400 border border-emerald-700/50 px-3 py-1 rounded-full text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>SMART MULTI-REPORT INGESTION ENGINE</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          3-in-1 Telecommunications Report Ingestion Hub
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Upload operational Excel/CSV workbooks. The system automatically inspects sheet schemas, validates column mappings, and securely updates or appends data into the SQL database.
        </p>
      </div>

      {/* Step 1: Select Report Pipeline */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Step 1: Select Ingestion Pipeline
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option 1: Site Master */}
          <button
            type="button"
            onClick={() => { setSelectedType('SITE_MASTER'); setUploadResult(null); }}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedType === 'SITE_MASTER'
                ? 'bg-teal-950/70 border-teal-500 shadow-lg shadow-teal-950/50'
                : 'glass-card border-slate-800 hover:border-slate-700 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Radio className={`w-5 h-5 ${selectedType === 'SITE_MASTER' ? 'text-teal-400' : 'text-slate-400'}`} />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                OVERLAP / UPSERT
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">1. Site Master & Status</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Refreshes Site Tiers (Platinum/VIP), Tenancy, DG specs, Grid, and GPS coordinates.
            </p>
          </button>

          {/* Option 2: NAR Performance */}
          <button
            type="button"
            onClick={() => { setSelectedType('NAR_PERFORMANCE'); setUploadResult(null); }}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedType === 'NAR_PERFORMANCE'
                ? 'bg-emerald-950/70 border-emerald-500 shadow-lg shadow-emerald-950/50'
                : 'glass-card border-slate-800 hover:border-slate-700 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Activity className={`w-5 h-5 ${selectedType === 'NAR_PERFORMANCE' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                SMART APPEND
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">2. NAR Performance (Daily/Month)</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Appends daily NAR & downtime, merges MBU tables, and updates 6M trends without erasing history.
            </p>
          </button>

          {/* Option 3: Fuel Activity */}
          <button
            type="button"
            onClick={() => { setSelectedType('FUEL_ACTIVITY'); setUploadResult(null); }}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedType === 'FUEL_ACTIVITY'
                ? 'bg-amber-950/70 border-amber-500 shadow-lg shadow-amber-950/50'
                : 'glass-card border-slate-800 hover:border-slate-700 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Fuel className={`w-5 h-5 ${selectedType === 'FUEL_ACTIVITY' ? 'text-amber-400' : 'text-slate-400'}`} />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                SMART APPEND
              </span>
            </div>
            <h3 className="font-bold text-sm text-white">3. Fueling & Generator Activity</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal">
              Appends daily fuel deliveries, Genset runtime, fuel consumption, and running balances.
            </p>
          </button>
        </div>
      </div>

      {/* Step 2: Drag and Drop Upload Area */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Step 2: Upload Excel / CSV Workbook
        </label>
        
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-teal-400 bg-teal-950/50 scale-[1.01]'
              : 'border-slate-800 hover:border-teal-600/70 bg-slate-900/40 hover:bg-slate-900/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-lg">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {file ? file.name : 'Click to select or drag & drop Excel workbook here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports <span className="font-mono text-teal-300">.xlsx</span>, <span className="font-mono text-teal-300">.xls</span>, and <span className="font-mono text-teal-300">.csv</span> up to 50MB
              </p>
            </div>
            {file && (
              <div className="inline-flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-lg text-xs text-slate-200 border border-slate-700">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Client-Side Preview Card */}
      {previewInfo && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-teal-900/50 text-xs space-y-2">
          <div className="flex items-center justify-between text-teal-300 font-semibold">
            <span>Workbook Inspection Preview</span>
            <span className="font-mono text-slate-400">~{previewInfo.totalRows} rows detected</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-slate-400">Sheets:</span>
            {previewInfo.sheetNames.map(s => (
              <span key={s} className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-mono text-[11px] border border-slate-700">
                {s}
              </span>
            ))}
          </div>
          {previewInfo.dateRange && (
            <div className="text-slate-300">
              Date Scope: <strong className="text-emerald-400 font-mono">{previewInfo.dateRange}</strong>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end space-x-3">
        {file && (
          <button
            type="button"
            onClick={() => { setFile(null); setUploadResult(null); setErrorMsg(null); setPreviewInfo(null); }}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 rounded-xl"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          disabled={!file || isUploading}
          onClick={handleUploadAndCommit}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all ${
            !file || isUploading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 hover:scale-105'
          }`}
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              <span>{uploadProgress || 'Processing...'}</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4 text-slate-950" />
              <span>Validate & Commit to SQL Database</span>
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Ingestion Failure</p>
            <p className="mt-0.5 leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Comprehensive Success Banner with Update Window Notice */}
      {uploadResult && (
        <div className="glass-card p-6 rounded-2xl border-emerald-500/60 space-y-5 shadow-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Report Successfully Committed to SQL</h2>
                <p className="text-xs text-emerald-400">Database synchronized and encrypted</p>
              </div>
            </div>
            <span className="text-xs font-mono text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-700/60">
              PIPELINE: {uploadResult.reportType}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400">File Ingested</span>
              <p className="text-xs font-mono text-white mt-1 truncate" title={uploadResult.fileName}>
                {uploadResult.fileName}
              </p>
            </div>
            <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Date Range</span>
              <p className="text-xs font-mono text-teal-300 mt-1">
                {uploadResult.detectedDateRange || 'Full Dataset'}
              </p>
            </div>
            <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400">New Records Appended</span>
              <p className="text-sm font-bold text-emerald-400 mt-1 font-mono">
                +{uploadResult.summary?.rowsAdded?.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Records Refreshed</span>
              <p className="text-sm font-bold text-blue-400 mt-1 font-mono">
                {uploadResult.summary?.rowsUpdated?.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Real-time Update Window Notice */}
          <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-800/50 text-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-teal-300 font-bold">
              <Clock className="w-4 h-4 text-teal-400" />
              <span>Mobile App Telemetry Synchronization Window</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              <strong>Available Immediately:</strong> Telemetry is committed to the live API endpoint (<code className="font-mono text-teal-300">/api/v1/sync</code>). Active mobile apps automatically pull this fresh data upon next launch or background resume within <strong>1–5 seconds</strong> without requiring any APK update!
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Audit Log Record ID: <span className="font-mono text-slate-300">{uploadResult.auditLog?.id}</span></span>
            </div>
            <Link 
              href="/" 
              className="inline-flex items-center space-x-1 text-xs text-teal-400 hover:text-teal-300 font-semibold"
            >
              <span>View Executive Overview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
