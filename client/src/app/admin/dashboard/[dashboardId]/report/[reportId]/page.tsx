'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Download, Search, ChevronUp, ChevronDown, RefreshCw, AlertCircle, Layers } from 'lucide-react';
import { formatDisplayName } from '@/lib/utils';

export default function ReportViewer() {
  const params = useParams();
  const dashboardId = params.dashboardId as string;
  const reportId = params.reportId as string;

  // Search/Sort/Page State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
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

  // Reset page/sorting if report changes
  useEffect(() => {
    setPage(1);
    setSearch('');
    setDebouncedSearch('');
    setSortBy('');
    setSortOrder('ASC');
  }, [reportId]);

  // Fetch current user details
  const { data: userData } = useQuery<any>({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/auth/me').then(res => res.data)
  });
  const user = userData?.user;

  // Fetch Report configuration details
  const { data: report, isLoading: rl } = useQuery<any>({
    queryKey: ['report-config', reportId],
    queryFn: () => api.get(`/reports/${reportId}`).then(res => res.data)
  });

  // Fetch Report dynamic query records using React Query
  const { data: queryData, isLoading: ql, isError, error, refetch } = useQuery<any>({
    queryKey: ['report-records', reportId, page, debouncedSearch, sortBy, sortOrder],
    queryFn: () =>
      api
        .get(`/reports/${reportId}/query`, {
          params: {
            page,
            limit,
            search: debouncedSearch || undefined,
            sortBy: sortBy || undefined,
            sortOrder
          }
        })
        .then(res => res.data),
    placeholderData: (prev: any) => prev,
    enabled: !!reportId
  });

  // Determine export permissions
  const isSuperAdmin = user?.globalRole === 'SUPER_ADMIN';
  const myAssignment = report?.assignments?.find((a: any) => a.userId === user?.id);
  const canExport = isSuperAdmin || myAssignment?.canExport === true;

  const handleSort = (columnName: string) => {
    if (sortBy === columnName) {
      setSortOrder(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(columnName);
      setSortOrder('ASC');
    }
  };

  const handleExportCSV = () => {
    if (!canExport) return;
    
    // Construct download url with current search and sorting configurations
    const url = new URL(`http://localhost:5000/api/reports/${reportId}/export`);
    if (debouncedSearch) url.searchParams.append('search', debouncedSearch);
    if (sortBy) {
      url.searchParams.append('sortBy', sortBy);
      url.searchParams.append('sortOrder', sortOrder);
    }

    // Trigger browser download natively (this will send cookies automatically)
    window.open(url.toString(), '_blank');
  };

  const loading = rl || ql;

  if (isError) {
    return (
      <div className="p-8 flex-1 flex flex-col justify-center items-center">
        <div className="max-w-md bg-red-50 border border-red-200 p-6 rounded-2xl text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-red-650 mx-auto" />
          <h2 className="text-lg font-bold text-red-800">Report Query Failure</h2>
          <p className="text-red-750 text-sm leading-relaxed">
            {String((error as any)?.response?.data?.error || 'Could not query data from the database. Verify relation mappings or fields configuration.')}
          </p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-card-border px-4 py-2 text-xs font-semibold cursor-pointer shadow-sm"
          >
            Retry Query
          </button>
        </div>
      </div>
    );
  }

  const columns = queryData?.columns || [];
  const rows = queryData?.data || [];
  const totalCount = queryData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="p-6 lg:p-10 space-y-6 flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full relative">
      <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[90px] pointer-events-none"></div>

      {/* Title and Actions bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none relative z-10">
        <div>
          <h1 className="text-2xl font-black text-text-main tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-indigo-600" />
            {report?.name || 'Loading Report...'}
          </h1>
          {report?.description && (
            <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-2xl font-medium">
              {report.description}
            </p>
          )}
        </div>
        
        {canExport && (
          <button
            onClick={handleExportCSV}
            disabled={rows.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-4.5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/10 border border-indigo-400/10 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Query Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white border border-card-border rounded-2xl p-4.5 relative z-10 shadow-sm">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="h-4.5 w-4.5 text-text-muted" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-xl border border-card-border bg-white pl-11 pr-4 py-2.5 text-sm text-text-main placeholder-slate-400"
            placeholder="Quick search on string fields..."
          />
        </div>

        <button
          onClick={() => refetch()}
          title="Refresh Data"
          className="p-3 bg-white hover:bg-slate-50 text-text-muted hover:text-text-main rounded-xl border border-card-border cursor-pointer transition-all active:scale-95 shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Data Table Container */}
      <div className="bg-white border border-card-border rounded-2xl flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full shadow-md overflow-hidden relative z-10">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        )}

        <div className="flex-1 overflow-x-auto min-h-0 w-full">
          <table className="min-w-full divide-y divide-card-border">
            <thead className="bg-slate-50 select-none border-b border-card-border">
              <tr>
                {columns.map((col: any) => (
                  <th
                    key={col.name}
                    onClick={() => handleSort(col.name)}
                    className="px-6 py-4.5 text-left text-xs font-extrabold normal-case tracking-wider text-text-muted cursor-pointer hover:text-text-main transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{formatDisplayName(col.displayName)}</span>
                      {sortBy === col.name ? (
                        sortOrder === 'ASC' ? <ChevronUp className="h-3.5 w-3.5 text-indigo-600" /> : <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />
                      ) : (
                        <div className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border bg-white">
              {rows.length > 0 ? (
                rows.map((row: any, rIdx: number) => (
                  <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                    {columns.map((col: any) => {
                      const value = row[col.name];
                      let displayVal = String(value === null || value === undefined ? '-' : value);
                      
                      // Format date strings
                      if (value && (col.type.toLowerCase().includes('date') || col.type.toLowerCase().includes('timestamp'))) {
                        try {
                          displayVal = new Date(value).toLocaleString();
                        } catch(e) {}
                      }

                      return (
                        <td key={col.name} className="px-6 py-4 text-sm text-text-main font-medium whitespace-nowrap">
                          {col.isPrimaryKey ? (
                            <span className="font-mono text-[10px] bg-indigo-55 border border-indigo-200 text-indigo-700 font-bold px-2 py-0.5 rounded-lg shadow-sm">
                              {displayVal}
                            </span>
                          ) : (
                            displayVal
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length || 1} className="p-16 text-center text-text-muted text-sm font-medium">
                    {loading ? 'Fetching report records...' : 'No records found matching report criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="border-t border-card-border bg-slate-50 px-6 py-4 flex items-center justify-between select-none">
          <div className="text-xs text-text-muted font-medium">
            Showing page <span className="font-bold text-text-main bg-white px-1.5 py-0.5 rounded border border-card-border">{page}</span> of <span className="font-bold text-text-main">{totalPages}</span> ({totalCount} total rows)
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-xl bg-white border border-card-border px-4 py-2.5 text-xs font-bold text-text-muted hover:text-text-main hover:border-slate-350 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-xl bg-white border border-card-border px-4 py-2.5 text-xs font-bold text-text-muted hover:text-text-main hover:border-slate-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
