"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/*
 * Dispatch Console — 2-screen layout for dispatchers
 * Screen 1: Operations (Map + Drivers)
 * Screen 2: Command Center (Live Calls + Pipeline)
 *
 * Each panel can be "popped out" into a separate browser window
 */

const PRIMARY = "#533afd";

export default function DispatchConsolePage() {
  return (
    <div className="h-[calc(100vh-120px)]" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">🎛️ Dispatch Console</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Multi-screen dispatch setup — open panels in separate windows for dual monitors</p>
        </div>
      </div>

      {/* Screen Layout Cards */}
      <div className="grid grid-cols-2 gap-6 h-[calc(100%-80px)]">
        {/* Screen 1: Operations */}
        <div className="flex flex-col gap-4">
          <div className="text-[13px] font-semibold text-[#533afd] uppercase tracking-wider">📍 Screen 1 — Operations</div>

          {/* Map Panel */}
          <div className="flex-1 bg-white border border-[#e5edf5] rounded-lg overflow-hidden relative group">
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <a
                href="/dashboard/map"
                target="_blank"
                className="px-3 py-1.5 bg-[#533afd] text-white rounded text-[11px] font-medium hover:bg-[#4434d4] transition-colors shadow-lg flex items-center gap-1"
              >
                ⤢ Open in New Window
              </a>
            </div>
            <div className="p-4 border-b border-[#e5edf5] bg-[#f6f9fc]">
              <div className="text-[14px] font-semibold">🗺️ Live Map</div>
              <div className="text-[11px] text-[#64748d]">GPS tracking, driver locations, job pins</div>
            </div>
            <div className="flex-1 flex items-center justify-center p-8 min-h-[300px]">
              <div className="text-center">
                <div className="text-[48px] mb-4 opacity-20">🗺️</div>
                <div className="text-[14px] text-[#64748d] mb-3">Map view with real-time driver tracking</div>
                <a
                  href="/dashboard/map"
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#533afd] text-white rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors"
                >
                  ⤢ Open Map in New Window
                </a>
                <div className="text-[11px] text-[#94a3b8] mt-2">Drag this window to your second monitor</div>
              </div>
            </div>
          </div>

          {/* Drivers Panel */}
          <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold">👥 Drivers Status</div>
                <div className="text-[11px] text-[#64748d]">Who's online, busy, or offline</div>
              </div>
              <a
                href="/dashboard/drivers"
                target="_blank"
                className="px-3 py-1.5 bg-[#533afd] text-white rounded text-[11px] font-medium hover:bg-[#4434d4] transition-colors"
              >
                ⤢ Pop Out
              </a>
            </div>
            <DriverStatusWidget />
          </div>
        </div>

        {/* Screen 2: Command Center */}
        <div className="flex flex-col gap-4">
          <div className="text-[13px] font-semibold text-[#ea2261] uppercase tracking-wider">📞 Screen 2 — Command Center</div>

          {/* Live Calls Panel */}
          <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden flex-1">
            <div className="p-4 border-b border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold">📞 Live Calls</div>
                <div className="text-[11px] text-[#64748d]">Real-time call monitoring with transcript</div>
              </div>
              <a
                href="/dashboard/live-calls"
                target="_blank"
                className="px-3 py-1.5 bg-[#ea2261] text-white rounded text-[11px] font-medium hover:bg-[#d41e5a] transition-colors flex items-center gap-1"
              >
                ⤢ Open in New Window
              </a>
            </div>
            <LiveCallsWidget />
          </div>

          {/* Pipeline Panel */}
          <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden flex-1">
            <div className="p-4 border-b border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
              <div>
                <div className="text-[14px] font-semibold">📋 Job Pipeline</div>
                <div className="text-[11px] text-[#64748d]">Kanban board — drag jobs between statuses</div>
              </div>
              <a
                href="/dashboard/kanban"
                target="_blank"
                className="px-3 py-1.5 bg-[#533afd] text-white rounded text-[11px] font-medium hover:bg-[#4434d4] transition-colors flex items-center gap-1"
              >
                ⤢ Open in New Window
              </a>
            </div>
            <PipelineWidget />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Inline Widgets ────────────────────────────────── */

function DriverStatusWidget() {
  const [drivers, setDrivers] = useState<Array<{ id: string; firstName: string; lastName: string; role: string; isActive: boolean }>>([]);

  useEffect(() => {
    fetch("/api/drivers").then(r => r.json()).then(d => setDrivers(d.drivers || d || []));
  }, []);

  const online = drivers.filter(d => d.isActive);
  const offline = drivers.filter(d => !d.isActive);

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="bg-[#dcfce7] rounded-lg p-3 text-center">
          <div className="text-[20px] font-semibold text-[#166534]">{online.length}</div>
          <div className="text-[11px] text-[#166534]">Online</div>
        </div>
        <div className="bg-[#f3f4f6] rounded-lg p-3 text-center">
          <div className="text-[20px] font-semibold text-[#4b5563]">{offline.length}</div>
          <div className="text-[11px] text-[#4b5563]">Offline</div>
        </div>
      </div>
      <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
        {drivers.slice(0, 6).map(d => (
          <div key={d.id} className="flex items-center gap-2 text-[12px]">
            <span className={`w-2 h-2 rounded-full ${d.isActive ? "bg-[#15be53]" : "bg-[#d1d5db]"}`} />
            <span className="font-medium">{d.firstName} {d.lastName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveCallsWidget() {
  const [calls, setCalls] = useState<Array<{ id: string; callerPhone: string; callerName?: string; status: string; duration: number }>>([]);

  useEffect(() => {
    const load = () => fetch("/api/calls?active=true").then(r => r.json()).then(d => setCalls(d.calls || [])).catch(() => {});
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  if (calls.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-[32px] mb-3 opacity-20">📞</div>
        <div className="text-[13px] text-[#64748d]">No active calls</div>
        <div className="text-[11px] text-[#94a3b8] mt-1">Incoming calls will appear here in real-time</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {calls.map(call => (
        <div key={call.id} className="flex items-center gap-3 p-3 bg-[#dcfce7] border border-[#bbf7d0] rounded-lg">
          <span className="w-2.5 h-2.5 bg-[#15be53] rounded-full animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{call.callerName || call.callerPhone}</div>
            <div className="text-[11px] text-[#64748d]">{call.callerPhone}</div>
          </div>
          <div className="text-[12px] font-mono text-[#166534]">
            {Math.floor(call.duration / 60)}:{String(call.duration % 60).padStart(2, "0")}
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelineWidget() {
  const [jobs, setJobs] = useState<Array<{ id: string; status: string; customerName?: string; pickupAddress: string }>>([]);

  useEffect(() => {
    fetch("/api/jobs").then(r => r.json()).then(d => setJobs(d.jobs || [])).catch(() => {});
  }, []);

  const columns = [
    { id: "pending", label: "New", color: "#f59e0b", bg: "#fef3c7" },
    { id: "assigned", label: "Assigned", color: "#3b82f6", bg: "#dbeafe" },
    { id: "en_route", label: "En Route", color: "#6366f1", bg: "#e0e7ff" },
    { id: "on_scene", label: "On Scene", color: "#a855f7", bg: "#f3e8ff" },
    { id: "completed", label: "Done", color: "#15be53", bg: "#dcfce7" },
  ];

  return (
    <div className="p-3 flex gap-2 overflow-x-auto">
      {columns.map(col => {
        const colJobs = jobs.filter(j => j.status === col.id);
        return (
          <div key={col.id} className="flex-1 min-w-[100px]">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
              <span className="text-[11px] font-medium text-[#64748d]">{col.label}</span>
              <span className="text-[10px] bg-[#f3f4f6] px-1.5 py-0.5 rounded text-[#64748d]">{colJobs.length}</span>
            </div>
            <div className="space-y-1.5">
              {colJobs.slice(0, 3).map(job => (
                <div key={job.id} className="bg-[#f6f9fc] border border-[#e5edf5] rounded p-2">
                  <div className="text-[11px] font-medium truncate">{job.customerName || "Unknown"}</div>
                  <div className="text-[10px] text-[#64748d] truncate">{job.pickupAddress}</div>
                </div>
              ))}
              {colJobs.length > 3 && (
                <div className="text-[10px] text-[#94a3b8] text-center">+{colJobs.length - 3} more</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}