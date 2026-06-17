'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white border border-card-border rounded-3xl max-w-md w-full p-6 shadow-2xl relative scale-100 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onCancel}
          className="absolute top-5 right-5 text-text-muted hover:text-text-main p-1 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex gap-4">
          <div className={`p-3 rounded-2xl shrink-0 h-12 w-12 flex items-center justify-center border ${
            isDanger 
              ? 'bg-rose-50 border-rose-100 text-rose-650' 
              : 'bg-indigo-50 border-indigo-100 text-indigo-600'
          }`}>
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div className="space-y-1.5 flex-1">
            <h3 className="text-lg font-black text-text-main tracking-tight leading-none pt-2.5">
              {title}
            </h3>
            <p className="text-text-muted text-sm font-medium leading-relaxed pt-1">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-card-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl bg-white border border-card-border px-5 py-2.5 text-sm font-semibold text-text-muted hover:bg-slate-50 hover:text-text-main cursor-pointer transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg active:scale-95 cursor-pointer border transition-all ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20 border-rose-400/20'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 border-indigo-400/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
