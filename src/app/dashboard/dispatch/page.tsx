"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/*
 * Dispatch Console — single unified dashboard
 * Clean layout: stats bar, main content (calls + pipeline), sidebar (drivers + actions)
 * Design tokens: #533afd accent, #f6f9fc bg, #e5edf5 border, #061b31 text, #64748d body
 */

interface Driver {
  id: string; firstName: string; lastName: string;
  role: string; isActive: boolean; phone?: string; email?: string;
}

interface ActiveCall {
  id: string; callerPhone: string; callerName?: string;
  status: string; startedAt: string; duration: number;
  transcript?: string; summary?: string; callType?: string;
  serviceNeeded?: string; pickupAddress?: string; vehicleInfo?: string; urgency?: string;
}

interface Job {
  id: string; status: string; customerName?: string; customerPhone?: string;
  pickupAddress: string; destinationAddress?: string;
  totalAmount?: number; assignedDriverId?: string;
  source: string; createdAt: string;
  towVehicleMake?: string; towVehicleModel?: string; towVehicleYear?: number;
}

const COLUMNS = [
  { id: "pending", label: "New", color: "#f59e0b" },
  { id: "assigned", label: "Assigned", color: "#3b82f6" },
  { id: "en_route", label: "En Route", color: "#6366f1" },
  { id: "on_scene", label: "On Scene", color: "#a855f7" },
  { id: "towing", label: "Towing", color: "#f97316" },
  { id: "completed", label: "Done", color: "#15be53" },
];

const fmt = (s: number) => { const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; };
const copy = (text: string) => navigator.clipboard.writeText(text);

