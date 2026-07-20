"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

/*
 * Keyboard Shortcuts for TowHub Dashboard
 *
 * Cmd/Ctrl + K → Open search
 * Cmd/Ctrl + N → New job
 * Cmd/Ctrl + D → Go to Dispatch
 * Cmd/Ctrl + R → Go to Reports
 * 1-9 → Navigate to sidebar items
 * ? → Show shortcuts help
 */

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const router = useRouter();

  const shortcuts: Shortcut[] = [
    { key: "k", ctrl: true, description: "Search", action: () => document.querySelector<HTMLInputElement>("[data-search-input]")?.focus() },
    { key: "n", ctrl: true, description: "New Job", action: () => router.push("/dashboard/jobs") },
    { key: "d", ctrl: true, description: "Dispatch", action: () => router.push("/dashboard/dispatch") },
    { key: "r", ctrl: true, description: "Reports", action: () => router.push("/dashboard/reports") },
    { key: "h", ctrl: true, description: "Home", action: () => router.push("/dashboard") },
  ];

  const handler = useCallback((e: KeyboardEvent) => {
    // Don't trigger in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      // Only Cmd+K should work in inputs
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
      }
      return;
    }

    for (const s of shortcuts) {
      const ctrlMatch = s.ctrl ? (e.metaKey || e.ctrlKey) : true;
      const shiftMatch = s.shift ? e.shiftKey : true;
      if (e.key === s.key && ctrlMatch && shiftMatch) {
        e.preventDefault();
        s.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);

  return { shortcuts };
}

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  const mod = isMac ? "⌘" : "Ctrl";

  const items = [
    { keys: `${mod}+K`, desc: "Open search" },
    { keys: `${mod}+N`, desc: "New job" },
    { keys: `${mod}+D`, desc: "Go to Dispatch" },
    { keys: `${mod}+R`, desc: "Go to Reports" },
    { keys: `${mod}+H`, desc: "Go to Dashboard" },
    { keys: "?", desc: "Show this help" },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-semibold text-[#061b31]">⌨️ Keyboard Shortcuts</h3>
          <button onClick={onClose} className="text-[#64748d] hover:text-[#061b31]">×</button>
        </div>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.keys} className="flex items-center justify-between py-2 border-b border-[#e5edf5] last:border-0">
              <span className="text-[13px] text-[#64748d]">{item.desc}</span>
              <kbd className="px-2 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded text-[11px] font-mono text-[#061b31]">{item.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
