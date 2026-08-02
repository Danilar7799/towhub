"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

/*
 * Toast Notification System — Stripe-style
 * Slide-in from right, auto-dismiss, action button
 */

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: Toast["type"], action?: Toast["action"]) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info", action?: Toast["action"]) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, action ? 6000 : 4000);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const icons: Record<string, string> = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    success: { bg: "#dcfce7", border: "#bbf7d0", text: "#166534", icon: "#15be53" },
    error: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", icon: "#dc2626" },
    warning: { bg: "#fef3c7", border: "#fde68a", text: "#92400e", icon: "#f59e0b" },
    info: { bg: "#dbeafe", border: "#bfdbfe", text: "#1e40af", icon: "#3b82f6" },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-[380px]">
        {toasts.map(t => {
          const c = colors[t.type];
          return (
            <div
              key={t.id}
              className="toast-enter flex items-start gap-3 p-3.5 rounded-lg border"
              style={{ background: c.bg, borderColor: c.border, boxShadow: "rgba(50,50,93,0.15) 0px 10px 30px -10px" }}
            >
              <span className="text-[14px] font-bold shrink-0 mt-0.5" style={{ color: c.icon }}>{icons[t.type]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium" style={{ color: c.text }}>{t.message}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {t.action && (
                  <button
                    onClick={() => { t.action!.onClick(); remove(t.id); }}
                    className="text-[12px] font-medium px-2 py-0.5 rounded hover:bg-white/50 transition-colors"
                    style={{ color: c.text }}
                  >
                    {t.action.label}
                  </button>
                )}
                <button onClick={() => remove(t.id)} className="text-[14px] opacity-50 hover:opacity-100" style={{ color: c.text }}>×</button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}