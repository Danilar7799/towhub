"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/*
 * Dispatch Console — 2-screen layout for dispatchers
 * Screen 1: Operations (Map + Drivers)
 * Screen 2: Command Center (Live Calls + Pipeline)
 *
 * Each panel can be "popped out" into a separate browser window
 * for dual-monitor setup
 */

const PRIMARY = "#533afd";
const SECONDARY = "#ea2261";

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  phone?: string;
  email?: string;
}

interface ActiveCall {
  id: string;
  callerPhone: string;
  callerName?: string;
  status: "ringing" | "in_progress" | "completed" | "missed";
  startedAt: string;
  duration: number;
  transcript: Array<{ speaker: "ai" | "caller"; text: string; timestamp: string }>;
  summary?: string;
  callType?: string;
  serviceNeeded?: string;
  pickupAddress?: string;
  vehicleInfo?: string;
  urgency?: string;
}

interface Job {
  id: string;
  status: string;
  customerName?: string;
  pickupAddress: string;
  destinationAddress?: string;
  totalAmount?: number;
  assignedDriverId?: string;
  source: string;
  createdAt: string;
  towVehicleMake?: string;
  towVehicleModel?: string;
  towVehicleYear?: number;
}

const COLUMNS = [
  { id: "pending", label: "New", color: "#f59e0b", bg: "#fef3c7" },
  { id: "assigned", label: "Assigned", color: "#3b82f6", bg: "#dbeafe" },
  { id: "en_route", label: "En Route", color: "#6366f1", bg: "#e0e7ff" },
  { id: "on_scene", label: "On Scene", color: "#a855f7", bg: "#f3e8ff" },
  { id: "completed", label: "Done", color: "#15be53", bg: "#dcfce7" },
];

