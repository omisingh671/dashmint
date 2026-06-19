'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Database, Users, Activity, Clock, Search } from 'lucide-react';

export default function SuperAdminOverview() {
  // Fetch stats using React Query
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // reset page on search
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch stats using React Query
  const { data: dashboards, isLoading: dl } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => api.get('/dashboards').then(res => res.data)
  });

  const { data: admins, isLoading: al } = useQuery({
    queryKey: ['admins'],
    queryFn: () => api.get('/admins').then(res => res.data)
  });

  const { data: auditLogs, isLoading: ll } = useQuery({
    queryKey: ['audit-logs', page, debouncedSearch],
    queryFn: () => api.get('/audit-logs', {
      params: {
        page,
        limit,
        search: debouncedSearch || undefined
      }
    }).then(res => res.data)
  });


  const loading = dl || al || ll;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 rounded"></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="h-96 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  const stats = [
    { name: 'Active Dashboards', value: dashboards?.length || 0, icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100 shadow-sm' },
    { name: 'Admins Registered', value: admins?.length || 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100 shadow-sm' },
    { name: 'Audit Logs Recorded', value: auditLogs?.totalCount || 0, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100 shadow-sm' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-text-main tracking-tight">Overview</h1>
        <p className="text-text-muted mt-1.5 text-sm font-medium">Status and audit log monitoring across the DashMint system.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className={`p-6 rounded-2xl border bg-white flex items-center justify-between shadow-md glow-card transition-all duration-300 ${stat.bg}`}
            >
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{stat.name}</p>
                <h3 className="text-4xl font-black text-text-main mt-3.5 tracking-tight">{stat.value}</h3>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-indigo-600">
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white border border-card-border rounded-2xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-card-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-text-main">Recent System Activity Logs</h2>
          </div>
          
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-text-muted" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-xl border border-card-border bg-white pl-9 pr-3.5 py-2 text-xs text-text-main placeholder-slate-400 shadow-xs"
              placeholder="Search actions, details, actors..."
            />
          </div>
        </div>
        
        <div className="divide-y divide-card-border overflow-x-auto max-h-[500px]">
          {auditLogs?.data && auditLogs.data.length > 0 ? (
            <table className="min-w-full divide-y divide-card-border">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Timestamp</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Action</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Details</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Actor</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border bg-white">
                {auditLogs.data.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-all duration-150">
                    <td className="whitespace-nowrap px-6 py-4.5 text-xs font-semibold font-mono text-text-muted">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-xs font-bold">
                      <span className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-sm text-slate-700 max-w-md truncate font-medium">
                      {log.details}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-sm text-slate-800 font-semibold">
                      {log.user?.email || 'System'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-xs text-text-muted font-mono">
                      {log.ipAddress || 'unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-text-muted font-medium">
              {search ? 'No matching logs found.' : 'No audit logs captured yet. Try navigating or authenticating to generate activity.'}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {auditLogs?.totalCount > 0 && (
          <div className="border-t border-card-border bg-slate-50 px-6 py-4 flex items-center justify-between select-none">
            <div className="text-xs text-text-muted font-medium">
              Showing page <span className="font-bold text-text-main bg-white px-1.5 py-0.5 rounded border border-card-border">{page}</span> of <span className="font-bold text-text-main">{Math.ceil(auditLogs.totalCount / limit) || 1}</span> ({auditLogs.totalCount} total logs)
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-xl bg-white border border-card-border px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main hover:border-slate-350 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(auditLogs.totalCount / limit) || 1, p + 1))}
                disabled={page >= (Math.ceil(auditLogs.totalCount / limit) || 1)}
                className="rounded-xl bg-white border border-card-border px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main hover:border-slate-350 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