export default function DispatchConsolePage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, c, j] = await Promise.all([
          fetch("/api/drivers").then(r => r.json()),
          fetch("/api/calls?active=true").then(r => r.json()),
          fetch("/api/jobs").then(r => r.json()),
        ]);
        setDrivers(d.users || d.drivers || []);
        setCalls(c.calls || []);
        setJobs(j.jobs || []);
      } catch (e) { console.error(e); }
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const online = drivers.filter(d => d.isActive);
  const activeCalls = calls.filter(c => c.status === "ringing" || c.status === "in_progress");
  const activeJobs = jobs.filter(j => !["completed", "cancelled"].includes(j.status));
  const todayRevenue = jobs.filter(j => j.status === "completed" && new Date(j.createdAt).toDateString() === new Date().toDateString()).reduce((s, j) => s + (j.totalAmount || 0), 0);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "ACTIVE JOBS", value: activeJobs.length, color: "#3b82f6" },
          { label: "LIVE CALLS", value: activeCalls.length, color: activeCalls.length > 0 ? "#15be53" : "#94a3b8" },
          { label: "DRIVERS ONLINE", value: `${online.length}/${drivers.length}`, color: "#15be53" },
          { label: "TODAY REVENUE", value: `$${todayRevenue.toLocaleString()}`, color: "#533afd" },
          { label: "TOTAL JOBS", value: jobs.length, color: "#64748d" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#e5edf5] rounded-lg p-3">
            <div className="text-[10px] text-[#64748d] uppercase tracking-wider">{s.label}</div>
            <div className="text-[24px] font-light tracking-[-0.5px] mt-0.5" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* Left: Calls + Pipeline */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Live Calls */}
          <div className="bg-white border border-[#e5edf5] rounded-lg flex flex-col" style={{ minHeight: activeCalls.length > 0 ? 180 : 80 }}>
            <div className="px-4 py-2.5 border-b border-[#e5edf5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold">📞 Live Calls</span>
                {activeCalls.length > 0 && <span className="w-2 h-2 bg-[#15be53] rounded-full animate-pulse" />}
              </div>
              <Link href="/dashboard/live-calls" className="text-[11px] text-[#533afd] hover:underline">View All →</Link>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {activeCalls.length === 0 ? (
                <div className="text-center py-4 text-[12px] text-[#94a3b8]">No active calls — incoming calls appear here in real-time</div>
              ) : (
                <div className="space-y-2">
                  {activeCalls.map(call => (
                    <div key={call.id} className="flex items-center gap-3 p-3 bg-[#dcfce7] border border-[#bbf7d0] rounded-lg">
                      <span className="w-2.5 h-2.5 bg-[#15be53] rounded-full animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium">{call.callerName || call.callerPhone}</div>
                        <div className="text-[11px] text-[#64748d]">{call.callerPhone} • {fmt(call.duration)}</div>
                      </div>
                      {call.urgency && <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${call.urgency === "emergency" ? "bg-[#fef2f2] text-[#991b1b]" : "bg-[#fef3c7] text-[#92400e]"}`}>{call.urgency}</span>}
                      <button onClick={() => copy(`Call: ${call.callerName || call.callerPhone}\n${call.callerPhone}`)} className="text-[10px] px-2 py-1 bg-white border border-[#e5edf5] rounded hover:bg-[#f6f9fc] text-[#533afd]">📋</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Job Pipeline */}
          <div className="flex-1 min-h-0 bg-white border border-[#e5edf5] rounded-lg flex flex-col">
            <div className="px-4 py-2.5 border-b border-[#e5edf5] flex items-center justify-between">
              <span className="text-[14px] font-semibold">📋 Job Pipeline</span>
              <Link href="/dashboard/kanban" className="text-[11px] text-[#533afd] hover:underline">Full Board →</Link>
            </div>
            <div className="flex-1 min-h-0 overflow-x-auto p-3">
              <div className="flex gap-2 h-full min-h-[200px]">
                {COLUMNS.map(col => {
                  const colJobs = jobs.filter(j => j.status === col.id);
                  return (
                    <div key={col.id} className="flex-1 min-w-[150px]">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                        <span className="text-[11px] font-medium text-[#64748d]">{col.label}</span>
                        <span className="text-[10px] bg-[#f3f4f6] px-1.5 py-0.5 rounded text-[#64748d]">{colJobs.length}</span>
                      </div>
                      <div className="space-y-1.5 bg-[#f6f9fc] rounded-lg p-1.5 min-h-[150px] max-h-[calc(100%-32px)] overflow-y-auto">
                        {colJobs.map(job => (
                          <div
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className={`bg-white border rounded p-2 cursor-pointer transition-all hover:shadow-sm ${selectedJob?.id === job.id ? "border-[#533afd] shadow-sm" : "border-[#e5edf5]"}`}
                          >
                            <div className="text-[11px] font-medium truncate">{job.customerName || "Walk-in"}</div>
                            <div className="text-[10px] text-[#64748d] truncate">{job.pickupAddress}</div>
                            {job.totalAmount && <div className="text-[10px] font-semibold mt-0.5" style={{ color: col.color }}>${job.totalAmount.toFixed(0)}</div>}
                          </div>
                        ))}
                        {colJobs.length === 0 && <div className="text-center py-6 text-[10px] text-[#94a3b8]">—</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[280px] shrink-0 flex flex-col gap-4">
          {/* Selected Job Detail */}
          {selectedJob && (
            <div className="bg-white border border-[#e5edf5] rounded-lg">
              <div className="px-4 py-2.5 border-b border-[#e5edf5] flex items-center justify-between">
                <span className="text-[13px] font-semibold">Job Detail</span>
                <button onClick={() => setSelectedJob(null)} className="text-[14px] text-[#94a3b8] hover:text-[#061b31]">×</button>
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Customer</div>
                  <div className="text-[13px] font-medium">{selectedJob.customerName || "—"}</div>
                  {selectedJob.customerPhone && <div className="text-[11px] text-[#533afd]">{selectedJob.customerPhone}</div>}
                </div>
                <div>
                  <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Pickup</div>
                  <div className="text-[12px]">{selectedJob.pickupAddress}</div>
                </div>
                {selectedJob.destinationAddress && (
                  <div>
                    <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Destination</div>
                    <div className="text-[12px]">{selectedJob.destinationAddress}</div>
                  </div>
                )}
                {(selectedJob.towVehicleMake || selectedJob.towVehicleModel) && (
                  <div>
                    <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Vehicle</div>
                    <div className="text-[12px]">{selectedJob.towVehicleYear} {selectedJob.towVehicleMake} {selectedJob.towVehicleModel}</div>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => copy(`Job: ${selectedJob.id}\nCustomer: ${selectedJob.customerName}\nPickup: ${selectedJob.pickupAddress}\nAmount: $${selectedJob.totalAmount || 0}`)} className="flex-1 text-[11px] py-1.5 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd]">📋 Copy</button>
                  <Link href={`/dashboard/jobs?id=${selectedJob.id}`} className="flex-1 text-[11px] py-1.5 bg-[#533afd] text-white rounded text-center hover:bg-[#4434d4]">Open →</Link>
                </div>
              </div>
            </div>
          )}

          {/* Drivers */}
          <div className="bg-white border border-[#e5edf5] rounded-lg flex-1 min-h-0 flex flex-col">
            <div className="px-4 py-2.5 border-b border-[#e5edf5] flex items-center justify-between">
              <span className="text-[13px] font-semibold">👥 Drivers</span>
              <span className="text-[10px] text-[#15be53] font-medium">{online.length} online</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              {drivers.map(d => (
                <div key={d.id} className="flex items-center gap-2 p-2 rounded hover:bg-[#f6f9fc] transition-colors">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${d.isActive ? "bg-[#15be53]" : "bg-[#d1d5db]"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate">{d.firstName} {d.lastName}</div>
                    <div className="text-[10px] text-[#64748d] truncate">{d.phone || d.email || "—"}</div>
                  </div>
                  <button onClick={() => copy(`${d.firstName} ${d.lastName}\n${d.phone || d.email || ""}`)} className="text-[9px] px-1.5 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded text-[#533afd]">📋</button>
                </div>
              ))}
              {drivers.length === 0 && <div className="text-center py-4 text-[11px] text-[#94a3b8]">No drivers yet</div>}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-3">
            <div className="text-[11px] font-semibold text-[#64748d] uppercase tracking-wider mb-2">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/dashboard/jobs?new=1", icon: "➕", label: "New Job" },
                { href: "/dashboard/live-calls", icon: "📞", label: "Live Calls" },
                { href: "/dashboard/fleet", icon: "🚛", label: "Fleet" },
                { href: "/dashboard/reports", icon: "📊", label: "Reports" },
              ].map(a => (
                <Link key={a.href} href={a.href} className="flex items-center gap-2 p-2 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:border-[#b9b9f9] hover:bg-white transition-colors">
                  <span className="text-[14px]">{a.icon}</span>
                  <span className="text-[11px] font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}