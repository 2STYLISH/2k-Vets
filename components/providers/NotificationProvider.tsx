'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  resolve: (value: boolean) => void;
}

interface NotificationContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (title: string, message: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const showConfirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        resolve,
      });
    });
  }, []);

  const handleConfirmAction = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Toasts Container */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none items-center">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[280px] max-w-sm rounded-xl p-4 shadow-xl border backdrop-blur-md transform transition-all duration-300 translate-x-0 opacity-100 ${
              toast.type === 'error'
                ? 'bg-red-950/90 border-red-900/50 text-red-200'
                : toast.type === 'success'
                ? 'bg-green-950/90 border-green-900/50 text-green-200'
                : 'bg-navy-900/90 border-white/[0.08] text-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {toast.type === 'error' && <span className="text-red-500">⚠</span>}
                {toast.type === 'success' && <span className="text-green-500">✓</span>}
                {toast.type === 'info' && <span className="text-blue-400">ℹ</span>}
              </div>
              <p className="text-sm font-mono leading-relaxed">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmState?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-white/[0.08] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Accent stripe */}
            <div className="w-full h-1 bg-gradient-to-r from-flag-red via-flag-gold to-navy" />
            
            <div className="p-6">
              <h3 className="text-xl font-display text-white tracking-widest mb-3 uppercase">{confirmState.title}</h3>
              <p className="text-white/70 font-mono text-sm leading-relaxed mb-8">
                {confirmState.message}
              </p>
              
              <div className="flex items-center justify-end gap-4">
                <button
                  onClick={() => handleConfirmAction(false)}
                  className="px-6 py-2.5 rounded-xl font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors border border-transparent hover:border-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmAction(true)}
                  className="px-6 py-2.5 rounded-xl font-mono text-xs uppercase tracking-widest text-white bg-flag-red hover:bg-red-700 transition-colors shadow-lg border border-flag-red/50"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
