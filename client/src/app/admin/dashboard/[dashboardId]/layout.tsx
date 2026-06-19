'use client';

import React from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { Table, ChevronRight, LayoutGrid, Layers } from 'lucide-react';
import { formatDisplayName } from '@/lib/utils';

export default function DashboardPortalLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const dashboardId = params.dashboardId as string;

  const { data: dashboard, isLoading: dl, isError } = useQuery<any>({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => api.get(`/dashboards/${dashboardId}`).then((res: any) => res.data)
  });

  // Fetch assigned custom reports
  const { data: reports } = useQuery<any[]>({
    queryKey: ['portal-reports', dashboardId],
    queryFn: () => api.get(`/reports`, { params: { dashboardId } }).then((res: any) => res.data)
  });

  React.useEffect(() => {
    if (isError) {
      router.push('/admin');
    }
  }, [isError, router]);

  if (dl) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // Filter visible tables/models only
  const visibleModels = dashboard?.models?.filter((m: any) => m.isVisible) || [];

  // Determine if a specific table page is active
  const isReportRoute = pathname.includes('/report/');
  const isOverviewRoute = pathname === `/admin/dashboard/${dashboardId}`;
  const activeTableName = !isOverviewRoute && !isReportRoute && pathname.startsWith(`/admin/dashboard/${dashboardId}/`)
    ? pathname.substring(`/admin/dashboard/${dashboardId}/`.length)
    : null;
  const activeModel = activeTableName
    ? visibleModels.find((m: any) => m.name === activeTableName)
    : null;

  return (
    <div className="flex-1 flex min-h-0 min-w-0">
      {/* Sidebar for specific dashboard models */}
      <aside className="w-68 border-r border-sidebar-border bg-sidebar-bg flex flex-col p-6 overflow-y-auto shrink-0 select-none z-10">
        <div className="mb-6 pb-4 border-b border-sidebar-border">
          <Link
            href="/admin"
            className="text-xs font-bold text-text-muted uppercase hover:text-indigo-600 tracking-widest flex items-center gap-1.5 mb-2 transition-colors"
          >
            &larr; Back to Portals
          </Link>
          <h1 className="text-base font-extrabold text-text-main tracking-tight truncate mt-1" title={dashboard?.name}>
            {dashboard?.name}
          </h1>
        </div>

        <div className="space-y-6 flex-1">
          {/* Tables Section */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 font-mono">Database Tables</span>
            
            <Link
              href={`/admin/dashboard/${dashboardId}`}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 border group ${
                pathname === `/admin/dashboard/${dashboardId}`
                  ? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/10 border-indigo-500/20'
                  : 'text-text-muted hover:bg-slate-200/50 hover:text-text-main border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Layers className={`h-4 w-4 shrink-0 transition-all ${
                  pathname === `/admin/dashboard/${dashboardId}` ? 'text-white opacity-90' : 'text-indigo-500 opacity-60 group-hover:opacity-100 group-hover:text-indigo-600'
                }`} />
                <span>Overview</span>
              </div>
              <span className="inline-flex items-center rounded-md bg-indigo-50 group-hover:bg-indigo-150 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 border border-indigo-200 transition-colors">
                {visibleModels.length}
              </span>
            </Link>

            {activeModel && (
              <div className="pl-3 border-l border-indigo-500 ml-4 mt-1.5 animate-fadeIn">
                <span className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-xs">
                  <Table className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                  <span className="truncate">{formatDisplayName(activeModel.displayName || activeModel.name)}</span>
                </span>
              </div>
            )}
          </div>

          {/* Reports Section */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 font-mono">Custom Reports</span>
            
            {reports && reports.length > 0 ? (
              <div className="space-y-1">
                {reports.map((report: any) => {
                  const reportUrl = `/admin/dashboard/${dashboardId}/report/${report.id}`;
                  const isReportActive = pathname === reportUrl;
                  return (
                    <Link
                      key={report.id}
                      href={reportUrl}
                      className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all border ${
                        isReportActive
                          ? 'bg-indigo-50 border-indigo-100 text-indigo-700 font-bold'
                          : 'text-text-muted hover:bg-slate-200/50 hover:text-text-main border-transparent'
                      }`}
                    >
                      <Layers className={`h-3.5 w-3.5 shrink-0 ${isReportActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="truncate" title={report.name}>{report.name}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-text-muted italic px-3 py-2 font-medium">No assigned reports.</p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Table Screen Viewport */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0 bg-bg-main">
        {children}
      </main>
    </div>
  );
}
