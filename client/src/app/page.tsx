'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Quick auto-redirect if already logged in
    api.get('/auth/me')
      .then(res => {
        const user = res.data.user;
        if (user.globalRole === 'SUPER_ADMIN') {
          router.push('/super-admin');
        } else {
          router.push('/admin');
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, [router]);

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg-main text-text-main">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading DashMint...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-bg-main overflow-hidden relative">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-25%] left-[-15%] w-[700px] h-[700px] rounded-full bg-indigo-500/5 blur-[160px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-550/5 blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[30%] right-[25%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>

      {/* Navigation Header */}
      <header className="px-6 lg:px-16 h-20 flex items-center justify-between border-b border-card-border backdrop-blur-md bg-card-bg/60 z-10">
        <div className="text-2xl font-black text-text-main tracking-tight flex items-center gap-1.5">
          <div className="h-6.5 w-6.5 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-md shadow-indigo-500/20">D</div>
          <span>Dash<span className="text-indigo-600 font-extrabold">Mint</span></span>
        </div>
        <div>
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 border border-indigo-400/20 transition-all cursor-pointer"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 text-center max-w-4xl mx-auto z-10 py-16 sm:py-24">
        <span className="inline-flex items-center gap-x-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          SaaS MVP Sandbox Active
        </span>
        <h1 className="text-5xl font-black tracking-tight text-text-main sm:text-7xl leading-tight">
          Generate Admin Dashboards Instantly
        </h1>
        <p className="mt-8 text-lg leading-relaxed text-text-muted max-w-2xl font-normal">
          Connect your local database connection or upload a Prisma schema, configure table visibility, assign access rights, and distribute modern query & data-exporting portals to your admins.
        </p>

        <div className="mt-12 flex items-center justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 px-8 py-4 text-base font-bold text-white shadow-xl shadow-indigo-600/35 hover:shadow-indigo-600/50 border border-indigo-400/20 transition-all cursor-pointer"
          >
            Access Sandbox Environment
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-24 grid grid-cols-1 gap-6 sm:grid-cols-3 w-full border-t border-card-border pt-16">
          <div className="bg-card-bg border border-card-border p-6.5 rounded-2xl text-left glow-card transition-all duration-300 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-lg mb-4">🚀</div>
            <h3 className="text-text-main font-bold text-lg mb-2">Live Introspection</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Connect to local MySQL or drop in a Prisma schema to introspect layouts and columns dynamically.
            </p>
          </div>
          <div className="bg-card-bg border border-card-border p-6.5 rounded-2xl text-left glow-card transition-all duration-300 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-lg mb-4">🔒</div>
            <h3 className="text-text-main font-bold text-lg mb-2">Granular Assignments</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Select which dashboards and tables admins can access. Enable individual read or CSV export rules.
            </p>
          </div>
          <div className="bg-card-bg border border-card-border p-6.5 rounded-2xl text-left glow-card transition-all duration-300 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-lg mb-4">⚡</div>
            <h3 className="text-text-main font-bold text-lg mb-2">Data Exporting</h3>
            <p className="text-text-muted text-sm leading-relaxed">
              Render tabular tables with fast paginated server queries, dynamic search, and rapid CSV downloads.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-text-muted border-t border-card-border">
        &copy; {new Date().getFullYear()} DashMint SaaS. Created with premium UI design guidelines.
      </footer>
    </div>
  );
}
