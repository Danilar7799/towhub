"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/*
 * Command Palette — ⌘K / Ctrl+K
 * Linear-style: search everything, quick actions, keyboard navigation
 * Design: Stripe tokens — #533afd accent, #061b31 text, #64748d body, #e5edf5 border
 */

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: string;
  action: () => void;
  section: string;
  shortcut?: string;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const navigate = useCallback((path: string) => {
    router.push(path);
    onClose();
  }, [router, onClose]);

  const commands: CommandItem[] = [
    // Navigation
    { id: "nav-overview", label: "Overview", icon: "📊", section: "Navigation", action: () => navigate("/dashboard") },
    { id: "nav-dispatch", label: "Dispatch", icon: "🗺️", section: "Navigation", shortcut: "D", action: () => navigate("/dashboard/dispatch") },
    { id: "nav-jobs", label: "Jobs", icon: "📋", section: "Navigation", shortcut: "J", action: () => navigate("/dashboard/jobs") },
    { id: "nav-live-calls", label: "Live Calls", icon: "📞", section: "Navigation", action: () => navigate("/dashboard/live-calls") },
    { id: "nav-fleet", label: "Fleet", icon: "🚛", section: "Navigation", action: () => navigate("/dashboard/fleet") },
    { id: "nav-customers", label: "Customers", icon: "👥", section: "Navigation", action: () => navigate("/dashboard/customers") },
    { id: "nav-drivers", label: "Team", icon: "👤", section: "Navigation", action: () => navigate("/dashboard/drivers") },
    { id: "nav-compliance", label: "Compliance", icon: "🛡️", section: "Navigation", action: () => navigate("/dashboard/compliance") },
    { id: "nav-invoices", label: "Invoices", icon: "💰", section: "Navigation", action: () => navigate("/dashboard/invoices") },
    { id: "nav-reports", label: "Reports", icon: "📊", section: "Navigation", action: () => navigate("/dashboard/reports") },
    { id: "nav-impound", label: "Impound", icon: "🅿️", section: "Navigation", action: () => navigate("/dashboard/impound") },
    { id: "nav-call-history", label: "Call History", icon: "📞", section: "Navigation", action: () => navigate("/dashboard/calls") },
    { id: "nav-driver-view", label: "Driver View", icon: "📱", section: "Navigation", action: () => navigate("/dashboard/driver") },

    // Quick Actions
    { id: "action-new-job", label: "Create New Job", icon: "➕", section: "Actions", shortcut: "N", action: () => navigate("/dashboard/jobs?new=1") },
    { id: "action-add-vehicle", label: "Add Vehicle", icon: "🚛", section: "Actions", action: () => navigate("/dashboard/fleet?add=1") },
    { id: "action-add-driver", label: "Add Driver", icon: "👤", section: "Actions", action: () => navigate("/dashboard/drivers?add=1") },
    { id: "action-new-invoice", label: "Create Invoice", icon: "💰", section: "Actions", action: () => navigate("/dashboard/invoices?new=1") },

    // AI
    { id: "ai-retell", label: "Retell AI Config", icon: "🎙️", section: "AI", action: () => navigate("/dashboard/retell-config") },
    { id: "ai-bland", label: "Bland.ai Config", icon: "🤖", section: "AI", action: () => navigate("/dashboard/bland-config") },

    // Settings
    { id: "settings-visibility", label: "Admin Visibility", icon: "🎛️", section: "Settings", action: () => navigate("/dashboard/admin-visibility") },
    { id: "settings-billing", label: "Billing", icon: "💳", section: "Settings", action: () => navigate("/dashboard/billing") },
    { id: "settings-main", label: "Settings", icon: "⚙️", section: "Settings", action: () => navigate("/dashboard/settings") },
  ];

  const filtered = query.trim() === ""
    ? commands
    : commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.section.toLowerCase().includes(query.toLowerCase())
      );

  // Group by section
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {});

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[selectedIndex]?.action();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-[560px] z-[101]" onClick={e => e.stopPropagation()}>
        <div
          className="bg-white rounded-lg overflow-hidden"
          style={{
            boxShadow: "rgba(50,50,93,0.25) 0px 50px 100px -20px, rgba(0,0,0,0.1) 0px 30px 60px -10px",
            fontFeatureSettings: "'ss01'",
          }}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e5edf5]">
            <svg width="18" height="18" fill="none" stroke="#64748d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="5" /><line x1="16" y1="16" x2="12.5" y2="12.5" /></svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands, pages, actions..."
              className="flex-1 text-[15px] text-[#061b31] placeholder-[#94a3b8] outline-none bg-transparent"
            />
            <kbd className="text-[10px] text-[#94a3b8] bg-[#f6f9fc] border border-[#e5edf5] rounded px-1.5 py-0.5 font-mono">ESC</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
            {Object.entries(grouped).length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-[24px] mb-2 opacity-20">🔍</div>
                <div className="text-[13px] text-[#64748d]">No results for &ldquo;{query}&rdquo;</div>
              </div>
            ) : (
              Object.entries(grouped).map(([section, items]) => (
                <div key={section}>
                  <div className="px-4 py-1.5 text-[10px] font-medium text-[#94a3b8] uppercase tracking-[0.1em]">{section}</div>
                  {items.map(item => {
                    const idx = flatIndex++;
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        data-index={idx}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${isSelected ? "bg-[#f6f9fc]" : ""}`}
                      >
                        <span className="text-[16px] w-6 text-center">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[13px] ${isSelected ? "font-medium text-[#061b31]" : "text-[#273951]"}`}>{item.label}</div>
                          {item.description && <div className="text-[11px] text-[#94a3b8] truncate">{item.description}</div>}
                        </div>
                        {item.shortcut && (
                          <kbd className="text-[10px] text-[#94a3b8] bg-[#f6f9fc] border border-[#e5edf5] rounded px-1.5 py-0.5 font-mono">{item.shortcut}</kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[#e5edf5] bg-[#f6f9fc] flex items-center gap-4 text-[10px] text-[#94a3b8]">
            <span className="flex items-center gap-1"><kbd className="bg-white border border-[#e5edf5] rounded px-1">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-white border border-[#e5edf5] rounded px-1">↵</kbd> select</span>
            <span className="flex items-center gap-1"><kbd className="bg-white border border-[#e5edf5] rounded px-1">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}