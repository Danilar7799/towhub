"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: Toast["type"]) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const success = useCallback((msg: string) => { add(msg, "success"); }, [add]);
  const error = useCallback((msg: string) => { add(msg, "error"); }, [add]);
  const info = useCallback((msg: string) => { add(msg, "info"); }, [add]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-[0_8px_24px_rgba(50,50,93,0.15)] text-[13px] font-medium animate-[slideIn_0.2s_ease-out] ${
              t.type === "success" ? "bg-[#15be53] text-white" :
              t.type === "error" ? "bg-[#dc2626] text-white" :
              "bg-[#061b31] text-white"
            }`}
          >
            {t.type === "success" ? "✓ " : t.type === "error" ? "✕ " : "ℹ "}{t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
