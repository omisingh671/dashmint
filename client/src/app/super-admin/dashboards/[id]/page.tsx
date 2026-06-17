'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ArrowLeft, Save, Play, FileUp, Settings, Check, ChevronDown, ChevronRight, Eye, EyeOff, Trash2, Plus, Edit2, Users } from 'lucide-react';
import Link from 'next/link';

export default function DashboardConfig() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dashboardId = params.id as string;

  // Tabs
  const [activeTab, setActiveTab] = useState<'connection' | 'prisma' | 'schema' | 'relations' | 'reports'>('connection');

  // Connection form states
  const [host, setHost] = useState('');
  const [port, setPort] = useState('3306');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [sslEnabled, setSslEnabled] = useState(false);

  // Prisma form states
  const [schemaText, setSchemaText] = useState('');

  // Schema configuration state
  const [schemaModels, setSchemaModels] = useState<any[]>([]);
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>({});

  // Messages
  const [connSuccess, setConnSuccess] = useState('');
  const [connError, setConnError] = useState('');
  const [prismaSuccess, setPrismaSuccess] = useState('');
  const [prismaError, setPrismaError] = useState('');
  const [schemaSuccess, setSchemaSuccess] = useState('');
  const [schemaError, setSchemaError] = useState('');

  // Relations states
  const [fromTable, setFromTable] = useState('');
  const [fromColumn, setFromColumn] = useState('');
  const [toTable, setToTable] = useState('');
  const [toColumn, setToColumn] = useState('');
  const [relationsSuccess, setRelationsSuccess] = useState('');
  const [relationsError, setRelationsError] = useState('');

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

  // Fetch Relations
  const { data: relations, refetch: refetchRelations } = useQuery({
    queryKey: ['relations', dashboardId],
    queryFn: () => api.get(`/relations/${dashboardId}`).then(res => res.data),
    enabled: activeTab === 'relations' || activeTab === 'reports'
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
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  // Populate connection details on load
  useEffect(() => {
    if (dashboard?.connection) {
      setHost(dashboard.connection.host || '');
      setPort(String(dashboard.connection.port || '3306'));
      setUsername(dashboard.connection.username || '');
      setDatabase(dashboard.connection.database || '');
      setSslEnabled(!!dashboard.connection.sslEnabled);
    }
    if (dashboard?.models) {
      setSchemaModels(JSON.parse(JSON.stringify(dashboard.models)));
    }
  }, [dashboard]);

  // Mutations
  const saveConnectionMutation = useMutation({
    mutationFn: (conn: any) => api.post(`/dashboards/${dashboardId}/connection`, conn),
    onSuccess: () => {
      setConnSuccess('Database connection settings saved successfully.');
      setConnError('');
      refetch();
    },
    onError: (err: any) => {
      setConnError(err.response?.data?.error || 'Failed to save connection credentials');
      setConnSuccess('');
    }
  });

  const introspectMutation = useMutation({
    mutationFn: () => api.post(`/dashboards/${dashboardId}/introspect`),
    onSuccess: (data: any) => {
      setConnSuccess('Live introspection sync completed successfully. Tables synchronized.');
      setConnError('');
      refetch();
    },
    onError: (err: any) => {
      setConnError(err.response?.data?.error || 'Database introspection failed. Verify connection settings.');
      setConnSuccess('');
    }
  });

  const uploadPrismaMutation = useMutation({
    mutationFn: (text: string) => api.post(`/dashboards/${dashboardId}/upload-schema`, { schemaText: text }),
    onSuccess: () => {
      setPrismaSuccess('Prisma schema parsed and synchronized successfully.');
      setPrismaError('');
      setSchemaText('');
      refetch();
    },
    onError: (err: any) => {
      setPrismaError(err.response?.data?.error || 'Prisma schema file parsing failed.');
      setPrismaSuccess('');
    }
  });

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

  const handleConnectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConnSuccess('');
    setConnError('');
    saveConnectionMutation.mutate({
      host,
      port: parseInt(port),
      username,
      password: password || undefined, // send only if modified
      database,
      sslEnabled
    });
  };

  const handlePrismaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPrismaSuccess('');
    setPrismaError('');
    uploadPrismaMutation.mutate(schemaText);
  };

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

  if (dl) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
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

      {/* Connection Panel */}
      {activeTab === 'connection' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white border border-card-border rounded-2xl p-6.5 shadow-md space-y-6">
            <h2 className="text-lg font-bold text-text-main">Database Credentials</h2>
            
            {connSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl flex items-center gap-2.5">
                <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                <span className="font-semibold leading-relaxed">{connSuccess}</span>
              </div>
            )}
            {connError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-xl leading-relaxed">
                {connError}
              </div>
            )}

            <form onSubmit={handleConnectionSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Host Server</label>
                <input
                  type="text"
                  required
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
                  placeholder="127.0.0.1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Port</label>
                <input
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
                  placeholder="3306"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Database Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
                  placeholder="root"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
                  Password <span className="text-slate-400 font-normal lowercase">(skip update if blank)</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Database Name</label>
                <input
                  type="text"
                  required
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className="block w-full rounded-xl border border-card-border bg-white py-2.5 px-4 text-text-main placeholder-slate-400 sm:text-sm"
                  placeholder="sales_db"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="inline-flex items-center text-sm font-semibold text-text-muted gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sslEnabled}
                    onChange={(e) => setSslEnabled(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-card-border bg-white text-indigo-600 focus:ring-indigo-500"
                  />
                  Secure SSL Connection Required
                </label>
              </div>

              <div className="sm:col-span-2 pt-4 border-t border-card-border flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saveConnectionMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Save Settings
                </button>

                <button
                  type="button"
                  onClick={() => introspectMutation.mutate()}
                  disabled={introspectMutation.isPending || !dashboard?.connection}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {introspectMutation.isPending ? 'Syncing Schema...' : 'Trigger Live Introspection'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-card-border p-6 flex flex-col justify-between shadow-md">
            <div>
              <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
                <Settings className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-text-main font-bold text-base mb-2">Dev Sandboxing Note</h3>
              <p className="text-text-muted text-xs leading-relaxed mb-4">
                Use the mock customer database provided by your local MySQL installation to test dashboard generation.
              </p>
              <div className="bg-slate-50 p-4 rounded-xl border border-card-border font-mono text-[11px] text-slate-600 space-y-2">
                <div><span className="text-slate-400 uppercase tracking-widest text-[9px] block">Host:</span><span className="text-indigo-600 font-bold">127.0.0.1</span></div>
                <div className="border-t border-slate-200 pt-1.5"><span className="text-slate-400 uppercase tracking-widest text-[9px] block">Port:</span><span className="text-indigo-600 font-bold">3306</span></div>
                <div className="border-t border-slate-200 pt-1.5"><span className="text-slate-400 uppercase tracking-widest text-[9px] block">User:</span><span className="text-indigo-600 font-bold">YOUR_USER</span></div>
                <div className="border-t border-slate-200 pt-1.5"><span className="text-slate-400 uppercase tracking-widest text-[9px] block">Database:</span><span className="text-emerald-700 font-bold">dashmint_customer</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prisma Schema Upload Panel */}
      {activeTab === 'prisma' && (
        <div className="bg-white border border-card-border rounded-2xl p-6.5 shadow-md space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-main">Upload Prisma Schema</h2>
            <p className="text-sm text-text-muted mt-1">Paste your schema.prisma file content. The parser will detect tables and properties without affecting your live database connection.</p>
          </div>

          {prismaSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl flex items-center gap-2.5">
              <Check className="h-4.5 w-4.5 text-emerald-600" />
              <span className="font-semibold leading-relaxed">{prismaSuccess}</span>
            </div>
          )}
          {prismaError && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-xl leading-relaxed">
              {prismaError}
            </div>
          )}

          <form onSubmit={handlePrismaSubmit} className="space-y-4">
            <textarea
              required
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              placeholder={`model User {\n  id    Int    @id @default(autoincrement())\n  email String @unique\n}`}
              className="block w-full rounded-2xl border border-card-border bg-slate-50 p-4 text-slate-800 font-mono text-sm h-96 leading-relaxed focus:bg-white"
            />

            <div className="pt-2 border-t border-card-border">
              <button
                type="submit"
                disabled={uploadPrismaMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <FileUp className="h-4.5 w-4.5" />
                {uploadPrismaMutation.isPending ? 'Syncing...' : 'Parse & Sync Prisma Schema'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schema Visibility Customization Panel */}
      {activeTab === 'schema' && (
        <div className="bg-white border border-card-border rounded-2xl p-6.5 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-card-border pb-5">
            <div>
              <h2 className="text-lg font-bold text-text-main">Dynamic Navigation Layout</h2>
              <p className="text-sm text-text-muted mt-1">Configure user-friendly labels and toggle visibility of tables/fields for admin users.</p>
            </div>
            <button
              onClick={handleSchemaConfigSubmit}
              disabled={saveSchemaConfigMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              <Save className="h-4.5 w-4.5" />
              Save Layout Configurations
            </button>
          </div>

          {schemaSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl flex items-center gap-2.5">
              <Check className="h-4.5 w-4.5 text-emerald-600" />
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
                        <span className="font-mono text-[10px] font-bold text-indigo-650 uppercase tracking-widest px-2.5 py-1 bg-white border border-card-border rounded-lg">
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
                                    <span className="text-[9px] font-extrabold uppercase bg-indigo-55 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono">
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
      )}

      {/* Table Relations Panel */}
      {activeTab === 'relations' && (
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
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 active:scale-95 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
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
                                if (confirm('Are you sure you want to delete this relationship?')) {
                                  deleteRelationMutation.mutate(rel.id);
                                }
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
        </div>
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
            <div className="bg-white border border-card-border rounded-2xl p-6.5 shadow-md space-y-6">
              <div className="flex items-center justify-between border-b border-card-border pb-4">
                <h2 className="text-lg font-bold text-text-main">{editingReport ? 'Edit Custom Report' : 'Create Custom Report'}</h2>
                <button
                  type="button"
                  onClick={resetReportForm}
                  className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main border border-card-border rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-6">
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-card-border bg-white hover:bg-slate-50 text-indigo-650 rounded-xl transition-all cursor-pointer"
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
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Base/Prior Column</label>
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
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Join Table Column</label>
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
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                        className="h-4 w-4 rounded border-card-border text-indigo-650 focus:ring-indigo-500 cursor-pointer"
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-card-border bg-white hover:bg-slate-50 text-indigo-650 rounded-xl transition-all cursor-pointer"
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

                <div className="pt-5 border-t border-card-border flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetReportForm}
                    className="px-5 py-2.5 text-sm font-bold text-text-muted hover:text-text-main border border-card-border rounded-xl bg-white hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createReportMutation.isPending || updateReportMutation.isPending || reportSelectedColumns.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 active:scale-95 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="h-4.5 w-4.5" />
                    {editingReport ? 'Update Report Configuration' : 'Create Report Configuration'}
                  </button>
                </div>
              </form>
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
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 active:scale-95 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer self-start sm:self-auto"
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
                                    if (confirm('Are you sure you want to delete this report template?')) {
                                      deleteReportMutation.mutate(report.id);
                                    }
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
                              className="h-4 w-4 rounded border-card-border text-indigo-650 focus:ring-indigo-500 cursor-pointer"
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
                                className="h-3.5 w-3.5 rounded border-card-border text-indigo-650 focus:ring-indigo-500 cursor-pointer"
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
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-650 hover:bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    Save Assignments
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
