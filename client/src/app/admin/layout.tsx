'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        const currentUser = res.data.user;
        setUser(currentUser);
        setLoading(false);
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg-main text-text-main min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-text-muted">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-bg-main text-text-main font-sans">
      {/* Header bar */}
      <header className="h-20 border-b border-card-border bg-card-bg z-20 shadow-md">
        <div className="w-full h-full flex items-center justify-between px-6 lg:px-12">
          <Link href="/admin" className="text-2xl font-black text-text-main tracking-tight flex items-center gap-2">
            <div className="h-7 w-7 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg flex items-center justify-center font-black text-sm text-white shadow-md shadow-indigo-500/15">D</div>
            <span>Dash<span className="text-indigo-600 font-extrabold">Mint</span></span>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-600 px-2.5 py-0.5 rounded-md border border-indigo-500/10 font-mono ml-1.5">
              Admin Portal
            </span>
          </Link>
          <div className="flex items-center gap-5.5">
            <div className="text-right">
              <p className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Console User</p>
              <p className="text-sm font-bold text-text-main mt-0.5">{user?.email}</p>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-3 rounded-xl text-text-muted hover:text-text-main hover:bg-slate-100 dark:hover:bg-slate-900 border border-card-border transition-all cursor-pointer shadow-sm animate-none"
              title="Sign Out"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main viewport */}
      <div className="flex-1 flex min-h-0 min-w-0 relative">
        <div className="absolute top-[-10%] left-[5%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none"></div>
        <div className="flex-1 flex min-h-0 min-w-0 relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