export default function DispatchConsolePage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<"screen1" | "screen2" | null>(null);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const [driversRes, callsRes, jobsRes] = await Promise.all([
          fetch("/api/drivers"),
          fetch("/api/calls?active=true"),
          fetch("/api/jobs"),
        ]);
        const driversData = await driversRes.json();
        const callsData = await callsRes.json();
        const jobsData = await jobsRes.json();
        setDrivers(driversData.users || driversData.drivers || []);
        setCalls(callsData.calls || []);
        setJobs(jobsData.jobs || []);
      } catch (e) {
        console.error("Failed to load dispatch data:", e);
      }
    };

    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll for live calls more frequently
  useEffect(() => {
    const loadCalls = async () => {
      try {
        const res = await fetch("/api/calls?active=true");
        const data = await res.json();
        setCalls(data.calls || []);
      } catch (e) {}
    };
    loadCalls();
    const interval = setInterval(loadCalls, 3000);
    return () => clearInterval(interval);
  }, []);

  const online = drivers.filter(d => d.isActive);
  const offline = drivers.filter(d => !d.isActive);
  const activeCalls = calls.filter(c => c.status === "ringing" || c.status === "in_progress");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Visual feedback would be handled by individual buttons
      console.log(`Copied ${label}`);
    });
  };

  const openPopOut = (url: string, title: string, width = 1000, height = 700) => {
    const features = `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes`;
    const win = window.open(url, `_blank_${title.replace(/\s+/g, "_")}`, features);
    if (win) {
      win.focus();
    }
    return win;
  };

  const openScreen1Full = () => openPopOut("/dashboard/map?fullscreen=1&source=dispatch", "Screen 1 - Operations", 1400, 900);
  const openScreen2Full = () => openPopOut("/dashboard/live-calls?fullscreen=1&source=dispatch", "Screen 2 - Command Center", 1200, 900);

  const copyDriverInfo = (d: Driver) => {
    const info = `Driver: ${d.firstName} ${d.lastName}\nRole: ${d.role}\nStatus: ${d.isActive ? "Active" : "Inactive"}\nEmail: ${d.email || "N/A"}\nPhone: ${d.phone || "N/A"}\nID: ${d.id}`;
    copyToClipboard(info, "Driver info");
  };

  const copyCallInfo = (call: ActiveCall) => {
    const info = `Call: ${call.id}\nCaller: ${call.callerName || call.callerPhone}\nPhone: ${call.callerPhone}\nStatus: ${call.status}\nDuration: ${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, "0")}\nType: ${call.callType || "N/A"}\nService: ${call.serviceNeeded || "N/A"}\nLocation: ${call.pickupAddress || "N/A"}\nVehicle: ${call.vehicleInfo || "N/A"}\nUrgency: ${call.urgency || "N/A"}\nStarted: ${new Date(call.startedAt).toLocaleString()}`;
    copyToClipboard(info, "Call info");
  };

  const copyJobInfo = (job: Job) => {
    const info = `Job: ${job.id}\nCustomer: ${job.customerName || "Walk-in"}\nStatus: ${job.status.replace("_", " ")}\nSource: ${job.source}\nPickup: ${job.pickupAddress}\nDestination: ${job.destinationAddress || "N/A"}\nVehicle: ${job.towVehicleYear ? job.towVehicleYear + " " : ""}${job.towVehicleMake || ""} ${job.towVehicleModel || ""}\nAmount: $${job.totalAmount?.toFixed(2) || "N/A"}\nCreated: ${new Date(job.createdAt).toLocaleString()}`;
    copyToClipboard(info, "Job info");
  };

  // Check if opened in fullscreen mode from popout
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("fullscreen") === "1") {
        setIsFullscreen(true);
      }
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ringing": return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
      case "in_progress": return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
      case "completed": return { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" };
      case "missed": return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
      default: return { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" };
    }
  };

  // Fullscreen mode - show only the selected screen content
  if (isFullscreen) {
    const urlParams = new URLSearchParams(window.location.search);
    const screen = urlParams.get("screen") || "screen1";

    if (screen === "screen1") {
      return (
        <div className="h-screen w-screen" style={{ fontFeatureSettings: "'ss01'" }}>
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between p-3 bg-white/95 backdrop-blur border border-[#e5edf5] rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-[#15be53] rounded-full animate-pulse" />
              <span className="text-[14px] font-semibold text-[#061b31]">📍 Screen 1 — Operations (Fullscreen)</span>
              <span className="text-[11px] text-[#64748d]">Drag this window to your second monitor</span>
            </div>
            <a href="/dashboard/dispatch" className="px-3 py-1.5 bg-[#533afd] text-white rounded text-[11px] font-medium hover:bg-[#4434d4]">← Back to Console</a>
          </div>
          <iframe
            src="/dashboard/map?fullscreen=1&embed=1"
            className="w-full h-full border-0"
            title="Live Map"
          />
        </div>
      );
    } else {
      return (
        <div className="h-screen w-screen" style={{ fontFeatureSettings: "'ss01'" }}>
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between p-3 bg-white/95 backdrop-blur border border-[#e5edf5] rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-[#ea2261] rounded-full animate-pulse" />
              <span className="text-[14px] font-semibold text-[#061b31]">📞 Screen 2 — Command Center (Fullscreen)</span>
              <span className="text-[11px] text-[#64748d]">Drag this window to your second monitor</span>
            </div>
            <a href="/dashboard/dispatch" className="px-3 py-1.5 bg-[#ea2261] text-white rounded text-[11px] font-medium hover:bg-[#d41e5a]">← Back to Console</a>
          </div>
          <iframe
            src="/dashboard/live-calls?fullscreen=1&embed=1"
            className="w-full h-full border-0"
            title="Live Calls"
          />
        </div>
      );
    }
  }

  return (
    <div className="h-[calc(100vh-120px)]" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">🎛️ Dispatch Console</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">
            Dual-monitor dispatch setup — <span className="font-medium text-[#533afd]">Screen 1</span> (Map + Drivers) + <span className="font-medium text-[#ea2261]">Screen 2</span> (Live Calls + Pipeline)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-4 text-[12px] text-[#64748d] p-3 bg-[#f6f9fc] rounded-lg border border-[#e5edf5]">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-[#dcfce7] text-[#166534] rounded text-[11px] font-medium">
              <span className="w-1.5 h-1.5 bg-[#15be53] rounded-full" /> {online.length} Online
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-[#fef3c7] text-[#92400e] rounded text-[11px] font-medium">
              <span className="w-1.5 h-1.5 bg-[#eab308] rounded-full" /> {activeCalls.length} Live
            </span>
            <span className="flex items-center gap-1.5 px-2 py-1 bg-[#dbeafe] text-[#1e40af] rounded text-[11px] font-medium">
              <span className="w-1.5 h-1.5 bg-[#3b82f6] rounded-full" /> {jobs.filter(j => j.status !== "completed" && j.status !== "cancelled").length} Active Jobs
            </span>
          </div>
        </div>
      </div>

      {/* Dual Screen Layout */}
      <div className="grid grid-cols-2 gap-6 h-[calc(100%-80px)]">
        {/* ========== SCREEN 1: OPERATIONS ========== */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-[#533afd] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#533afd] rounded" />
              📍 Screen 1 — Operations
            </div>
            <button
              onClick={openScreen1Full}
              className="px-3 py-1.5 bg-[#533afd] text-white rounded text-[11px] font-medium hover:bg-[#4434d4] transition-colors flex items-center gap-1"
              title="Open in new window for second monitor"
            >
              ⤢ Pop Out
            </button>
          </div>

          {/* Map Panel */}
          <div className="flex-1 bg-white border border-[#e5edf5] rounded-lg overflow-hidden relative group min-h-[350px]">
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <button
                onClick={openScreen1Full}
                className="px-2.5 py-1.5 bg-[#533afd] text-white rounded text-[10px] font-medium hover:bg-[#4434d4] transition-colors shadow-lg flex items-center gap-1"
              >
                ⤢ Fullscreen
              </button>
            </div>
            <div className="p-3 border-b border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold">🗺️ Live Map</span>
                <span className="text-[11px] text-[#64748d]">GPS tracking, driver locations, job pins</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-[#dcfce7] text-[#166534] rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#15be53] rounded-full animate-pulse" /> Live
              </span>
            </div>
            <div className="flex-1 min-h-[350px]">
              <iframe
                src="/dashboard/map?embed=1"
                className="w-full h-full border-0"
                title="Live Dispatch Map"
              />
            </div>
          </div>

          {/* Drivers Panel */}
          <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
            <div className="p-3 border-b border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[14px] font-semibold">👥 Drivers Status</div>
                <div className="text-[11px] text-[#64748d]">{online.length} online • {drivers.length} total</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open("/dashboard/drivers", "_blank")}
                  className="px-2.5 py-1.5 bg-white border border-[#e5edf5] rounded text-[10px] font-medium hover:bg-[#f6f9fc] transition-colors"
                >
                  View All
                </button>
                <button
                  onClick={openScreen1Full}
                  className="px-2.5 py-1.5 bg-[#533afd] text-white rounded text-[10px] font-medium hover:bg-[#4434d4] transition-colors"
                >
                  ⤢ Pop Out
                </button>
              </div>
            </div>
            <DriverStatusWidget drivers={drivers} onCopy={copyDriverInfo} />
          </div>
        </div>

        {/* ========== SCREEN 2: COMMAND CENTER ========== */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-[13px] font-semibold text-[#ea2261] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#ea2261] rounded" />
              📞 Screen 2 — Command Center
            </div>
            <button
              onClick={openScreen2Full}
              className="px-3 py-1.5 bg-[#ea2261] text-white rounded text-[11px] font-medium hover:bg-[#d41e5a] transition-colors flex items-center gap-1"
              title="Open in new window for second monitor"
            >
              ⤢ Pop Out
            </button>
          </div>

          {/* Live Calls Panel */}
          <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden flex-1 min-h-0">
            <div className="p-3 border-b border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[14px] font-semibold">📞 Live Calls</div>
                <div className="text-[11px] text-[#64748d]">Real-time monitoring with transcript</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${activeCalls.length > 0 ? "bg-[#dcfce7] text-[#166534]" : "bg-[#f3f4f6] text-[#4b5563]"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeCalls.length > 0 ? "bg-[#15be53] animate-pulse" : "bg-[#94a3b8]"}`} />
                  {activeCalls.length > 0 ? `${activeCalls.length} Live` : "No Active Calls"}
                </span>
                <button
                  onClick={openScreen2Full}
                  className="px-2.5 py-1.5 bg-[#ea2261] text-white rounded text-[10px] font-medium hover:bg-[#d41e5a] transition-colors"
                >
                  ⤢ Pop Out
                </button>
              </div>
            </div>
            <LiveCallsWidget calls={calls} onCopy={copyCallInfo} />
          </div>

          {/* Pipeline Panel */}
          <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden flex-1 min-h-0">
            <div className="p-3 border-b border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[14px] font-semibold">📋 Job Pipeline</div>
                <div className="text-[11px] text-[#64748d]">Kanban — drag to update status</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open("/dashboard/kanban", "_blank")}
                  className="px-2.5 py-1.5 bg-white border border-[#e5edf5] rounded text-[10px] font-medium hover:bg-[#f6f9fc] transition-colors"
                >
                  Full Board
                </button>
                <button
                  onClick={openScreen2Full}
                  className="px-2.5 py-1.5 bg-[#533afd] text-white rounded text-[10px] font-medium hover:bg-[#4434d4] transition-colors"
                >
                  ⤢ Pop Out
                </button>
              </div>
            </div>
            <PipelineWidget jobs={jobs} onCopy={copyJobInfo} />
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={openScreen1Full} className="px-4 py-2 bg-[#533afd] text-white rounded-lg text-[13px] font-medium hover:bg-[#4434d4] transition-colors flex items-center gap-2 shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
          📍 Open Screen 1 (Map) on Monitor 2
        </button>
        <button onClick={openScreen2Full} className="px-4 py-2 bg-[#ea2261] text-white rounded-lg text-[13px] font-medium hover:bg-[#d41e5a] transition-colors flex items-center gap-2 shadow-[0_2px_8px_rgba(234,34,97,0.2)]">
          📞 Open Screen 2 (Calls) on Monitor 2
        </button>
        <button onClick={() => { openScreen1Full(); setTimeout(() => openScreen2Full(), 300); }} className="px-4 py-2 bg-[#061b31] text-white rounded-lg text-[13px] font-medium hover:bg-[#0a2540] transition-colors flex items-center gap-2">
          ⛶ Open Both Screens
        </button>
      </div>
    </div>
  );
}

/* ── Inline Widgets ────────────────────────────────── */

function DriverStatusWidget({ drivers, onCopy }: { drivers: Driver[]; onCopy: (d: Driver) => void }) {
  const online = drivers.filter(d => d.isActive);
  const offline = drivers.filter(d => !d.isActive);

  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-[#dcfce7] rounded-lg p-3 text-center">
          <div className="text-[22px] font-semibold text-[#166534]">{online.length}</div>
          <div className="text-[11px] text-[#166534]">Online</div>
        </div>
        <div className="bg-[#f3f4f6] rounded-lg p-3 text-center">
          <div className="text-[22px] font-semibold text-[#4b5563]">{offline.length}</div>
          <div className="text-[11px] text-[#4b5563]">Offline</div>
        </div>
      </div>
      <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
        {drivers.slice(0, 8).map(d => (
          <div key={d.id} className="flex items-center gap-2 p-2 rounded hover:bg-[#f6f9fc] border border-transparent hover:border-[#e5edf5] transition-colors">
            <span className={`w-2.5 h-2.5 rounded-full ${d.isActive ? "bg-[#15be53]" : "bg-[#d1d5db]"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium truncate">{d.firstName} {d.lastName}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium uppercase ${
                  d.role === "driver" ? "bg-[#fef3c7] text-[#92400e]" :
                  d.role === "dispatcher" ? "bg-[#dcfce7] text-[#166534]" :
                  "bg-[#f3e8ff] text-[#6b21a8]"
                }`}>
                  {d.role}
                </span>
              </div>
              <div className="text-[10px] text-[#64748d] truncate">{d.email || d.phone || "No contact info"}</div>
            </div>
            <button
              onClick={() => onCopy(d)}
              className="text-[9px] px-2 py-1 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd] transition-colors whitespace-nowrap"
              title="Copy driver info"
            >
              📋 Copy
            </button>
          </div>
        ))}
        {drivers.length === 0 && (
          <div className="text-center py-4 text-[12px] text-[#94a3b8]">No drivers added yet</div>
        )}
      </div>
    </div>
  );
}

function LiveCallsWidget({ calls, onCopy }: { calls: ActiveCall[]; onCopy: (c: ActiveCall) => void }) {
  const activeCalls = calls.filter(c => c.status === "ringing" || c.status === "in_progress");
  const recentCalls = calls.filter(c => c.status === "completed" || c.status === "missed").slice(0, 5);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ringing": return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
      case "in_progress": return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
      case "completed": return { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" };
      case "missed": return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
      default: return { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" };
    }
  };

  if (activeCalls.length === 0 && recentCalls.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-[32px] mb-3 opacity-20">📞</div>
        <div className="text-[13px] text-[#64748d]">No calls yet</div>
        <div className="text-[11px] text-[#94a3b8] mt-1">Incoming calls will appear here in real-time</div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {/* Active Calls */}
      {activeCalls.map(call => {
        const s = statusColor(call.status);
        return (
          <div key={call.id} className={`flex items-center gap-3 p-3 rounded-lg border ${s.bg} ${s.border}`}>
            <span className="w-2.5 h-2.5 bg-[#15be53] rounded-full animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-[13px] font-medium truncate">{call.callerName || call.callerPhone}</div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>
                  {call.status === "ringing" ? "🔔 Ringing" : "🟢 Live"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#64748d]">
                <span>{call.callerPhone}</span>
                <span className="text-[#166534] font-mono">{formatDuration(call.duration)}</span>
                {call.urgency && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    call.urgency === "emergency" ? "bg-[#fef2f2] text-[#991b1b]" :
                    call.urgency === "high" ? "bg-[#fef3c7] text-[#92400e]" :
                    "bg-[#f3f4f6] text-[#4b5563]"
                  }`}>
                    {call.urgency}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onCopy(call)}
              className="text-[9px] px-2 py-1 bg-white/50 border border-white/30 rounded hover:bg-white text-[#ea2261] transition-colors whitespace-nowrap"
              title="Copy call info"
            >
              📋 Copy
            </button>
          </div>
        );
      })}

      {/* Recent Calls */}
      {recentCalls.length > 0 && (
        <div className="pt-2 border-t border-[#e5edf5]">
          <div className="text-[10px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Recent</div>
          <div className="space-y-1.5">
            {recentCalls.map(call => {
              const s = statusColor(call.status);
              return (
                <div key={call.id} className="p-2 bg-white border border-[#e5edf5] rounded hover:bg-[#f6f9fc] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.bg} ${s.text}`} />
                      <span className="text-[12px] font-medium truncate">{call.callerName || call.callerPhone}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${s.bg} ${s.text}`}>{call.status}</span>
                  </div>
                  <div className="text-[10px] text-[#64748d] flex items-center gap-2 mt-0.5">
                    <span>{call.callerPhone}</span>
                    <span className="font-mono">{formatDuration(call.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineWidget({ jobs, onCopy }: { jobs: Job[]; onCopy: (j: Job) => void }) {
  return (
    <div className="p-2 flex gap-2 overflow-x-auto min-h-[200px]">
      {COLUMNS.map(col => {
        const colJobs = jobs.filter(j => j.status === col.id);
        return (
          <div key={col.id} className="flex-1 min-w-[140px] max-w-[200px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-[11px] font-medium text-[#64748d]">{col.label}</span>
                <span className="text-[10px] bg-[#f3f4f6] px-1.5 py-0.5 rounded text-[#64748d]">{colJobs.length}</span>
              </div>
            </div>
            <div className="space-y-1.5 bg-[#f6f9fc] rounded-lg p-2 min-h-[160px]">
              {colJobs.slice(0, 5).map(job => (
                <div key={job.id} className="bg-white border border-[#e5edf5] rounded p-2 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => onCopy(job)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[11px] font-medium truncate">{job.customerName || "Walk-in"}</div>
                  </div>
                  {job.towVehicleMake && (
                    <div className="text-[9px] text-[#94a3b8] mb-1">{job.towVehicleYear} {job.towVehicleMake} {job.towVehicleModel}</div>
                  )}
                  <div className="text-[10px] text-[#64748d] truncate mb-1">{job.pickupAddress}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[#94a3b8]">{job.source}</span>
                    {job.totalAmount && <span className="text-[10px] font-semibold" style={{ color: col.color }}>${job.totalAmount.toFixed(0)}</span>}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCopy(job); }}
                    className="w-full mt-1 text-[8px] px-1.5 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd] transition-colors"
                    title="Copy job details"
                  >
                    📋 Copy Details
                  </button>
                </div>
              ))}
              {colJobs.length > 5 && (
                <div className="text-[9px] text-[#94a3b8] text-center pt-1">+{colJobs.length - 5} more</div>
              )}
              {colJobs.length === 0 && (
                <div className="text-center py-8 text-[11px] text-[#94a3b8]">Drop jobs here</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}