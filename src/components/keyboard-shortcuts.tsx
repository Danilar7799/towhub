"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

/*
 * Keyboard Shortcuts for TowHub Dashboard
 * Linear-style: fast navigation, quick actions
 *
 * ⌘K → Command Palette
 * ⌘N → New Job
 * ⌘D → Dispatch
 * ⌘R → Reports
 * ⌘H → Dashboard
 * ⌘L → Live Calls
 * ⌘J → Jobs
 * ⌘F → Fleet
 * ⌘I → Invoices
 * ⌘, → Settings
 * ? → Shortcuts help
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
    { key: "k", ctrl: true, description: "Command Palette", action: () => {} },
    { key: "n", ctrl: true, description: "New Job", action: () => router.push("/dashboard/jobs?new=1") },
    { key: "d", ctrl: true, description: "Dispatch", action: () => router.push("/dashboard/dispatch") },
    { key: "l", ctrl: true, description: "Live Calls", action: () => router.push("/dashboard/live-calls") },
    { key: "j", ctrl: true, description: "Jobs", action: () => router.push("/dashboard/jobs") },
    { key: "r", ctrl: true, description: "Reports", action: () => router.push("/dashboard/reports") },
    { key: "h", ctrl: true, description: "Dashboard", action: () => router.push("/dashboard") },
    { key: "f", ctrl: true, description: "Fleet", action: () => router.push("/dashboard/fleet") },
    { key: "i", ctrl: true, description: "Invoices", action: () => router.push("/dashboard/invoices") },
    { key: ",", ctrl: true, description: "Settings", action: () => router.push("/dashboard/settings") },
  ];

  const handler = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("toggle-command-palette"));
      }
      return;
    }

    // ? for help
    if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("toggle-shortcuts-help"));
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
    { keys: `${mod}+K`, desc: "Command Palette" },
    { keys: `${mod}+N`, desc: "New Job" },
    { keys: `${mod}+D`, desc: "Dispatch" },
    { keys: `${mod}+L`, desc: "Live Calls" },
    { keys: `${mod}+J`, desc: "Jobs" },
    { keys: `${mod}+R`, desc: "Reports" },
    { keys: `${mod}+H`, desc: "Dashboard" },
    { keys: `${mod}+F`, desc: "Fleet" },
    { keys: `${mod}+I`, desc: "Invoices" },
    { keys: `${mod}+,`, desc: "Settings" },
    { keys: "?", desc: "Show this help" },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-sm w-full p-6"
        style={{ boxShadow: "rgba(50,50,93,0.25) 0px 50px 100px -20px, rgba(0,0,0,0.1) 0px 30px 60px -10px" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-semibold text-[#061b31]">⌨️ Keyboard Shortcuts</h3>
          <button onClick={onClose} className="text-[18px] text-[#64748d] hover:text-[#061b31]">×</button>
        </div>
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.keys} className="flex items-center justify-between py-2 px-1 rounded hover:bg-[#f6f9fc] transition-colors">
              <span className="text-[13px] text-[#64748d]">{item.desc}</span>
              <kbd className="px-2 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded text-[11px] font-mono text-[#061b31]">{item.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}