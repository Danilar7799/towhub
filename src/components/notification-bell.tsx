"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications } from "@/lib/notifications";

const TYPE_ICONS: Record<string, string> = {
  lead: "🔗",
  job: "📋",
  payment: "💰",
  system: "⚙️",
};

const TYPE_COLORS: Record<string, string> = {
  lead: "bg-[#dbeafe] text-[#1e40af]",
  job: "bg-[#dcfce7] text-[#166534]",
  payment: "bg-[#fef3c7] text-[#92400e]",
  system: "bg-[#f6f9fc] text-[#64748d]",
};

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fmtTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative text-[#64748d] hover:text-[#061b31] p-1.5 transition-colors" title="Notifications">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#ea2261] rounded-full flex items-center justify-center px-1">
            <span className="text-[9px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-white border border-[#e5edf5] rounded-lg shadow-[0_15px_35px_rgba(50,50,93,0.15)] z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#e5edf5] flex items-center justify-between">
            <div className="text-[14px] font-semibold text-[#061b31]">Notifications</div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-[#533afd] font-medium hover:underline">Mark all read</button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-[28px] mb-2 opacity-30">🔔</div>
                <div className="text-[13px] text-[#64748d]">No notifications yet</div>
                <div className="text-[11px] text-[#94a3b8]">New leads, jobs, and updates will appear here</div>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => (
                <div key={n.id}
                  onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; }}
                  className={`px-4 py-3 border-b border-[#e5edf5] cursor-pointer hover:bg-[#f6f9fc] transition-colors ${!n.read ? "bg-[#533afd]/[0.02]" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] shrink-0 ${TYPE_COLORS[n.type] || TYPE_COLORS.system}`}>
                      {TYPE_ICONS[n.type] || "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className={`text-[13px] ${!n.read ? "font-semibold text-[#061b31]" : "font-medium text-[#64748d]"}`}>{n.title}</div>
                        {!n.read && <div className="w-1.5 h-1.5 bg-[#533afd] rounded-full shrink-0" />}
                      </div>
                      <div className="text-[12px] text-[#64748d] truncate">{n.message}</div>
                      <div className="text-[10px] text-[#94a3b8] mt-0.5">{fmtTime(n.timestamp)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#e5edf5] text-center">
              <button onClick={() => { setOpen(false); }} className="text-[11px] text-[#533afd] font-medium hover:underline">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
