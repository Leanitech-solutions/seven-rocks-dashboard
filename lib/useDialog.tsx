import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, HelpCircle, Info } from 'lucide-react';

interface DialogState {
  isOpen: boolean;
  type: 'confirm' | 'prompt' | 'alert';
  title: string;
  message: string;
  placeholder?: string;
  resolve: (value: boolean | string | null) => void;
}

export function useDialog() {
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const confirmDialog = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({ isOpen: true, type: 'confirm', title, message, resolve: resolve as any });
    });
  }, []);

  const promptDialog = useCallback((title: string, message: string, placeholder = '') => {
    return new Promise<string | null>((resolve) => {
      setDialogState({ isOpen: true, type: 'prompt', title, message, placeholder, resolve: resolve as any });
    });
  }, []);

  const alertDialog = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({ isOpen: true, type: 'alert', title, message, resolve: resolve as any });
    });
  }, []);

  const closeDialog = (value: any) => {
    if (dialogState) dialogState.resolve(value);
    setDialogState(null);
  };

  const DialogElement = () => {
    if (!mounted || !dialogState || !dialogState.isOpen) return null;
    
    return createPortal(
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-brand-dark/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-scale-in">
          <div className="flex items-center gap-3 text-brand-dark">
            {dialogState.type === 'confirm' && <HelpCircle className="h-6 w-6 text-brand-primary" />}
            {dialogState.type === 'prompt' && <AlertCircle className="h-6 w-6 text-amber-500" />}
            {dialogState.type === 'alert' && <Info className="h-6 w-6 text-blue-500" />}
            <h3 className="font-serif font-bold text-lg">{dialogState.title}</h3>
          </div>
          <p className="text-sm text-brand-secondary">{dialogState.message}</p>
          
          {dialogState.type === 'prompt' && (
            <input
              autoFocus
              type="text"
              id="dialog-prompt-input"
              placeholder={dialogState.placeholder}
              className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') closeDialog(e.currentTarget.value);
              }}
            />
          )}

          <div className="flex justify-end gap-3 pt-4">
            {dialogState.type !== 'alert' && (
              <button
                onClick={() => closeDialog(null)}
                className="px-4 py-2 text-xs font-semibold text-brand-secondary hover:text-brand-dark transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                if (dialogState.type === 'prompt') {
                  const val = (document.getElementById('dialog-prompt-input') as HTMLInputElement)?.value || '';
                  closeDialog(val);
                } else {
                  closeDialog(true);
                }
              }}
              className="px-5 py-2.5 bg-brand-primary hover:bg-brand-dark text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              {dialogState.type === 'alert' ? 'OK' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return { confirmDialog, promptDialog, alertDialog, DialogElement };
}
