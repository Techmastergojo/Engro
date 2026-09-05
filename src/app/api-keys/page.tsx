'use client';

import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Copy, Plus, Trash2, Check, RefreshCw, Lock, AlertCircle, Smartphone } from 'lucide-react';
import type { ApiKeyRecord } from '@/lib/types';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/v1/keys');
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() })
      });
      const data = await res.json();
      if (data.rawKey) {
        setCreatedRawKey(data.rawKey);
        setNewKeyName('');
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await fetch('/api/v1/keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: active })
      });
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke and delete this API key? Any mobile app using it will lose access to dynamic sync.')) return;
    try {
      await fetch(`/api/v1/keys?id=${id}`, { method: 'DELETE' });
      fetchKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 bg-blue-950 text-blue-400 border border-blue-700/50 px-3 py-1 rounded-full text-xs font-semibold">
          <Lock className="w-3.5 h-3.5 text-blue-400" />
          <span>ENTERPRISE SECURITY & AUTHORIZATION GATEWAY</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Mobile App API Keys & Access Control
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          All client mobile applications query telemetry using cryptographic API key tokens. Only authorized apps with active keys can pull operational reports from the SQL database.
        </p>
      </div>

      {/* Secret Key Alert when created */}
      {createdRawKey && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500 shadow-2xl space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>New API Key Generated Successfully</span>
          </div>
          <p className="text-xs text-slate-300">
            Copy and store this raw secret key securely. For security reasons, it is encrypted in the database and will <strong>never be shown again</strong>.
          </p>
          <div className="flex items-center space-x-2 bg-slate-950 p-3 rounded-xl border border-emerald-800/80">
            <code className="text-xs font-mono text-emerald-300 flex-1 break-all select-all font-bold">
              {createdRawKey}
            </code>
            <button
              onClick={() => copyToClipboard(createdRawKey)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1 shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Create New Key Box */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Plus className="w-4 h-4 text-blue-400" />
          <span>Generate New Mobile App API Key</span>
        </h2>
        <form onSubmit={handleCreateKey} className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. Field Engineer Mobile Fleet (Android)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={!newKeyName.trim() || loading}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-2 shadow-lg"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
            <span>Generate Key</span>
          </button>
        </form>
      </div>

      {/* Active API Keys List */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Active Authorization Tokens ({keys.length})
          </span>
          <span className="text-xs text-slate-400 font-mono">Header: x-engro-api-key</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {keys.map((k) => (
            <div key={k.id} className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-sm text-white">{k.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    k.isActive 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {k.isActive ? 'ACTIVE' : 'REVOKED'}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                  <span className="font-mono text-teal-400">{k.keyPrefix}</span>
                  <span>Created: {new Date(k.createdAt).toLocaleDateString()}</span>
                  {k.lastUsedAt && <span>Last Used: {new Date(k.lastUsedAt).toLocaleTimeString()}</span>}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleToggle(k.id, !k.isActive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    k.isActive
                      ? 'border-amber-700/60 text-amber-400 hover:bg-amber-950/40'
                      : 'border-emerald-700/60 text-emerald-400 hover:bg-emerald-950/40'
                  }`}
                >
                  {k.isActive ? 'Suspend' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(k.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-900/60 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Code Snippet */}
      <div className="glass-card p-6 rounded-2xl space-y-3">
        <div className="flex items-center space-x-2 text-white font-bold text-xs uppercase tracking-wider">
          <Smartphone className="w-4 h-4 text-teal-400" />
          <span>How Engro Connect Mobile App Syncs Telemetry</span>
        </div>
        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`// Mobile App Background Fetch Request
const response = await fetch("https://your-portal-url.vercel.app/api/v1/sync", {
  headers: {
    "x-engro-api-key": "engro_live_c4_telecom_secret_2026"
  }
});

const dynamicTelemetry = await response.json();
// Automatically refreshes Site Master, NAR Daily graphs, and Fueling without APK update!`}
        </pre>
      </div>
    </div>
  );
}
