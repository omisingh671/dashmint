'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Save, Check, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface SchemaTabProps {
  dashboardId: string;
  dashboard: any;
  refetch: () => void;
}

export default function SchemaTab({ dashboardId, dashboard, refetch }: SchemaTabProps) {
  // Schema configuration state
  const [schemaModels, setSchemaModels] = useState<any[]>([]);
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});

  // Messages
  const [schemaSuccess, setSchemaSuccess] = useState('');
  const [schemaError, setSchemaError] = useState('');

  // Populate schema models on load or update
  useEffect(() => {
    if (dashboard?.models) {
      setSchemaModels(JSON.parse(JSON.stringify(dashboard.models)));
    }
  }, [dashboard]);

  const saveSchemaConfigMutation = useMutation({
    mutationFn: (config: any) => api.put(`/dashboards/${dashboardId}/schema-config`, { config }),
    onSuccess: () => {
      setSchemaSuccess('Layout and visibility configuration saved successfully.');
      setSchemaError('');
      refetch();
    },
    onError: (err: any) => {
      setSchemaError(err.response?.data?.error || 'Failed to save layout configuration');
      setSchemaSuccess('');
    }
  });

  const toggleModelExpand = (modelId: string) => {
    setExpandedModels(prev => ({
      ...prev,
      [modelId]: !prev[modelId]
    }));
  };

  const handleModelVisibilityChange = (modelIdx: number, val: boolean) => {
    const nextModels = [...schemaModels];
    nextModels[modelIdx].isVisible = val;
    setSchemaModels(nextModels);
  };

  const handleModelNameChange = (modelIdx: number, val: string) => {
    const nextModels = [...schemaModels];
    nextModels[modelIdx].displayName = val;
    setSchemaModels(nextModels);
  };

  const handleFieldVisibilityChange = (modelIdx: number, fieldIdx: number, val: boolean) => {
    const nextModels = [...schemaModels];
    nextModels[modelIdx].fields[fieldIdx].isVisible = val;
    setSchemaModels(nextModels);
  };

  const handleFieldNameChange = (modelIdx: number, fieldIdx: number, val: string) => {
    const nextModels = [...schemaModels];
    nextModels[modelIdx].fields[fieldIdx].displayName = val;
    setSchemaModels(nextModels);
  };

  const handleSchemaConfigSubmit = () => {
    setSchemaSuccess('');
    setSchemaError('');
    // Construct simplified save object
    const config = {
      models: schemaModels.map(m => ({
        id: m.id,
        isVisible: m.isVisible,
        displayName: m.displayName,
        fields: m.fields.map((f: any) => ({
          id: f.id,
          isVisible: f.isVisible,
          displayName: f.displayName
        }))
      }))
    };
    saveSchemaConfigMutation.mutate(config);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Tables Configuration list */}
      <div className="lg:col-span-2 bg-white border border-card-border rounded-2xl p-6.5 shadow-md space-y-6">
        <div>
          <h2 className="text-lg font-bold text-text-main">Dynamic Navigation Layout</h2>
          <p className="text-sm text-text-muted mt-1">Configure user-friendly labels and toggle visibility of tables/fields for admin users.</p>
        </div>

        {schemaSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl flex items-center gap-2.5">
            <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <span className="font-semibold leading-relaxed">{schemaSuccess}</span>
          </div>
        )}
        {schemaError && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-xl leading-relaxed">
            {schemaError}
          </div>
        )}

        {schemaModels.length > 0 ? (
          <div className="space-y-4 pt-2">
            {schemaModels.map((model, mIdx) => {
              const isExpanded = !!expandedModels[model.id];
              return (
                <div key={model.id} className="border border-card-border bg-slate-50 rounded-2xl overflow-hidden shadow-sm">
                  {/* Model header bar */}
                  <div className="p-4.5 flex items-center justify-between bg-slate-100/40 hover:bg-slate-100/80 transition-all select-none">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleModelExpand(model.id)}
                        className="p-1.5 text-text-muted hover:text-text-main rounded-lg hover:bg-slate-200 transition-all"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <span className="font-mono text-[10px] font-bold text-indigo-600 uppercase tracking-widest px-2.5 py-1 bg-white border border-card-border rounded-lg">
                        {model.name}
                      </span>
                      <input
                        type="text"
                        value={model.displayName}
                        onChange={(e) => handleModelNameChange(mIdx, e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-slate-350 focus:border-indigo-500 text-text-main text-sm font-bold py-0.5 px-2 focus:ring-0 focus:outline-none w-52 transition-all rounded"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleModelVisibilityChange(mIdx, !model.isVisible)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all cursor-pointer select-none ${
                          model.isVisible
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-white border-card-border text-text-muted hover:text-text-main'
                        }`}
                      >
                        {model.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        {model.isVisible ? 'Visible' : 'Hidden'}
                      </button>
                    </div>
                  </div>

                  {/* Fields list sub table */}
                  {isExpanded && (
                    <div className="p-5 bg-white border-t border-card-border overflow-x-auto">
                      <table className="min-w-full divide-y divide-card-border text-xs text-text-main">
                        <thead>
                          <tr className="text-[10px] text-text-muted font-bold uppercase tracking-widest">
                            <th className="pb-3 text-left w-14">Show</th>
                            <th className="pb-3 text-left">DB Column</th>
                            <th className="pb-3 text-left">Friendly Label</th>
                            <th className="pb-3 text-left">Data Type</th>
                            <th className="pb-3 text-left">Keys</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-card-border">
                          {model.fields?.map((field: any, fIdx: number) => (
                            <tr key={field.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3">
                                <input
                                  type="checkbox"
                                  checked={field.isVisible}
                                  onChange={(e) => handleFieldVisibilityChange(mIdx, fIdx, e.target.checked)}
                                  className="h-4.5 w-4.5 rounded border-card-border bg-white text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 font-mono text-xs text-text-muted font-medium">{field.name}</td>
                              <td className="py-3">
                                <input
                                  type="text"
                                  value={field.displayName}
                                  onChange={(e) => handleFieldNameChange(mIdx, fIdx, e.target.value)}
                                  className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 text-text-main text-xs py-0.5 px-2 focus:ring-0 focus:outline-none w-52 transition-all rounded font-medium"
                                />
                              </td>
                              <td className="py-3 text-[10px] font-bold text-text-muted uppercase font-mono">{field.type}</td>
                              <td className="py-3">
                                {field.isPrimaryKey && (
                                  <span className="text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono">
                                    🔑 Primary
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 border border-dashed border-card-border bg-slate-50 rounded-2xl text-center text-text-muted font-medium">
            No schema detected yet. Please configure the MySQL connection or paste a Prisma schema first.
          </div>
        )}
      </div>

      {/* Right Column: Sticky Summary Sidebar Wrapper */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-6 bg-white border border-card-border rounded-2xl p-6 shadow-md space-y-5">
          <h3 className="text-sm font-bold text-text-main">Layout Summary</h3>
          <div className="divide-y divide-card-border text-xs font-semibold text-text-main space-y-3">
            <div className="flex justify-between pt-1">
              <span className="text-text-muted">Total Tables Detected</span>
              <span>{schemaModels.length}</span>
            </div>
            <div className="flex justify-between pt-3">
              <span className="text-text-muted">Visible Tables (Sidebar)</span>
              <span>{schemaModels.filter((m: any) => m.isVisible).length}</span>
            </div>
            <div className="flex justify-between pt-3">
              <span className="text-text-muted">Hidden Tables</span>
              <span>{schemaModels.filter((m: any) => !m.isVisible).length}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-card-border">
            <button
              onClick={handleSchemaConfigSubmit}
              disabled={saveSchemaConfigMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4.5 w-4.5" />
              Save Layout Configurations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
