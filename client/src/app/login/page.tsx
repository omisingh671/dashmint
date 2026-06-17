'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const user = response.data.user;

      if (user.globalRole === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else {
        router.push('/admin');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-8 bg-bg-main relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] rounded-full bg-indigo-550/5 blur-[100px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-sm z-10 text-center">
        <div className="inline-flex h-12 w-12 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-2xl items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-600/20 mb-4">D</div>
        <h1 className="text-center text-4xl font-black tracking-tight text-text-main sm:text-5xl">
          Dash<span className="text-indigo-600">Mint</span>
        </h1>
        <p className="mt-2.5 text-center text-sm text-text-muted font-medium">
          The ultimate dashboard generator engine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 w-full">
        <div className="bg-card-bg border border-card-border p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-550 to-indigo-400"></div>
          <h2 className="text-2xl font-bold text-text-main mb-6">Welcome Back</h2>
          
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-xl flex items-start gap-2.5">
              <span className="mt-0.5 text-lg">⚠️</span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-card-border bg-white py-3 px-4 text-text-main placeholder-slate-400 shadow-sm sm:text-sm"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-bold text-text-muted uppercase tracking-wider">
                  Password
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-card-border bg-white py-3 px-4 text-text-main placeholder-slate-400 shadow-sm sm:text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 border border-indigo-400/20 disabled:opacity-50 transition-all duration-200 cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Sign in to Dashboard'}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-card-border pt-5 text-center">
            <span className="text-xs text-text-muted font-medium inline-block bg-slate-50 px-3 py-1.5 border border-card-border rounded-lg">
              🔑 Demo credentials: <span className="text-indigo-600 font-semibold font-mono">super@dashmint.com</span> / <span className="text-indigo-600 font-semibold font-mono">adminpassword</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
