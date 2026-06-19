'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { FileUp, Check } from 'lucide-react';

interface PrismaTabProps {
  dashboardId: string;
  refetch: () => void;
}

export default function PrismaTab({ dashboardId, refetch }: PrismaTabProps) {
  const [schemaText, setSchemaText] = useState('');
  const [prismaSuccess, setPrismaSuccess] = useState('');
  const [prismaError, setPrismaError] = useState('');

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

  const handlePrismaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPrismaSuccess('');
    setPrismaError('');
    uploadPrismaMutation.mutate(schemaText);
  };

  return (
    <div className="bg-white border border-card-border rounded-2xl p-6.5 shadow-md space-y-6">
      <div>
        <h2 className="text-lg font-bold text-text-main">Upload Prisma Schema</h2>
        <p className="text-sm text-text-muted mt-1">Paste your schema.prisma file content. The parser will detect tables and properties without affecting your live database connection.</p>
      </div>

      {prismaSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-xl flex items-center gap-2.5">
          <Check className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
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
  );
}
