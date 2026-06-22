'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft, Save, Play, FileUp, Settings, Check, ChevronUp, ChevronDown, ChevronRight, Eye, EyeOff, Trash2, Plus, Edit2, Users, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { formatDisplayName } from '@/lib/utils';
import { REPORT_PRESETS } from '@/lib/presets';
import ConfirmationModal from '@/components/ConfirmationModal';
import ConnectionTab from './components/ConnectionTab';
import PrismaTab from './components/PrismaTab';
import SchemaTab from './components/SchemaTab';
import RelationsTab from './components/RelationsTab';

export default function DashboardConfig() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dashboardId = params.id as string;

  // Tabs
  const [activeTab, setActiveTab] = useState<'connection' | 'prisma' | 'schema' | 'relations' | 'reports'>('connection');



  // Reports states
  const [reportsSuccess, setReportsSuccess] = useState('');
  const [reportsError, setReportsError] = useState('');
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [editingReport, setEditingReport] = useState<any>(null);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportBaseTable, setReportBaseTable] = useState('');
  const [reportJoins, setReportJoins] = useState<any[]>([]);
  const [reportSelectedColumns, setReportSelectedColumns] = useState<string[]>([]);
  const [reportColumnAliases, setReportColumnAliases] = useState<Record<string, string>>({});
  const [reportFilters, setReportFilters] = useState<any[]>([]);
  const [assigningReport, setAssigningReport] = useState<any>(null);
  const [assignmentUpdates, setAssignmentUpdates] = useState<Record<string, { assigned: boolean, canExport: boolean, existingAssignmentId?: string }>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [previewingReport, setPreviewingReport] = useState<any>(null);
  
  // Load Business Preset State
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetWarnings, setPresetWarnings] = useState<string[]>([]);

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

  // Fetch Reports
  const { data: reports, refetch: refetchReports } = useQuery({
    queryKey: ['reports', dashboardId],
    queryFn: () => api.get(`/reports`, { params: { dashboardId } }).then(res => res.data),
    enabled: activeTab === 'reports'
  });

  // Fetch Admins
  const { data: admins } = useQuery({
    queryKey: ['admins'],
    queryFn: () => api.get(`/admins`).then(res => res.data),
    enabled: activeTab === 'reports'
  });

  // Fetch Report Assignments
  const { data: reportAssignments, refetch: refetchAssignments } = useQuery({
    queryKey: ['reportAssignments'],
    queryFn: () => api.get(`/assignments/reports`).then(res => res.data),
    enabled: activeTab === 'reports'
  });

  // Fetch Report Preview Data
  const { data: previewData, isLoading: isPreviewLoading, error: previewError } = useQuery<any>({
    queryKey: ['report-preview', previewingReport?.id],
    queryFn: () => api.get(`/reports/${previewingReport.id}/query`, { params: { limit: 10 } }).then(res => res.data),
    enabled: !!previewingReport,
    retry: false
  });

  const createReportMutation = useMutation({
    mutationFn: (newReport: any) => api.post(`/reports`, newReport),
    onSuccess: () => {
      refetchReports();
      resetReportForm();
      setReportsSuccess('Report created successfully.');
      setReportsError('');
    },
    onError: (err: any) => {
      setReportsError(err.response?.data?.error || 'Failed to create report');
      setReportsSuccess('');
    }
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => api.put(`/reports/${id}`, data),
    onSuccess: () => {
      refetchReports();
      resetReportForm();
      setReportsSuccess('Report updated successfully.');
      setReportsError('');
    },
    onError: (err: any) => {
      setReportsError(err.response?.data?.error || 'Failed to update report');
      setReportsSuccess('');
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => api.delete(`/reports/${reportId}`),
    onSuccess: () => {
      refetchReports();
      setReportsSuccess('Report deleted successfully.');
      setReportsError('');
    },
    onError: (err: any) => {
      setReportsError(err.response?.data?.error || 'Failed to delete report');
      setReportsSuccess('');
    }
  });

  const saveAssignmentsMutation = useMutation({
    mutationFn: async ({ reportId, updates }: { reportId: string, updates: any[] }) => {
      for (const u of updates) {
        if (u.assigned) {
          await api.post(`/assignments/reports`, {
            userId: u.userId,
            reportId,
            canExport: u.canExport
          });
        } else if (u.existingAssignmentId) {
          await api.delete(`/assignments/reports/${u.existingAssignmentId}`);
        }
      }
    },
    onSuccess: () => {
      refetchAssignments();
      setAssigningReport(null);
      setReportsSuccess('Report assignments updated successfully.');
      setReportsError('');
    },
    onError: (err: any) => {
      setReportsError(err.response?.data?.error || 'Failed to save assignments');
      setReportsSuccess('');
    }
  });

  const resetReportForm = () => {
    setIsCreatingReport(false);
    setEditingReport(null);
    setReportName('');
    setReportDescription('');
    setReportBaseTable('');
    setReportJoins([]);
    setReportSelectedColumns([]);
    setReportColumnAliases({});
    setReportFilters([]);
    setSelectedPresetId('');
    setPresetWarnings([]);
  };

  const handleLoadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setPresetWarnings([]);
    if (!presetId) return;

    // Find the preset
    let preset: any = null;
    for (const cat of Object.values(REPORT_PRESETS)) {
      const found = cat.presets.find(p => p.id === presetId);
      if (found) {
        preset = found;
        break;
      }
    }

    if (!preset) return;

    // Build lists of tables and columns present in active dashboard schema
    const existingTableNames = new Set<string>(dashboard?.models?.map((m: any) => m.name) || []);
    const existingColumnsMap = new Map<string, Set<string>>(
      dashboard?.models?.map((m: any) => [
        m.name,
        new Set<string>(m.fields?.map((f: any) => f.name) || [])
      ]) || []
    );


    const warnings: string[] = [];

    // Check base table
    if (!existingTableNames.has(preset.baseTable)) {
      warnings.push(`Base table "${preset.baseTable}" is not present in your database schema.`);
    }

    // Check joins
    const loadedJoins: any[] = [];
    preset.joins.forEach((j: any) => {
      if (!existingTableNames.has(j.relatedTable)) {
        warnings.push(`Join table "${j.relatedTable}" is not present in your database schema.`);
      }
      loadedJoins.push({
        type: j.type,
        relatedTable: j.relatedTable,
        fromColumn: j.fromColumn,
        toColumn: j.toColumn
      });
    });

    // Check columns
    const loadedColumns: string[] = [];
    const loadedAliases: Record<string, string> = {};
    preset.columns.forEach((c: any) => {
      const tableColumns = existingColumnsMap.get(c.table);
      if (!existingTableNames.has(c.table)) {
        warnings.push(`Column source table "${c.table}" is not present in your database schema.`);
      } else if (tableColumns && !tableColumns.has(c.field)) {
        warnings.push(`Column "${c.field}" is not present in table "${c.table}".`);
      }
      const colKey = `${c.table}.${c.field}`;
      loadedColumns.push(colKey);
      loadedAliases[colKey] = c.alias;
    });

    // Check filters
    const loadedFilters: any[] = [];
    preset.filters.forEach((f: any) => {
      const tableColumns = existingColumnsMap.get(f.table);
      if (!existingTableNames.has(f.table)) {
        warnings.push(`Filter source table "${f.table}" is not present in your database schema.`);
      } else if (tableColumns && !tableColumns.has(f.field)) {
        warnings.push(`Filter column "${f.field}" is not present in table "${f.table}".`);
      }
      loadedFilters.push({
        table: f.table,
        field: f.field,
        operator: f.operator,
        value: f.value
      });
    });

    // Apply values to builder form states
    setReportName(preset.name);
    setReportDescription(preset.description);
    setReportBaseTable(preset.baseTable);
    setReportJoins(loadedJoins);
    setReportSelectedColumns(loadedColumns);
    setReportColumnAliases(loadedAliases);
    setReportFilters(loadedFilters);
    setPresetWarnings(warnings);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e?.preventDefault();
    if (!reportName || !reportBaseTable || reportSelectedColumns.length === 0) {
      setReportsError('Report Name, Base Table, and at least one Selected Column are required.');
      return;
    }

    const cols = reportSelectedColumns.map(colStr => {
      const [table, field] = colStr.split('.');
      return {
        table,
        field,
        alias: reportColumnAliases[colStr] || ''
      };
    });

    const data = {
      dashboardId,
      name: reportName,
      description: reportDescription,
      baseTable: reportBaseTable,
      columnsJson: JSON.stringify(cols),
      joinsJson: JSON.stringify(reportJoins),
      filtersJson: JSON.stringify(reportFilters)
    };

    if (editingReport) {
      updateReportMutation.mutate({ id: editingReport.id, data });
    } else {
      createReportMutation.mutate(data);
    }
  };

  const handleEditReport = (report: any) => {
    setEditingReport(report);
    setReportName(report.name);
    setReportDescription(report.description || '');
    setReportBaseTable(report.baseTable);
    
    const cols = JSON.parse(report.columnsJson || '[]');
    setReportSelectedColumns(cols.map((c: any) => `${c.table}.${c.field}`));
    
    const aliases = cols.reduce((acc: any, c: any) => {
      acc[`${c.table}.${c.field}`] = c.alias || '';
      return acc;
    }, {});
    setReportColumnAliases(aliases);
    
    setReportJoins(JSON.parse(report.joinsJson || '[]'));
    setReportFilters(JSON.parse(report.filtersJson || '[]'));
    setIsCreatingReport(true);
  };

  const openAssignmentsModal = (report: any) => {
    setAssigningReport(report);
    
    const curAssignments = reportAssignments?.filter((ra: any) => ra.reportId === report.id) || [];
    
    const initialUpdates: any = {};
    admins?.forEach((admin: any) => {
      const match = curAssignments.find((ra: any) => ra.userId === admin.id);
      initialUpdates[admin.id] = {
        assigned: !!match,
        canExport: match ? match.canExport : false,
        existingAssignmentId: match ? match.id : undefined
      };
    });
    setAssignmentUpdates(initialUpdates);
  };

  const handleSaveAssignments = () => {
    if (!assigningReport) return;
    const updatesList = Object.entries(assignmentUpdates).map(([userId, data]) => ({
      userId,
      ...data
    }));
    saveAssignmentsMutation.mutate({
      reportId: assigningReport.id,
      updates: updatesList
    });
  };

  // Fetch Dashboard details
  const { data: dashboard, isLoading: dl, refetch } = useQuery({
    queryKey: ['dashboard', dashboardId],
    queryFn: () => api.get(`/dashboards/${dashboardId}`).then(res => res.data)
  });



  if (dl) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-4.5">
        <Link
          href="/super-admin/dashboards"
          className="p-3 bg-white border border-card-border rounded-xl hover:bg-slate-50 text-text-muted hover:text-text-main transition-all shadow-sm"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">Dashboard Config</span>
          <h1 className="text-3xl font-black text-text-main tracking-tight mt-1">{dashboard?.name}</h1>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-card-border gap-6 select-none">
        <button
          onClick={() => setActiveTab('connection')}
          className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all cursor-pointer ${
            activeTab === 'connection'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          MySQL Connection
        </button>
        <button
          onClick={() => setActiveTab('prisma')}
          className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all cursor-pointer ${
            activeTab === 'prisma'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          Upload Prisma Schema
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          Configure Visible Tables ({dashboard?.models?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('relations')}
          className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all cursor-pointer ${
            activeTab === 'relations'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          Table Relations
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-4 text-sm font-bold tracking-wide border-b-2 transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-text-muted hover:text-text-main'
          }`}
        >
          Reports Builder
        </button>
      </div>

      {activeTab === 'connection' && (
        <ConnectionTab dashboardId={dashboardId} dashboard={dashboard} refetch={refetch} />
      )}

      {activeTab === 'prisma' && (
        <PrismaTab dashboardId={dashboardId} refetch={refetch} />
      )}

      {activeTab === 'schema' && (
        <SchemaTab dashboardId={dashboardId} dashboard={dashboard} refetch={refetch} />
      )}

      {activeTab === 'relations' && (
        <RelationsTab dashboardId={dashboardId} dashboard={dashboard} />
      )}

      {/* Reports Builder Panel */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {reportsSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl flex items-center gap-2.5">
              <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span className="font-semibold leading-relaxed">{reportsSuccess}</span>
            </div>
          )}
          {reportsError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-xl leading-relaxed">
              {reportsError}
            </div>
          )}

          {isCreatingReport ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Form Content */}
              <div className="lg:col-span-2 bg-white border border-card-border rounded-2xl p-6.5 shadow-md space-y-6">
                <div className="border-b border-card-border pb-4">
                  <h2 className="text-lg font-bold text-text-main">
                    {editingReport ? 'Edit Custom Report' : 'Create Custom Report'}
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Define report parameters, join tables, select fields, customize display order, and define default query constraints.
                  </p>
                </div>

                <form id="report-form" onSubmit={handleReportSubmit} className="space-y-6">
                {/* Loader Selection Dropdown */}
                {!editingReport && (
                  <div className="bg-slate-50 border border-card-border p-4.5 rounded-2xl space-y-3 relative overflow-hidden shadow-xs">
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500"></div>
                    <div className="flex flex-col gap-1.5 pl-2.5">
                      <label className="block text-xs font-black text-indigo-750 uppercase tracking-widest font-mono">Load Business Pack Preset</label>
                      <p className="text-[10px] text-text-muted font-medium">Select a predefined report preset to instantly configure joins, projection fields, and criteria tags.</p>
                    </div>
                    <div className="pl-2.5 max-w-sm">
                      <select
                        value={selectedPresetId}
                        onChange={(e) => handleLoadPreset(e.target.value)}
                        className="block w-full rounded-xl border border-card-border bg-white py-2 px-3 text-xs text-text-main focus:border-indigo-500"
                      >
                        <option value="">-- Select Predefined Preset --</option>
                        {Object.entries(REPORT_PRESETS).map(([key, cat]) => (
                          <optgroup key={key} label={cat.label}>
                            {cat.presets.map((preset) => (
                              <option key={preset.id} value={preset.id}>{preset.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    {presetWarnings.length > 0 && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-3.5 rounded-xl space-y-1.5 leading-relaxed pl-2.5">
                        <div className="font-bold flex items-center gap-1">
                          <span>⚠️ Warning: Schema Mismatches Detected</span>
                        </div>
                        <ul className="list-disc pl-4 space-y-1">
                          {presetWarnings.map((warn, i) => (
                            <li key={i}>{warn}</li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-amber-600 mt-1.5 font-medium">Please verify and manually map the base table, joins, and columns below to match your actual schema.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Report Name</label>
                    <input
                      type="text"
                      required
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Order Details with Customers"
                      className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Description</label>
                    <input
                      type="text"
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Provides user orders alongside emails and profile data."
                      className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Base Table</label>
                    <select
                      required
                      disabled={!!editingReport}
                      value={reportBaseTable}
                      onChange={(e) => {
                        setReportBaseTable(e.target.value);
                        setReportJoins([]);
                        setReportSelectedColumns([]);
                        setReportColumnAliases({});
                        setReportFilters([]);
                      }}
                      className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main sm:text-sm disabled:opacity-50"
                    >
                      <option value="">Select Table</option>
                      {dashboard?.models?.filter((m: any) => m.isVisible).map((model: any) => (
                        <option key={model.id} value={model.name}>{model.displayName} ({model.name})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Joins Builder */}
                {reportBaseTable && (
                  <div className="space-y-4 border-t border-card-border pt-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-text-main">Table Joins (Relational Connections)</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setReportJoins(prev => [
                            ...prev,
                            { type: 'LEFT', relatedTable: '', fromColumn: '', toColumn: '' }
                          ]);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-card-border bg-white hover:bg-slate-50 text-indigo-600 rounded-xl transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Table Join
                      </button>
                    </div>

                    {reportJoins.length > 0 ? (
                      <div className="space-y-4">
                        {reportJoins.map((join, idx) => {
                          const participatingTables = [reportBaseTable, ...reportJoins.slice(0, idx).map(j => j.relatedTable)].filter(Boolean);
                          const remainingTables = dashboard?.models
                            ?.filter((m: any) => m.isVisible && !participatingTables.includes(m.name) || m.name === join.relatedTable)
                            .map((m: any) => m.name) || [];

                          return (
                            <div key={idx} className="p-4 bg-slate-50 border border-card-border rounded-2xl flex flex-wrap gap-4 items-end">
                              <div className="w-28">
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Join Type</label>
                                <select
                                  value={join.type}
                                  onChange={(e) => {
                                    const nextJoins = [...reportJoins];
                                    nextJoins[idx].type = e.target.value as 'LEFT' | 'INNER';
                                    setReportJoins(nextJoins);
                                  }}
                                  className="block w-full rounded-xl border border-card-border bg-white py-1.5 px-3 text-xs text-text-main font-bold"
                                >
                                  <option value="LEFT">LEFT JOIN</option>
                                  <option value="INNER">INNER JOIN</option>
                                </select>
                              </div>

                              <div className="flex-1 min-w-[150px]">
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Join Table</label>
                                <select
                                  required
                                  value={join.relatedTable}
                                  onChange={(e) => {
                                    const nextJoins = [...reportJoins];
                                    nextJoins[idx].relatedTable = e.target.value;
                                    nextJoins[idx].toColumn = '';
                                    setReportJoins(nextJoins);
                                  }}
                                  className="block w-full rounded-xl border border-card-border bg-white py-1.5 px-3 text-xs text-text-main"
                                >
                                  <option value="">Select Table</option>
                                  {remainingTables.map((tName: any) => (
                                    <option key={tName} value={tName}>
                                      {dashboard?.models?.find((m: any) => m.name === tName)?.displayName || tName} ({tName})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex-1 min-w-[150px]">
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Source Column (Existing Table)</label>
                                <select
                                  required
                                  value={join.fromColumn}
                                  onChange={(e) => {
                                    const nextJoins = [...reportJoins];
                                    nextJoins[idx].fromColumn = e.target.value;
                                    setReportJoins(nextJoins);
                                  }}
                                  className="block w-full rounded-xl border border-card-border bg-white py-1.5 px-3 text-xs text-text-main"
                                >
                                  <option value="">Select Column</option>
                                  {participatingTables.flatMap((tName: any) => {
                                    const fields = dashboard?.models?.find((m: any) => m.name === tName)?.fields?.filter((f: any) => f.isVisible) || [];
                                    return fields.map((f: any) => (
                                      <option key={`${tName}.${f.name}`} value={f.name}>
                                        {tName}.{f.name}
                                      </option>
                                    ));
                                  })}
                                </select>
                              </div>

                              <div className="flex-1 min-w-[150px]">
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Target Column (New Table)</label>
                                <select
                                  required
                                  disabled={!join.relatedTable}
                                  value={join.toColumn}
                                  onChange={(e) => {
                                    const nextJoins = [...reportJoins];
                                    nextJoins[idx].toColumn = e.target.value;
                                    setReportJoins(nextJoins);
                                  }}
                                  className="block w-full rounded-xl border border-card-border bg-white py-1.5 px-3 text-xs text-text-main disabled:opacity-50"
                                >
                                  <option value="">Select Column</option>
                                  {dashboard?.models
                                    ?.find((m: any) => m.name === join.relatedTable)
                                    ?.fields?.filter((f: any) => f.isVisible)
                                    .map((field: any) => (
                                      <option key={field.id} value={field.name}>{field.name}</option>
                                    ))}
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setReportJoins(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-2 text-red-650 hover:bg-red-50 rounded-xl transition-colors cursor-pointer mb-0.5"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">No joins added. This report is restricted to querying the base table only.</p>
                    )}
                  </div>
                )}

                {/* Columns Selection */}
                {reportBaseTable && (
                  <div className="space-y-4 border-t border-card-border pt-5">
                    <h3 className="text-sm font-bold text-text-main">Select Columns to display</h3>
                    
                    <div className="space-y-4">
                      {[reportBaseTable, ...reportJoins.map(j => j.relatedTable)].filter(Boolean).map(tName => {
                        const model = dashboard?.models?.find((m: any) => m.name === tName);
                        if (!model) return null;

                        return (
                          <div key={tName} className="border border-card-border rounded-xl p-4 bg-slate-50/50">
                            <h4 className="text-xs font-bold text-indigo-750 uppercase tracking-widest font-mono mb-3">{model.displayName} ({tName})</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {model.fields?.filter((f: any) => f.isVisible).map((field: any) => {
                                const colKey = `${tName}.${field.name}`;
                                const isChecked = reportSelectedColumns.includes(colKey);
                                return (
                                  <div key={field.id} className="flex items-center justify-between gap-4 p-2 bg-white border border-card-border rounded-xl shadow-xs">
                                    <label className="flex items-center gap-2.5 text-xs text-text-main font-semibold cursor-pointer select-none flex-1 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setReportSelectedColumns(prev => [...prev, colKey]);
                                          } else {
                                            setReportSelectedColumns(prev => prev.filter(c => c !== colKey));
                                          }
                                        }}
                                        className="h-4 w-4 rounded border-card-border text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                      <span className="truncate">{field.displayName} <span className="text-[10px] text-text-muted font-mono">({field.name})</span></span>
                                    </label>

                                    {isChecked && (
                                      <input
                                        type="text"
                                        placeholder="Alias (e.g. Email)"
                                        value={reportColumnAliases[colKey] || ''}
                                        onChange={(e) => {
                                          setReportColumnAliases(prev => ({
                                            ...prev,
                                            [colKey]: e.target.value
                                          }));
                                        }}
                                        className="rounded-lg border border-card-border bg-slate-50 hover:bg-white focus:bg-white py-1 px-2.5 text-xs text-text-main placeholder-slate-400 w-32 transition-all"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Columns Order & Aliases */}
                {reportBaseTable && reportSelectedColumns.length > 0 && (
                  <div className="space-y-4 border-t border-card-border pt-5">
                    <div>
                      <h3 className="text-sm font-bold text-text-main">Selected Columns Order</h3>
                      <p className="text-xs text-text-muted mt-0.5">Drag items using the grip handle or use up/down arrows to rearrange sequence.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {reportSelectedColumns.map((colKey, index) => {
                        const [tName, fName] = colKey.split('.');
                        const model = dashboard?.models?.find((m: any) => m.name === tName);
                        const field = model?.fields?.find((f: any) => f.name === fName);
                        const displayName = field ? `${model.displayName} > ${field.displayName}` : colKey;
                        const isDragging = draggedIndex === index;

                        return (
                          <div
                            key={colKey}
                            draggable
                            onDragStart={(e) => {
                              setDraggedIndex(index);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                            }}
                            onDragEnter={() => {
                              if (draggedIndex === null || draggedIndex === index) return;
                              setReportSelectedColumns(prev => {
                                const next = [...prev];
                                const item = next[draggedIndex];
                                next.splice(draggedIndex, 1);
                                next.splice(index, 0, item);
                                return next;
                              });
                              setDraggedIndex(index);
                            }}
                            onDragEnd={() => {
                              setDraggedIndex(null);
                            }}
                            className={`flex items-center justify-between gap-4 p-3 bg-white border rounded-xl shadow-xs transition-all duration-150 select-none ${
                              isDragging
                                ? 'border-indigo-400 bg-indigo-50/20 opacity-50 scale-[0.98]'
                                : 'border-card-border hover:border-slate-350 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-1 cursor-grab hover:bg-slate-200/65 rounded transition-colors text-slate-400 hover:text-slate-600 active:cursor-grabbing">
                                <GripVertical className="h-4 w-4 shrink-0" />
                              </div>
                              <span className="text-xs font-bold text-text-muted font-mono w-5">{index + 1}.</span>
                              <span className="text-xs font-semibold text-text-main">{displayName} <span className="text-[10px] text-text-muted font-mono">({colKey})</span></span>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Alias (e.g. Email)"
                                value={reportColumnAliases[colKey] || ''}
                                onChange={(e) => {
                                  setReportColumnAliases(prev => ({
                                    ...prev,
                                    [colKey]: e.target.value
                                  }));
                                }}
                                className="rounded-lg border border-card-border bg-white hover:border-slate-300 focus:border-indigo-500 py-1 px-2.5 text-xs text-text-main placeholder-slate-400 w-36 transition-all"
                              />

                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => {
                                  setReportSelectedColumns(prev => {
                                    const next = [...prev];
                                    const temp = next[index];
                                    next[index] = next[index - 1];
                                    next[index - 1] = temp;
                                    return next;
                                  });
                                }}
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                disabled={index === reportSelectedColumns.length - 1}
                                onClick={() => {
                                  setReportSelectedColumns(prev => {
                                    const next = [...prev];
                                    const temp = next[index];
                                    next[index] = next[index + 1];
                                    next[index + 1] = temp;
                                    return next;
                                  });
                                }}
                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filters Selection */}
                {reportBaseTable && reportSelectedColumns.length > 0 && (
                  <div className="space-y-4 border-t border-card-border pt-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-text-main">Default Query Filters (Implicit AND-joined constraints)</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setReportFilters(prev => [
                            ...prev,
                            { table: '', field: '', operator: 'equals', value: '' }
                          ]);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-card-border bg-white hover:bg-slate-50 text-indigo-600 rounded-xl transition-all cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Query Filter
                      </button>
                    </div>

                    {reportFilters.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {reportFilters.map((filter, idx) => {
                          return (
                            <div key={idx} className="p-3.5 bg-slate-50 border border-card-border rounded-xl flex flex-wrap gap-4 items-center">
                              <div className="flex-1 min-w-[180px]">
                                <select
                                  required
                                  value={filter.table && filter.field ? `${filter.table}.${filter.field}` : ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const [table, field] = val ? val.split('.') : ['', ''];
                                    const nextFilters = [...reportFilters];
                                    nextFilters[idx].table = table;
                                    nextFilters[idx].field = field;
                                    setReportFilters(nextFilters);
                                  }}
                                  className="block w-full rounded-xl border border-card-border bg-white py-1.5 px-3 text-xs text-text-main font-semibold"
                                >
                                  <option value="">Select Column</option>
                                  {reportSelectedColumns.map(colKey => {
                                    const [t, f] = colKey.split('.');
                                    const friendlyT = dashboard?.models?.find((m: any) => m.name === t)?.displayName || t;
                                    const friendlyF = dashboard?.models?.find((m: any) => m.name === t)?.fields?.find((fld: any) => fld.name === f)?.displayName || f;
                                    return (
                                      <option key={colKey} value={colKey}>{friendlyT} - {friendlyF}</option>
                                    );
                                  })}
                                </select>
                              </div>

                              <div className="w-32">
                                <select
                                  value={filter.operator}
                                  onChange={(e) => {
                                    const nextFilters = [...reportFilters];
                                    nextFilters[idx].operator = e.target.value;
                                    setReportFilters(nextFilters);
                                  }}
                                  className="block w-full rounded-xl border border-card-border bg-white py-1.5 px-3 text-xs text-text-main font-bold"
                                >
                                  <option value="equals">Equals (=)</option>
                                  <option value="contains">Contains (LIKE)</option>
                                  <option value="greaterThan">Greater Than (&gt;)</option>
                                  <option value="lessThan">Less Than (&lt;)</option>
                                </select>
                              </div>

                              <div className="flex-1 min-w-[150px]">
                                <input
                                  type="text"
                                  required
                                  value={filter.value}
                                  onChange={(e) => {
                                    const nextFilters = [...reportFilters];
                                    nextFilters[idx].value = e.target.value;
                                    setReportFilters(nextFilters);
                                  }}
                                  placeholder="Constraint value..."
                                  className="block w-full rounded-xl border border-card-border bg-white py-1.5 px-3 text-xs text-text-main placeholder-slate-400"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setReportFilters(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-2 text-red-650 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">No filters. All rows in matching criteria will be retrieved.</p>
                    )}
                  </div>
                )}

                </form>
              </div>

              {/* Right Column: Sticky Summary & Actions Sidebar Wrapper */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-6 bg-white border border-card-border rounded-2xl p-6 shadow-md space-y-5">
                  <h3 className="text-sm font-bold text-text-main">Report Configuration Summary</h3>
                  
                  <div className="divide-y divide-card-border text-xs font-semibold text-text-main space-y-3">
                    <div className="flex justify-between pt-1">
                      <span className="text-text-muted">Report Name</span>
                      <span className="truncate max-w-[180px] font-bold text-right" title={reportName || 'Untitled Report'}>
                        {reportName || 'Untitled Report'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-3">
                      <span className="text-text-muted">Base Table</span>
                      <span className="font-mono text-indigo-650 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100">
                        {reportBaseTable || 'None Selected'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-3">
                      <span className="text-text-muted">Table Joins</span>
                      <span>{reportJoins.length} active join(s)</span>
                    </div>
                    <div className="flex justify-between pt-3">
                      <span className="text-text-muted">Columns Selected</span>
                      <span className={reportSelectedColumns.length === 0 ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>
                        {reportSelectedColumns.length} selected
                      </span>
                    </div>
                    <div className="flex justify-between pt-3">
                      <span className="text-text-muted">Default Filters</span>
                      <span>{reportFilters.length} filter(s)</span>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-card-border flex flex-col gap-3">
                    <button
                      type="submit"
                      form="report-form"
                      disabled={createReportMutation.isPending || updateReportMutation.isPending || !reportName || !reportBaseTable || reportSelectedColumns.length === 0}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save className="h-4.5 w-4.5" />
                      {editingReport ? 'Update Report Configuration' : 'Create Report Configuration'}
                    </button>

                    <button
                      type="button"
                      onClick={resetReportForm}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-text-muted hover:text-text-main border border-card-border rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>

                    {(!reportName || !reportBaseTable || reportSelectedColumns.length === 0) && (
                      <div className="text-[10px] text-red-500 leading-normal bg-red-50/50 p-2.5 rounded-lg border border-red-100/50 space-y-0.5">
                        {!reportName && <div>• Report name is required</div>}
                        {!reportBaseTable && <div>• Base table is required</div>}
                        {reportSelectedColumns.length === 0 && <div>• Select at least one column</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-card-border rounded-2xl p-6.5 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-card-border pb-5">
                <div>
                  <h2 className="text-lg font-bold text-text-main">Custom Reports configurations</h2>
                  <p className="text-sm text-text-muted mt-1">Design logical report templates and grant specific permission levels to administrators.</p>
                </div>
                <button
                  onClick={() => setIsCreatingReport(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Create New Report
                </button>
              </div>

              {reports && reports.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-card-border text-sm text-text-main">
                    <thead>
                      <tr className="text-[10px] text-text-muted font-bold uppercase tracking-widest text-left">
                        <th className="pb-3 w-1/4">Report Name</th>
                        <th className="pb-3 w-1/4">Base Table</th>
                        <th className="pb-3 w-1/4">Columns Selected</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border font-medium">
                      {reports.map((report: any) => {
                        const colsCount = JSON.parse(report.columnsJson || '[]').length;
                        return (
                          <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4">
                              <div className="font-bold text-text-main">{report.name}</div>
                              {report.description && <div className="text-xs text-text-muted mt-0.5 font-normal">{report.description}</div>}
                            </td>
                            <td className="py-4 font-mono text-xs">{report.baseTable}</td>
                            <td className="py-4 text-xs font-semibold text-text-muted">{colsCount} column(s) projected</td>
                            <td className="py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewingReport(report)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-750 border border-emerald-150 hover:bg-emerald-100/70 rounded-lg transition-all cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-emerald-600" /> Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAssignmentsModal(report)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-750 border border-indigo-150 hover:bg-indigo-100/70 rounded-lg transition-all cursor-pointer"
                                >
                                  <Users className="h-3.5 w-3.5" /> Assignments
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditReport(report)}
                                  className="p-1.5 text-text-muted hover:text-text-main hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmConfig({
                                      isOpen: true,
                                      title: 'Delete Report Template',
                                      message: `Are you sure you want to delete the report template "${report.name}"?`,
                                      onConfirm: () => {
                                        deleteReportMutation.mutate(report.id);
                                        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                                      }
                                    });
                                  }}
                                  disabled={deleteReportMutation.isPending}
                                  className="p-1.5 text-red-650 hover:bg-red-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-16 border border-dashed border-card-border bg-slate-50 rounded-2xl text-center text-text-muted font-medium">
                  No custom report configurations created yet. Click "Create New Report" to start.
                </div>
              )}
            </div>
          )}

          {/* Assignments Modal */}
          {assigningReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white border border-card-border rounded-2xl w-full max-w-lg shadow-2xl p-6.5 space-y-5 flex flex-col max-h-[85vh]">
                <div>
                  <h3 className="text-base font-bold text-text-main">Delegate report assignments</h3>
                  <p className="text-xs text-text-muted mt-0.5">Assign custom report "{assigningReport.name}" access and permissions to administrators.</p>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-card-border max-h-[45vh] pr-2">
                  {admins && admins.length > 0 ? (
                    admins.map((admin: any) => {
                      const settings = assignmentUpdates[admin.id] || { assigned: false, canExport: false };
                      return (
                        <div key={admin.id} className="py-3 flex items-center justify-between gap-4">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={settings.assigned}
                              onChange={(e) => {
                                setAssignmentUpdates(prev => ({
                                  ...prev,
                                  [admin.id]: {
                                    ...prev[admin.id],
                                    assigned: e.target.checked
                                  }
                                }));
                              }}
                              className="h-4 w-4 rounded border-card-border text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="text-xs text-text-main font-semibold">{admin.email}</span>
                          </label>

                          {settings.assigned && (
                            <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-text-muted cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={settings.canExport}
                                onChange={(e) => {
                                  setAssignmentUpdates(prev => ({
                                    ...prev,
                                    [admin.id]: {
                                      ...prev[admin.id],
                                      canExport: e.target.checked
                                    }
                                  }));
                                }}
                                className="h-3.5 w-3.5 rounded border-card-border text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              Allow CSV Export
                            </label>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-xs text-text-muted font-medium">No admin accounts configured. Create admin users first.</div>
                  )}
                </div>

                <div className="pt-4 border-t border-card-border flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAssigningReport(null)}
                    className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main border border-card-border rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAssignments}
                    disabled={saveAssignmentsMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    Save Assignments
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report Preview Modal */}
          {previewingReport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white border border-card-border rounded-2xl w-full max-w-5xl shadow-2xl p-6.5 space-y-5 flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between border-b border-card-border pb-4">
                  <div>
                    <h3 className="text-base font-bold text-text-main flex items-center gap-2">
                      <span className="p-1.5 bg-emerald-50 border border-emerald-150 text-emerald-650 rounded-lg"><Eye className="h-4 w-4" /></span>
                      Query Execution Preview: {previewingReport.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      Testing query layout and verifying data retrieval logic from database tables.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewingReport(null)}
                    className="px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text-main border border-card-border rounded-lg bg-white hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50 border border-card-border rounded-2xl p-4.5 min-h-[250px] flex flex-col justify-center relative">
                  {isPreviewLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
                      <div className="h-7 w-7 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
                      <span className="text-xs font-bold tracking-wide">Compiling SQL and querying database...</span>
                    </div>
                  ) : previewError ? (
                    <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-4 rounded-xl space-y-1.5 leading-relaxed self-stretch">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>⚠️ Query Execution Failed</span>
                      </div>
                      <p className="font-mono text-[11px] bg-white p-3 rounded-lg border border-red-100 select-all overflow-x-auto">
                        {(previewError as any)?.response?.data?.error || (previewError as any)?.message || 'Internal database query failure'}
                      </p>
                      <p className="text-[10px] text-red-650 font-medium">
                        This error usually indicates a mismatch in base tables, join conditions, or missing schema fields. Review the columns/joins builder mappings and verify your connections.
                      </p>
                    </div>
                  ) : previewData && (!previewData.data || previewData.data.length === 0) ? (
                    <div className="text-center py-12 text-xs text-text-muted font-medium">
                      Query executed successfully, but returned 0 rows matching these constraints.
                    </div>
                  ) : previewData ? (
                    <div className="overflow-x-auto w-full h-full align-top">
                      <table className="min-w-full divide-y divide-slate-200 text-xs text-slate-700 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <thead className="bg-slate-100/70">
                          <tr className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-left border-b border-slate-200">
                            {previewData.columns?.map((col: any) => (
                              <th key={col.name} className="py-3 px-4 font-mono text-[10px] whitespace-nowrap">
                                <span className="text-slate-800 font-bold tracking-tight block normal-case font-sans text-xs mb-0.5">{formatDisplayName(col.displayName)}</span>
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 font-medium">
                          {previewData.data?.map((row: any, rIdx: number) => (
                            <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors">
                              {previewData.columns?.map((col: any) => (
                                <td key={col.name} className="py-2.5 px-4 font-mono text-[11px] max-w-sm truncate whitespace-nowrap">
                                  {row[col.name] !== null && row[col.name] !== undefined ? (
                                    String(row[col.name])
                                  ) : (
                                    <span className="text-slate-400 italic font-sans text-[10px]">NULL</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>

                <div className="pt-4 border-t border-card-border flex items-center justify-between gap-4 shrink-0">
                  <div className="text-[11px] text-text-muted font-semibold">
                    {previewData && !isPreviewLoading && !previewError && (
                      <span>
                        Previewing first <span className="text-indigo-650 font-bold">{previewData.data?.length}</span> rows out of <span className="text-indigo-650 font-bold">{previewData.pagination?.total}</span> total matching records.
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewingReport(null)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 px-5 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}

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
