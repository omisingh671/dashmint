'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LayoutDashboard, Users, Database, FileText, LogOut } from 'lucide-react';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        const currentUser = res.data.user;
        if (currentUser.globalRole !== 'SUPER_ADMIN') {
          router.push('/login');
        } else {
          setUser(currentUser);
          setLoading(false);
        }
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
      // Fallback redirect
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

  const navItems = [
    { name: 'Overview', href: '/super-admin', icon: LayoutDashboard },
    { name: 'Dashboards', href: '/super-admin/dashboards', icon: Database },
    { name: 'Admin Users', href: '/super-admin/admins', icon: Users },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-main text-text-main font-sans">
      {/* Sidebar */}
      <aside className="w-68 border-r border-sidebar-border bg-sidebar-bg flex flex-col justify-between p-6 z-20 shadow-md shrink-0 h-full overflow-y-auto">
        <div>
          <div className="mb-8 pb-5 border-b border-sidebar-border">
            <Link href="/super-admin" className="text-2xl font-black text-text-main tracking-tight flex items-center gap-2">
              <div className="h-7 w-7 bg-linear-to-tr from-indigo-600 to-indigo-400 rounded-lg flex items-center justify-center font-black text-sm text-white shadow-md shadow-indigo-500/15">D</div>
              <span>Dash<span className="text-indigo-600 font-extrabold">Mint</span></span>
            </Link>
            <div className="mt-3 flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-md self-start border border-indigo-500/10 font-mono">
                Super Admin
              </span>
              <p className="text-xs text-text-muted font-medium mt-2.5 truncate" title={user?.email}>{user?.email}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/super-admin' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 border ${
                    isActive
                      ? 'bg-linear-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/15 border-indigo-500/20'
                      : 'text-text-muted hover:bg-slate-200/50 dark:hover:bg-slate-900/60 hover:text-text-main border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4 text-indigo-550 dark:text-indigo-400" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 w-full transition-all duration-200 cursor-pointer border border-transparent hover:border-rose-500/10"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-bg-main">
        <header className="h-16 border-b border-card-border bg-card-bg flex items-center px-8 justify-between shadow-sm shrink-0">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest">Platform Administration Console</h2>
          <div className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full px-3 py-1 font-semibold flex items-center gap-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            System Live
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto relative min-h-0">
          <div className="absolute top-[-10%] right-[10%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
