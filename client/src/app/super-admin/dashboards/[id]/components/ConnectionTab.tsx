'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Save, Play, Settings, Check } from 'lucide-react';

interface ConnectionTabProps {
  dashboardId: string;
  dashboard: any;
  refetch: () => void;
}

export default function ConnectionTab({ dashboardId, dashboard, refetch }: ConnectionTabProps) {
  // Connection form states
  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [sslEnabled, setSslEnabled] = useState(false);

  // Messages
  const [connSuccess, setConnSuccess] = useState('');
  const [connError, setConnError] = useState('');

  // Populate connection details on load
  useEffect(() => {
    if (dashboard?.connection) {
      setHost(dashboard.connection.host || '');
      setPort(String(dashboard.connection.port || '3306'));
      setUsername(dashboard.connection.username || '');
      setDatabase(dashboard.connection.database || '');
      setSslEnabled(!!dashboard.connection.sslEnabled);
    }
  }, [dashboard]);

  // Mutations
  const saveConnectionMutation = useMutation({
    mutationFn: (conn: any) => api.post(`/dashboards/${dashboardId}/connection`, conn),
    onSuccess: () => {
      setConnSuccess('Database connection settings saved successfully.');
      setConnError('');
      refetch();
    },
    onError: (err: any) => {
      setConnError(err.response?.data?.error || 'Failed to save connection credentials');
      setConnSuccess('');
    }
  });

  const introspectMutation = useMutation({
    mutationFn: () => api.post(`/dashboards/${dashboardId}/introspect`),
    onSuccess: () => {
      setConnSuccess('Live introspection sync completed successfully. Tables synchronized.');
      setConnError('');
      refetch();
    },
    onError: (err: any) => {
      setConnError(err.response?.data?.error || 'Database introspection failed. Verify connection settings.');
      setConnSuccess('');
    }
  });

  const handleConnectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConnSuccess('');
    setConnError('');
    saveConnectionMutation.mutate({
      host,
      port: parseInt(port),
      username,
      password: password || undefined, // send only if modified
      database,
      sslEnabled
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 bg-white border border-card-border rounded-2xl p-6.5 shadow-md space-y-6">
        <h2 className="text-lg font-bold text-text-main">Database Credentials</h2>
        
        {connSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl flex items-center gap-2.5">
            <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span className="font-semibold leading-relaxed">{connSuccess}</span>
          </div>
        )}
        {connError && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-xl leading-relaxed">
            {connError}
          </div>
        )}

        <form onSubmit={handleConnectionSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Host Server</label>
            <input
              type="text"
              required
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
              placeholder="127.0.0.1"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Port</label>
            <input
              type="number"
              required
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
              placeholder="3306"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Database Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
              placeholder="root"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
              Password <span className="text-slate-400 font-normal lowercase">(skip update if blank)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Database Name</label>
            <input
              type="text"
              required
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
              placeholder="sales_db"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="inline-flex items-center text-sm font-semibold text-text-muted gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sslEnabled}
                onChange={(e) => setSslEnabled(e.target.checked)}
                className="h-4.5 w-4.5 rounded border-card-border bg-white text-indigo-600 focus:ring-indigo-500"
              />
              Secure SSL Connection Required
            </label>
          </div>

          <div className="sm:col-span-2 pt-4 border-t border-card-border flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saveConnectionMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>

            <button
              type="button"
              onClick={() => introspectMutation.mutate()}
              disabled={introspectMutation.isPending || !dashboard?.connection}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {introspectMutation.isPending ? 'Syncing Schema...' : 'Trigger Live Introspection'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-card-border p-6 flex flex-col justify-between shadow-md">
        <div>
          <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
            <Settings className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-text-main font-bold text-base mb-2">Dev Sandboxing Note</h3>
          <p className="text-text-muted text-xs leading-relaxed mb-4">
            Use the mock customer database provided by your local MySQL installation to test dashboard generation.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-card-border font-mono text-[11px] text-slate-600 space-y-2">
            <div><span className="text-slate-400 uppercase tracking-widest text-[9px] block">Host:</span><span className="text-indigo-600 font-bold">127.0.0.1</span></div>
            <div className="border-t border-slate-200 pt-1.5"><span className="text-slate-400 uppercase tracking-widest text-[9px] block">Port:</span><span className="text-indigo-600 font-bold">3306</span></div>
            <div className="border-t border-slate-200 pt-1.5"><span className="text-slate-400 uppercase tracking-widest text-[9px] block">User:</span><span className="text-indigo-600 font-bold">YOUR_USER</span></div>
            <div className="border-t border-slate-200 pt-1.5"><span className="text-slate-400 uppercase tracking-widest text-[9px] block">Database:</span><span className="text-emerald-700 font-bold">dashmint_customer</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
