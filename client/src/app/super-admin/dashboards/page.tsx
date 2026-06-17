'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, Database, ArrowRight, Settings, X } from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function DashboardsManagement() {
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<any>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Confirmation modal states
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  // Queries
  const { data: dashboards, isLoading: dl } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => api.get('/dashboards').then(res => res.data)
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newDb: any) => api.post('/dashboards', newDb),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      closeModal();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create dashboard');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/dashboards/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      closeModal();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to update dashboard');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/dashboards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
    }
  });

  const openCreateModal = () => {
    setError('');
    setName('');
    setDescription('');
    setActiveModal('create');
  };

  const openEditModal = (db: any) => {
    setError('');
    setSelectedDashboard(db);
    setName(db.name);
    setDescription(db.description || '');
    setActiveModal('edit');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedDashboard(null);
    setName('');
    setDescription('');
    setError('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, description });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ id: selectedDashboard.id, data: { name, description } });
  };

  if (dl) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Dashboards Configuration</h1>
          <p className="text-text-muted mt-1.5 text-sm font-medium">Configure dashboard properties and database introspection credentials.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/20 transition-all cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          Create Dashboard
        </button>
      </div>

      {/* Grid of dashboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboards && dashboards.length > 0 ? (
          dashboards.map((db: any) => (
            <div
              key={db.id}
              className="bg-white border border-card-border rounded-2xl p-6 flex flex-col justify-between hover:border-slate-300 glow-card transition-all duration-300 shadow-md"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                    <Database className="h-5.5 w-5.5" />
                  </div>
                  <h3 className="text-lg font-black text-text-main tracking-tight leading-tight">{db.name}</h3>
                </div>
                
                <p className="text-text-muted text-sm font-medium line-clamp-3 mb-5 leading-relaxed">
                  {db.description || <span className="text-slate-400 italic">No description provided</span>}
                </p>

                {db.connection ? (
                  <div className="mb-6 bg-slate-50 rounded-2xl p-4 text-xs font-mono text-text-muted border border-card-border">
                    <div className="flex justify-between py-1.5">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Database:</span>
                      <span className="text-text-main font-bold">{db.connection.database}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-t border-slate-200">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Host:</span>
                      <span className="text-slate-700 font-semibold">{db.connection.host}:{db.connection.port}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl p-4 text-xs text-center font-semibold flex items-center justify-center gap-2">
                    <span className="text-amber-600 text-sm">⚠️</span> Connection settings not configured
                  </div>
                )}
              </div>

              <div className="border-t border-card-border pt-5 flex items-center justify-between mt-auto">
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(db)}
                    className="p-2.5 bg-white hover:bg-slate-50 text-slate-655 border border-card-border hover:border-slate-300 rounded-xl hover:text-slate-800 transition-all cursor-pointer"
                    title="Edit name/description"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setConfirmConfig({
                        isOpen: true,
                        title: 'Delete Dashboard',
                        message: `Are you sure you want to delete the dashboard "${db.name}"? This action will permanently remove the dashboard and all its database connection configuration.`,
                        confirmLabel: 'Delete Dashboard',
                        variant: 'danger',
                        onConfirm: () => {
                          deleteMutation.mutate(db.id);
                          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                        }
                      });
                    }}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 rounded-xl transition-all cursor-pointer"
                    title="Delete dashboard"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <Link
                  href={`/super-admin/dashboards/${db.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-indigo-600/10 border border-indigo-400/10 transition-all"
                >
                  Configure
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white border border-card-border p-16 text-center text-text-muted rounded-3xl font-medium">
            No dashboards created yet. Click the create button above to start your first dashboard setup.
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {activeModal && (activeModal === 'create' || activeModal === 'edit') && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-card-border rounded-3xl max-w-md w-full p-7 shadow-2xl relative">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-text-muted hover:text-text-main p-1 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-text-main mb-5 tracking-tight">
              {activeModal === 'create' ? 'Create Dashboard' : 'Edit Dashboard Details'}
            </h2>

            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-xl leading-relaxed">
                {error}
              </div>
            )}

            <form onSubmit={activeModal === 'create' ? handleCreateSubmit : handleEditSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border border-card-border bg-white py-3 px-4 text-text-main placeholder-slate-400 sm:text-sm"
                  placeholder="Sales Dashboard"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full rounded-xl border border-card-border bg-white py-3 px-4 text-text-main placeholder-slate-400 sm:text-sm h-28 resize-none"
                  placeholder="Description of the database dashboard content"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl bg-white border border-card-border px-5 py-2.5 text-sm font-semibold text-text-muted hover:bg-slate-50 hover:text-text-main cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  {activeModal === 'create' ? 'Create Dashboard' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION POPUP MODAL */}
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
