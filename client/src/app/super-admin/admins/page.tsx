'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Edit2, Trash2, Shield, X, Check, Database } from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function AdminsManagement() {
  const queryClient = useQueryClient();
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'assign' | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Assignment states
  const [dashboardId, setDashboardId] = useState('');
  const [canRead, setCanRead] = useState(true);
  const [canExport, setCanExport] = useState(false);

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
  const { data: admins, isLoading: al } = useQuery({
    queryKey: ['admins'],
    queryFn: () => api.get('/admins').then(res => res.data)
  });

  const { data: dashboards } = useQuery({
    queryKey: ['dashboards'],
    queryFn: () => api.get('/dashboards').then(res => res.data)
  });

  const { data: assignments } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => api.get('/assignments').then(res => res.data),
    enabled: activeModal === 'assign'
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newAdmin: any) => api.post('/admins', newAdmin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      closeModal();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create admin account');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/admins/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      closeModal();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to update admin account');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admins/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    }
  });

  const assignMutation = useMutation({
    mutationFn: (newAssignment: any) => api.post('/assignments', newAssignment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setDashboardId('');
      setCanRead(true);
      setCanExport(false);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to assign dashboard');
    }
  });

  const unassignMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admins'] });
    }
  });

  const openCreateModal = () => {
    setError('');
    setEmail('');
    setPassword('');
    setActiveModal('create');
  };

  const openEditModal = (admin: any) => {
    setError('');
    setSelectedAdmin(admin);
    setEmail(admin.email);
    setPassword('');
    setActiveModal('edit');
  };

  const openAssignModal = (admin: any) => {
    setError('');
    setSelectedAdmin(admin);
    setDashboardId('');
    setCanRead(true);
    setCanExport(false);
    setActiveModal('assign');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedAdmin(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ email, password });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ id: selectedAdmin.id, data: { email, password: password || undefined } });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dashboardId) return;
    assignMutation.mutate({
      userId: selectedAdmin.id,
      dashboardId,
      permissions: { read: canRead, export: canExport }
    });
  };

  if (al) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // Filter assignments for selected admin
  const adminAssignments = assignments?.filter((asm: any) => asm.userId === selectedAdmin?.id) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Admin Users Management</h1>
          <p className="text-text-muted mt-1.5 text-sm font-medium">Create admin accounts and assign granular dashboards access.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/20 transition-all cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          Add Admin Account
        </button>
      </div>

      {/* Admins Table */}
      <div className="bg-white border border-card-border rounded-2xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-card-border">
            <thead className="bg-slate-50 border-b border-card-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Email Address</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Assigned Dashboards</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-text-muted">Created At</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border bg-white">
              {admins && admins.length > 0 ? (
                admins.map((admin: any) => (
                  <tr key={admin.id} className="hover:bg-slate-50 transition-all duration-150">
                    <td className="whitespace-nowrap px-6 py-4.5 text-sm font-bold text-text-main">
                      {admin.email}
                    </td>
                    <td className="px-6 py-4.5 text-sm text-text-muted font-medium">
                      {admin.assignments && admin.assignments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {admin.assignments.map((asm: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700"
                            >
                              {asm.dashboard.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None assigned</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-xs text-text-muted font-mono font-medium">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4.5 text-sm font-medium text-right space-x-2">
                      <button
                        onClick={() => openAssignModal(admin)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-750 px-3.5 py-2 text-xs font-bold border border-indigo-150 hover:border-indigo-200 transition-all cursor-pointer"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Manage Access
                      </button>
                      <button
                        onClick={() => openEditModal(admin)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-bold border border-card-border hover:border-slate-300 transition-all cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: 'Delete Admin Account',
                            message: `Are you sure you want to delete ${admin.email}? This action cannot be undone.`,
                            confirmLabel: 'Delete Account',
                            variant: 'danger',
                            onConfirm: () => {
                              deleteMutation.mutate(admin.id);
                              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                            }
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 px-3.5 py-2 text-xs font-bold border border-rose-200 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-text-muted font-medium">
                    No admins created yet. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
              {activeModal === 'create' ? 'Create Admin Account' : 'Edit Admin Account'}
            </h2>

            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-xl leading-relaxed">
                {error}
              </div>
            )}

            <form onSubmit={activeModal === 'create' ? handleCreateSubmit : handleEditSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-card-border bg-white py-3 px-4 text-text-main placeholder-slate-400 sm:text-sm"
                  placeholder="admin@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Password {activeModal === 'edit' && <span className="text-slate-400 font-normal lowercase">(leave blank to skip)</span>}
                </label>
                <input
                  type="password"
                  required={activeModal === 'create'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-card-border bg-white py-3 px-4 text-text-main placeholder-slate-400 sm:text-sm"
                  placeholder="••••••••"
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
                  {activeModal === 'create' ? 'Create Account' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DASHBOARD ACCESS ASSIGNMENT MODAL */}
      {activeModal === 'assign' && selectedAdmin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-card-border rounded-3xl max-w-lg w-full p-7 shadow-2xl relative">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 text-text-muted hover:text-text-main p-1 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-text-main">Manage Dashboard Access</h2>
            <p className="text-sm text-text-muted mt-1 mb-6">Configuring access controls for admin: <span className="font-semibold text-indigo-600">{selectedAdmin.email}</span></p>

            {/* List active assignments */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">Assigned Dashboards</h3>
              <div className="border border-card-border bg-slate-50 rounded-2xl overflow-hidden divide-y divide-card-border">
                {adminAssignments.length > 0 ? (
                  adminAssignments.map((asm: any) => {
                    let perms: any = {};
                    try {
                      perms = JSON.parse(asm.permissionsJson);
                    } catch (e) {}

                    return (
                      <div key={asm.id} className="p-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2.5">
                          <Database className="h-4 w-4 text-indigo-600" />
                          <span className="font-bold text-text-main">{asm.dashboard.name}</span>
                          <span className="text-[10px] text-text-muted font-mono flex gap-1.5 ml-1">
                            {perms.read && <span className="bg-white px-2 py-0.5 rounded-md text-emerald-700 border border-emerald-200 font-bold">Read</span>}
                            {perms.export && <span className="bg-white px-2 py-0.5 rounded-md text-indigo-600 border border-indigo-200 font-bold">Export</span>}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Revoke Access',
                              message: `Remove access to ${asm.dashboard.name}?`,
                              confirmLabel: 'Revoke',
                              variant: 'danger',
                              onConfirm: () => {
                                unassignMutation.mutate(asm.id);
                                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                              }
                            });
                          }}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Revoke Access
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-5 text-center text-text-muted text-sm font-medium">
                    No active dashboard assignments for this admin.
                  </div>
                )}
              </div>
            </div>

            {/* Create new assignment form */}
            <form onSubmit={handleAssignSubmit} className="space-y-4 border-t border-card-border pt-5">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Assign New Dashboard</h3>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                    Select Dashboard
                  </label>
                  <select
                    value={dashboardId}
                    onChange={(e) => setDashboardId(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-3.5 text-text-main focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">-- Choose Dashboard --</option>
                    {dashboards?.map((db: any) => {
                      // Filter out dashboards that are already assigned
                      const isAssigned = adminAssignments.some((asm: any) => asm.dashboardId === db.id);
                      if (isAssigned) return null;
                      return (
                        <option key={db.id} value={db.id}>{db.name}</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">
                    Permissions Allowed
                  </label>
                  <div className="space-y-2.5 flex flex-col pt-0.5">
                    <label className="inline-flex items-center text-sm font-semibold text-text-muted gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={canRead}
                        onChange={(e) => setCanRead(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-card-border bg-white text-indigo-600 focus:ring-indigo-500"
                      />
                      Can View Table Data (Read)
                    </label>
                    <label className="inline-flex items-center text-sm font-semibold text-text-muted gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={canExport}
                        onChange={(e) => setCanExport(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-card-border bg-white text-indigo-600 focus:ring-indigo-500"
                      />
                      Can Export CSV (Export)
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl bg-white border border-card-border px-5 py-2.5 text-sm font-semibold text-text-muted hover:bg-slate-50 hover:text-text-main cursor-pointer transition-all"
                >
                  Done
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending || !dashboardId}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-500 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign Dashboard'}
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
