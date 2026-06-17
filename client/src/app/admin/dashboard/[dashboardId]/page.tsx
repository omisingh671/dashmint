'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { Database, Table, ArrowRight, Shield, Search, FileSpreadsheet, Layers } from 'lucide-react';
import { formatDisplayName } from '@/lib/utils';

export default function DashboardPortalHome() {
  const params = useParams();
  const dashboardId = params.dashboardId as string;
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Dashboard details & assignments
  const { data: dashboard, isLoading: dl } = useQuery<any>({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => api.get(`/dashboards/${dashboardId}`).then(res => res.data)
  });

  if (dl) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // Filter visible tables/models only
  const visibleModels = dashboard?.models?.filter((m: any) => m.isVisible) || [];

  // Filter models based on search query
  const filteredModels = visibleModels.filter((model: any) => {
    const displayName = formatDisplayName(model.displayName || model.name);
    return (
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Access control details
  const isSuperAdmin = dashboard?.assignments?.length === 0;
  let hasExportPermission = isSuperAdmin;
  if (!isSuperAdmin && dashboard?.assignments?.[0]?.permissionsJson) {
    try {
      const perms = JSON.parse(dashboard.assignments[0].permissionsJson);
      hasExportPermission = perms.export === true;
    } catch (e) {}
  }

  return (
    <div className="flex-1 w-full px-6 lg:px-12 py-10 space-y-8 select-none">
      {/* Premium Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900 p-8 md:p-10 shadow-xl border border-indigo-900/40 text-white">
        <div className="absolute top-[-50%] right-[-10%] w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[10%] w-[200px] h-[200px] rounded-full bg-indigo-600/15 blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 text-xs font-bold font-mono">
              <Database className="h-3.5 w-3.5" />
              Database Portal Active
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
              Welcome to the {dashboard?.name} Portal
            </h1>
            <p className="text-indigo-200/80 max-w-xl text-sm leading-relaxed font-medium">
              {dashboard?.description || 'This is your custom database portal dashboard. Browse sidebar options or use the table cards below to perform dynamic queries, search column records, and export reports.'}
            </p>
          </div>
        </div>

        {/* Dashboard Quick Stats Bar inside banner */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-indigo-900/60 text-xs">
          <div className="space-y-1">
            <p className="text-indigo-300/60 uppercase font-extrabold tracking-widest text-[10px]">Database Name</p>
            <p className="text-base font-bold truncate text-white">{dashboard?.connection?.database || '-'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-indigo-300/60 uppercase font-extrabold tracking-widest text-[10px]">Available Tables</p>
            <p className="text-base font-bold text-white flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-indigo-400" />
              {visibleModels.length} visible tables
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-1">
            <p className="text-indigo-300/60 uppercase font-extrabold tracking-widest text-[10px]">Access Permissions</p>
            <p className="text-base font-bold text-white flex items-center gap-1.5">
              <Shield className="h-4.5 w-4.5 text-indigo-400" />
              {hasExportPermission ? 'Read & Export CSV' : 'Read-Only View'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-text-main tracking-tight">Database Tables List</h2>
            <p className="text-xs text-text-muted mt-1 font-medium">Search or select a table from the connection schema to inspect its rows.</p>
          </div>

          {/* Quick Table Search bar */}
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-text-muted" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border border-card-border bg-white pl-10 pr-4 py-2.5 text-xs text-text-main placeholder-slate-400 shadow-sm"
              placeholder="Search tables..."
            />
          </div>
        </div>

        {/* Responsive Tables Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredModels.length > 0 ? (
            filteredModels.map((model: any) => (
              <Link
                key={model.id}
                href={`/admin/dashboard/${dashboardId}/${model.name}`}
                className="bg-white border border-card-border hover:border-indigo-200 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 group shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 border border-card-border flex items-center justify-center text-text-muted group-hover:text-indigo-600 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                      <Table className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-text-main group-hover:text-indigo-600 transition-colors leading-tight">
                        {formatDisplayName(model.displayName || model.name)}
                      </h3>
                      <p className="text-[10px] text-text-muted font-mono font-medium mt-0.5">
                        Table: {model.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-card-border/60 mt-4.5 pt-3.5 flex items-center justify-between text-xs text-text-muted font-bold">
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    View records
                  </span>
                  <ArrowRight className="h-4.5 w-4.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full border border-dashed border-card-border p-16 text-center text-text-muted rounded-3xl font-medium bg-slate-50/50">
              {searchQuery ? 'No tables found matching your search query.' : 'No visible tables configured for this portal connection.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
