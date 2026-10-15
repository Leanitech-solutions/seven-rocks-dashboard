'use client';
import React, { useState, useRef, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  error:   <AlertCircle  className="h-4 w-4 text-rose-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  info:    <Info          className="h-4 w-4 text-blue-600" />,
};

const STYLES: Record<ToastType, { border: string; bg: string; title: string; icon: string }> = {
  success: { border: 'border-emerald-200', bg: 'bg-emerald-50',  title: 'text-emerald-800', icon: 'bg-emerald-100' },
  error:   { border: 'border-rose-200',    bg: 'bg-rose-50',     title: 'text-rose-800',    icon: 'bg-rose-100' },
  warning: { border: 'border-amber-200',   bg: 'bg-amber-50',    title: 'text-amber-800',   icon: 'bg-amber-100' },
  info:    { border: 'border-blue-200',    bg: 'bg-blue-50',     title: 'text-blue-800',    icon: 'bg-blue-100' },
};

const TITLES: Record<ToastType, string> = {
  success: 'Success',
  error:   'Error',
  warning: 'Warning',
  info:    'Info',
};

export function useToast(durationMs = 4000) {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type, visible: true });
    timer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), durationMs);
  }, [durationMs]);

  const hideToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(t => ({ ...t, visible: false }));
  }, []);

  /** Drop this element anywhere inside your component's JSX root */
  const ToastElement = toast.visible ? (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-start gap-3 bg-white border ${STYLES[toast.type].border} shadow-xl rounded-2xl px-5 py-4 max-w-sm animate-fade-in`}>
      <div className={`shrink-0 p-1.5 ${STYLES[toast.type].icon} rounded-full`}>
        {ICONS[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${STYLES[toast.type].title}`}>{TITLES[toast.type]}</p>
        <p className="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button onClick={hideToast} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : null;

  return { showToast, ToastElement };
}
