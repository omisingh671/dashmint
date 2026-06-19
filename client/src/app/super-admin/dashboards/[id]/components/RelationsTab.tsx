'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Trash2, Check } from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';

interface RelationsTabProps {
  dashboardId: string;
  dashboard: any;
}

export default function RelationsTab({ dashboardId, dashboard }: RelationsTabProps) {
  // Relations states
  const [fromTable, setFromTable] = useState('');
  const [fromColumn, setFromColumn] = useState('');
  const [toTable, setToTable] = useState('');
  const [toColumn, setToColumn] = useState('');
  const [relationsSuccess, setRelationsSuccess] = useState('');
  const [relationsError, setRelationsError] = useState('');

  // Confirmation Modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Fetch Relations
  const { data: relations, refetch: refetchRelations } = useQuery({
    queryKey: ['relations', dashboardId],
    queryFn: () => api.get(`/relations/${dashboardId}`).then(res => res.data)
  });

  const createRelationMutation = useMutation({
    mutationFn: (newRel: any) => api.post(`/relations/${dashboardId}`, newRel),
    onSuccess: () => {
      refetchRelations();
      setFromTable('');
      setFromColumn('');
      setToTable('');
      setToColumn('');
      setRelationsSuccess('Relation added successfully.');
      setRelationsError('');
    },
    onError: (err: any) => {
      setRelationsError(err.response?.data?.error || 'Failed to create relation');
      setRelationsSuccess('');
    }
  });

  const deleteRelationMutation = useMutation({
    mutationFn: (relationId: string) => api.delete(`/relations/${dashboardId}/${relationId}`),
    onSuccess: () => {
      refetchRelations();
      setRelationsSuccess('Relation deleted successfully.');
      setRelationsError('');
    },
    onError: (err: any) => {
      setRelationsError(err.response?.data?.error || 'Failed to delete relation');
      setRelationsSuccess('');
    }
  });

  const handleRelationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromTable || !fromColumn || !toTable || !toColumn) return;
    createRelationMutation.mutate({
      fromTable,
      fromColumn,
      toTable,
      toColumn
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-card-border rounded-2xl p-6.5 shadow-md">
        <h2 className="text-lg font-bold text-text-main">Add Manual logical relationship</h2>
        <p className="text-sm text-text-muted mt-1 mb-6">Overlay logical Joins between tables without creating physical foreign key constraints in the database.</p>

        {relationsSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl flex items-center gap-2.5 mb-5">
            <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span className="font-semibold leading-relaxed">{relationsSuccess}</span>
          </div>
        )}
        {relationsError && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-xl leading-relaxed mb-5">
            {relationsError}
          </div>
        )}

        <form onSubmit={handleRelationSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Source Table</label>
            <select
              required
              value={fromTable}
              onChange={(e) => {
                setFromTable(e.target.value);
                setFromColumn('');
              }}
              className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main sm:text-sm"
            >
              <option value="">Select Table</option>
              {dashboard?.models?.filter((m: any) => m.isVisible).map((model: any) => (
                <option key={model.id} value={model.name}>{model.displayName} ({model.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Source Column</label>
            <select
              required
              disabled={!fromTable}
              value={fromColumn}
              onChange={(e) => setFromColumn(e.target.value)}
              className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main sm:text-sm disabled:opacity-50"
            >
              <option value="">Select Column</option>
              {dashboard?.models
                ?.find((m: any) => m.name === fromTable)
                ?.fields?.filter((f: any) => f.isVisible)
                .map((field: any) => (
                  <option key={field.id} value={field.name}>{field.displayName} ({field.name})</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Destination Table</label>
            <select
              required
              value={toTable}
              onChange={(e) => {
                setToTable(e.target.value);
                setToColumn('');
              }}
              className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main sm:text-sm"
            >
              <option value="">Select Table</option>
              {dashboard?.models?.filter((m: any) => m.isVisible).map((model: any) => (
                <option key={model.id} value={model.name}>{model.displayName} ({model.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Destination Column</label>
            <select
              required
              disabled={!toTable}
              value={toColumn}
              onChange={(e) => setToColumn(e.target.value)}
              className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main sm:text-sm disabled:opacity-50"
            >
              <option value="">Select Column</option>
              {dashboard?.models
                ?.find((m: any) => m.name === toTable)
                ?.fields?.filter((f: any) => f.isVisible)
                .map((field: any) => (
                  <option key={field.id} value={field.name}>{field.displayName} ({field.name})</option>
                ))}
            </select>
          </div>

          <div className="sm:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={createRelationMutation.isPending || !fromColumn || !toColumn}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Create Relationship
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-card-border rounded-2xl p-6.5 shadow-md">
        <h2 className="text-lg font-bold text-text-main mb-4">Active Relationships</h2>
        
        {relations && relations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-card-border text-sm text-text-main">
              <thead>
                <tr className="text-[10px] text-text-muted font-bold uppercase tracking-widest text-left">
                  <th className="pb-3 w-1/3">Source (Foreign Key)</th>
                  <th className="pb-3 w-1/3">Destination (Primary Key)</th>
                  <th className="pb-3">Origin</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border font-medium">
                {relations.map((rel: any) => (
                  <tr key={rel.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-mono text-xs">
                      <span className="text-text-main font-bold">{rel.fromTable}</span>
                      <span className="text-text-muted">.{rel.fromColumn}</span>
                    </td>
                    <td className="py-3.5 font-mono text-xs">
                      <span className="text-emerald-700 font-bold">{rel.toTable}</span>
                      <span className="text-text-muted">.{rel.toColumn}</span>
                    </td>
                    <td className="py-3.5">
                      {rel.isManual ? (
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Manual</span>
                      ) : (
                        <span className="text-[10px] bg-indigo-50 text-indigo-850 border border-indigo-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Database Introspected</span>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      {rel.isManual && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Delete Relationship',
                              message: 'Are you sure you want to delete this relationship?',
                              onConfirm: () => {
                                deleteRelationMutation.mutate(rel.id);
                                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                              }
                            });
                          }}
                          disabled={deleteRelationMutation.isPending}
                          className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 border border-dashed border-card-border bg-slate-50 rounded-2xl text-center text-text-muted font-medium">
            No database relationships detected or manually declared yet.
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
