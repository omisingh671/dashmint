'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { Database, ArrowRight, Shield } from 'lucide-react';

export default function AdminOverview() {
  const { data: dashboards, isLoading: dl } = useQuery<any[]>({
    queryKey: ['assigned-dashboards'],
    queryFn: () => api.get('/dashboards').then((res: any) => res.data)
  });

  if (dl) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 lg:p-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-text-main tracking-tight">Your Portals</h1>
        <p className="text-text-muted mt-1.5 text-sm font-medium">Select one of the databases assigned to you by the super administrator.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {dashboards && dashboards.length > 0 ? (
          dashboards.map((db: any) => (
            <div
              key={db.id}
              className="bg-white border border-card-border hover:border-slate-300 rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 shadow-md glow-card"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                    <Database className="h-5.5 w-5.5" />
                  </div>
                  <h3 className="text-lg font-black text-text-main tracking-tight leading-tight">{db.name}</h3>
                </div>
                
                <p className="text-text-muted text-sm font-medium line-clamp-3 mb-6 leading-relaxed">
                  {db.description || <span className="text-slate-450 italic">No description provided</span>}
                </p>
              </div>

              <div className="border-t border-card-border pt-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-indigo-750 font-bold bg-indigo-50 px-3 py-1.5 border border-indigo-150 rounded-xl">
                  <Shield className="h-3.5 w-3.5 text-indigo-600" />
                  Access Granted
                </span>

                <Link
                  href={`/admin/dashboard/${db.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-5 py-3 text-xs font-bold transition-all shadow-md shadow-indigo-600/10 border border-indigo-400/10"
                >
                  Enter Portal
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full border border-dashed border-card-border p-16 text-center text-text-muted rounded-3xl font-medium">
            You do not have any assigned dashboards at the moment. Please contact your system administrator to request access.
          </div>
        )}
      </div>
    </div>
  );
}
