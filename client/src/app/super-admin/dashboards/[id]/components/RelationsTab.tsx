'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Plus, Trash2, Check, Sparkles } from 'lucide-react';
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

  // Auto-Suggest Relations states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Record<number, boolean>>({});

  // Fetch Suggestions Query
  const { data: suggestions, isLoading: loadingSuggestions, refetch: refetchSuggestions } = useQuery<any[]>({
    queryKey: ['relation-suggestions', dashboardId],
    queryFn: () => api.get(`/relations/${dashboardId}/suggestions`).then(res => res.data),
    enabled: showSuggestions
  });

  // Bulk Create Mutation
  const bulkCreateRelationsMutation = useMutation({
    mutationFn: (relsToCreate: any[]) => api.post(`/relations/${dashboardId}/bulk`, { relations: relsToCreate }),
    onSuccess: (res: any) => {
      refetchRelations();
      setShowSuggestions(false);
      setSelectedSuggestions({});
      setRelationsSuccess(`Successfully created ${res.data?.createdCount || 0} relationships.`);
      setRelationsError('');
    },
    onError: (err: any) => {
      setRelationsError(err.response?.data?.error || 'Failed to bulk create relationships');
      setRelationsSuccess('');
    }
  });

  // Handle toggling select-all
  const handleSelectAll = (checked: boolean) => {
    if (!suggestions) return;
    const newSelected: Record<number, boolean> = {};
    if (checked) {
      suggestions.forEach((_, idx) => {
        newSelected[idx] = true;
      });
    }
    setSelectedSuggestions(newSelected);
  };

  // Toggle single suggestion
  const handleToggleSuggestion = (idx: number) => {
    setSelectedSuggestions(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Run bulk creation submit
  const handleBulkSubmit = () => {
    if (!suggestions) return;
    const toCreate = suggestions.filter((_, idx) => !!selectedSuggestions[idx]);
    if (toCreate.length === 0) return;
    bulkCreateRelationsMutation.mutate(toCreate);
  };

  const selectedCount = suggestions ? suggestions.filter((_, idx) => !!selectedSuggestions[idx]).length : 0;
  const isAllSelected = suggestions && suggestions.length > 0 && selectedCount === suggestions.length;

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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-1">
          <h2 className="text-lg font-bold text-text-main">Add Manual logical relationship</h2>
          <button
            type="button"
            onClick={() => {
              setShowSuggestions(true);
              refetchSuggestions();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" /> Auto-Suggest Relations
          </button>
        </div>
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

      {showSuggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-card-border rounded-2xl w-full max-w-2xl shadow-2xl p-6.5 space-y-5 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-card-border pb-4">
              <div>
                <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 border border-indigo-150 text-indigo-650 rounded-lg">✨</span>
                  Auto-Suggest Table Relations
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Dashmint analyzed table and column naming conventions to identify potential logical foreign key relationships.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text-main border border-card-border rounded-lg bg-white hover:bg-slate-50 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[250px] pr-2">
              {loadingSuggestions ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
                  <div className="h-7 w-7 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
                  <span className="text-xs font-bold tracking-wide">Introspecting schema and identifying relations...</span>
                </div>
              ) : !suggestions || suggestions.length === 0 ? (
                <div className="text-center py-16 text-xs text-text-muted font-semibold">
                  No new relationship suggestions could be identified for this schema.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-card-border">
                    <label className="flex items-center gap-2 text-xs font-bold text-text-main cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-card-border text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      Select All Suggestions ({suggestions.length})
                    </label>
                    <span className="text-xs font-bold text-indigo-650">{selectedCount} selected</span>
                  </div>

                  <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                    {suggestions.map((sug, idx) => {
                      const isChecked = !!selectedSuggestions[idx];
                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleSuggestion(idx)}
                          className={`flex items-center gap-3.5 p-3.5 border rounded-xl shadow-xs transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'border-indigo-400 bg-indigo-50/20'
                              : 'border-card-border hover:border-slate-350 hover:bg-slate-50/50 bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // toggled by parent div click
                            className="h-4 w-4 rounded border-card-border text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-text-main font-mono">{sug.fromTable}</span>
                              <span className="text-text-muted text-xs font-mono">.{sug.fromColumn}</span>
                              <span className="text-indigo-600 text-xs font-bold font-mono">➔</span>
                              <span className="text-emerald-700 text-xs font-black font-mono">{sug.toTable}</span>
                              <span className="text-text-muted text-xs font-mono">.{sug.toColumn}</span>
                            </div>
                            <div className="text-[10px] text-text-muted mt-1 font-semibold">
                              Links source <span className="font-bold text-text-main">{sug.fromDisplayName}</span> to target <span className="font-bold text-text-main">{sug.toDisplayName}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-card-border flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="px-5 py-2.5 text-xs font-bold text-text-muted hover:text-text-main border border-card-border rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedCount === 0 || bulkCreateRelationsMutation.isPending}
                onClick={handleBulkSubmit}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {bulkCreateRelationsMutation.isPending ? (
                  <>
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  `Create ${selectedCount} Selected Relations`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
