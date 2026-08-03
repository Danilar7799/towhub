"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DocumentUploader } from "@/components/ui";
import { CopyButton, ContextMenu, useContextMenu } from "@/components/micro-interactions";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/auth-context";

/*
 * Jobs Page — redesigned with:
 * - Rich cards with all key info visible
 * - Call markers/tags (AI failed, needs callback, urgent)
 * - Driver assignment (manual + auto nearest)
 * - Auto-dispatch mode toggle
 * - Call quality indicators
 * - Wait timer (time since job created → first action)
 * - Context menus (right-click)
 */

interface Job {
  id: string; status: string; source: string;
  customerName?: string; customerPhone?: string; customerEmail?: string;
  pickupAddress: string; pickupLat?: number; pickupLng?: number;
  destinationAddress?: string;
  towVehicleMake?: string; towVehicleModel?: string; towVehicleYear?: number; towVehicleColor?: string; towVehiclePlate?: string;
  estimatedMiles?: number; baseRate?: number; mileageRate?: number; totalAmount?: number;
  notes?: string; assignedDriverId?: string; assignedVehicleId?: string;
  isPaid: boolean; paymentMethod?: string;
  createdAt: string; assignedAt?: string; enRouteAt?: string; onSceneAt?: string; towingAt?: string; completedAt?: string;
  // Tags/markers
  tags?: string[]; // "ai_failed", "needs_callback", "urgent", "vip", "callback_requested"
}

interface Driver {
  id: string; firstName: string; lastName: string;
  phone?: string; isActive: boolean; assignedVehicleId?: string;
}

const TAG_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  ai_failed: { label: "AI Failed", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "🤖❌" },
  needs_callback: { label: "Needs Callback", color: "#f59e0b", bg: "#fef3c7", border: "#fde68a", icon: "📞🔔" },
  callback_requested: { label: "Callback Requested", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", icon: "👤📞" },
  urgent: { label: "Urgent", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "🔴" },
  vip: { label: "VIP", color: "#7c3aed", bg: "#f3e8ff", border: "#e9d5ff", icon: "⭐" },
  repeat: { label: "Repeat Customer", color: "#3b82f6", bg: "#dbeafe", border: "#bfdbfe", icon: "🔄" },
  high_value: { label: "High Value", color: "#15be53", bg: "#dcfce7", border: "#bbf7d0", icon: "💰" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "New", color: "#f59e0b", bg: "#fef3c7", border: "#fde68a" },
  assigned: { label: "Assigned", color: "#3b82f6", bg: "#dbeafe", border: "#bfdbfe" },
  en_route: { label: "En Route", color: "#6366f1", bg: "#e0e7ff", border: "#c7d2fe" },
  on_scene: { label: "On Scene", color: "#a855f7", bg: "#f3e8ff", border: "#e9d5ff" },
  towing: { label: "Towing", color: "#f97316", bg: "#ffedd5", border: "#fed7aa" },
  completed: { label: "Done", color: "#15be53", bg: "#dcfce7", border: "#bbf7d0" },
  cancelled: { label: "Cancelled", color: "#94a3b8", bg: "#f3f4f6", border: "#e5e7eb" },
};

const ALL_TAGS = ["ai_failed", "needs_callback", "callback_requested", "urgent", "vip", "repeat", "high_value"];

function WaitTimer({ createdAt, assignedAt }: { createdAt: string; assignedAt?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (assignedAt) return; // Already assigned, no need to tick
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt, assignedAt]);

  if (assignedAt) {
    const diff = Math.floor((new Date(assignedAt).getTime() - new Date(createdAt).getTime()) / 1000);
    return <span className="text-[10px] text-[#64748d]">⏱ {formatTime(diff)}</span>;
  }

  const color = elapsed > 600 ? "#dc2626" : elapsed > 300 ? "#f59e0b" : "#15be53";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium tabular-nums" style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
      {formatTime(elapsed)}
    </span>
  );
}

function formatTime(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

export default function JobsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState<string | null>(null); // job id
  const [showDriverAssign, setShowDriverAssign] = useState<string | null>(null); // job id
  const [autoDispatch, setAutoDispatch] = useState(false);
  const { menu: ctxMenu, openMenu, closeMenu } = useContextMenu();
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", customerEmail: "", pickupAddress: "", destinationAddress: "",
    towVehicleMake: "", towVehicleModel: "", towVehicleYear: "", towVehicleColor: "", towVehiclePlate: "",
    baseRate: "", mileageRate: "", estimatedMiles: "", notes: "",
  });

  const load = async () => {
    const [jobsRes, driversRes] = await Promise.all([
      fetch("/api/jobs"),
      fetch("/api/drivers"),
    ]);
    const jobsData = await jobsRes.json();
    const driversData = await driversRes.json();
    setJobs(jobsData.jobs || []);
    setDrivers(driversData.users || []);
  };

  useEffect(() => { load(); }, []);

  const addJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        towVehicleYear: form.towVehicleYear ? parseInt(form.towVehicleYear) : undefined,
        baseRate: form.baseRate ? parseFloat(form.baseRate) : undefined,
        mileageRate: form.mileageRate ? parseFloat(form.mileageRate) : undefined,
        estimatedMiles: form.estimatedMiles ? parseFloat(form.estimatedMiles) : undefined,
      }),
    });
    if (res.ok) {
      toast.success("Job created");
      setShowAdd(false);
      setForm({ customerName: "", customerPhone: "", customerEmail: "", pickupAddress: "", destinationAddress: "", towVehicleMake: "", towVehicleModel: "", towVehicleYear: "", towVehicleColor: "", towVehiclePlate: "", baseRate: "", mileageRate: "", estimatedMiles: "", notes: "" });
      load();
    }
  };

  const updateJob = async (id: string, data: Partial<Job>) => {
    await fetch("/api/jobs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
    load();
  };

  const assignDriver = async (jobId: string, driverId: string) => {
    await updateJob(jobId, { assignedDriverId: driverId, status: "assigned" });
    toast.success("Driver assigned");
    setShowDriverAssign(null);
  };

  const autoAssignNearest = async (jobId: string) => {
    // Call Retell API to find nearest driver
    const res = await fetch("/api/retell/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "outbound_call", phone_number: "", metadata: { job_id: jobId, type: "auto_dispatch" } }),
    });
    const onlineDrivers = drivers.filter(d => d.isActive);
    if (onlineDrivers.length > 0) {
      assignDriver(jobId, onlineDrivers[0].id);
      toast.success(`Auto-assigned to ${onlineDrivers[0].firstName} ${onlineDrivers[0].lastName}`);
    } else {
      toast.error("No available drivers");
    }
  };

  const toggleTag = async (jobId: string, tag: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const tags = job.tags || [];
    const newTags = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    await updateJob(jobId, { tags: newTags } as any);
  };

  const advanceStatus = async (job: Job) => {
    const flow: Record<string, string> = { pending: "assigned", assigned: "en_route", en_route: "on_scene", on_scene: "towing", towing: "completed" };
    const next = flow[job.status];
    if (next) {
      await updateJob(job.id, { status: next } as any);
      toast.success(`Status → ${STATUS_CONFIG[next]?.label || next}`);
    }
  };

  // Filter
  const statusFiltered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);
  const filtered = tagFilter ? statusFiltered.filter(j => j.tags?.includes(tagFilter)) : statusFiltered;

  // Stats
  const pending = jobs.filter(j => j.status === "pending").length;
  const active = jobs.filter(j => !["completed", "cancelled"].includes(j.status)).length;
  const completed = jobs.filter(j => j.status === "completed").length;
  const unassigned = jobs.filter(j => j.status === "pending" && !j.assignedDriverId).length;
  const needsAttention = jobs.filter(j => j.tags?.some(t => ["ai_failed", "needs_callback", "callback_requested"].includes(t))).length;

  const availableDrivers = drivers.filter(d => d.isActive);

  return (
    <div className="space-y-4" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Jobs</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">{active} active • {unassigned} unassigned • {needsAttention > 0 && <span className="text-[#dc2626] font-medium">{needsAttention} need attention</span>}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto-dispatch toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#e5edf5] rounded-lg">
            <span className="text-[12px] text-[#64748d]">Auto-dispatch</span>
            <button
              onClick={() => setAutoDispatch(!autoDispatch)}
              className={`w-9 h-5 rounded-full transition-colors ${autoDispatch ? "bg-[#15be53]" : "bg-[#e5edf5]"}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${autoDispatch ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] shadow-[0_2px_8px_rgba(83,58,253,0.2)] press-active">
            + New Job
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "ALL", value: jobs.length, color: "#061b31", onClick: () => setFilter("all") },
          { label: "PENDING", value: pending, color: "#f59e0b", onClick: () => setFilter("pending") },
          { label: "ACTIVE", value: active, color: "#3b82f6", onClick: () => setFilter("assigned") },
          { label: "COMPLETED", value: completed, color: "#15be53", onClick: () => setFilter("completed") },
          { label: "⚠️ ATTENTION", value: needsAttention, color: "#dc2626", onClick: () => setTagFilter(needsAttention > 0 ? "ai_failed" : null) },
        ].map(s => (
          <button key={s.label} onClick={s.onClick} className="bg-white border border-[#e5edf5] rounded-lg p-3 text-left hover:border-[#b9b9f9] transition-colors">
            <div className="text-[10px] text-[#64748d] uppercase tracking-wider">{s.label}</div>
            <div className="text-[24px] font-light tracking-[-0.5px] tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </button>
        ))}
      </div>

      {/* Tag filters */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setTagFilter(null)} className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${!tagFilter ? "bg-[#533afd] text-white border-[#533afd]" : "bg-white text-[#64748d] border-[#e5edf5] hover:border-[#b9b9f9]"}`}>
          All
        </button>
        {ALL_TAGS.map(tag => {
          const cfg = TAG_CONFIG[tag];
          const count = jobs.filter(j => j.tags?.includes(tag)).length;
          return (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${tagFilter === tag ? "border-current" : "border-[#e5edf5] hover:border-current"}`} style={{ color: cfg.color, background: tagFilter === tag ? cfg.bg : "white" }}>
              {cfg.icon} {cfg.label} {count > 0 && <span className="ml-0.5 opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Jobs Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-20">📋</div>
          <div className="text-[14px] font-medium text-[#061b31] mb-1">No jobs</div>
          <div className="text-[12px] text-[#64748d] mb-4">Jobs from AI dispatcher and manual entries appear here</div>
          <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4]">+ Create Job</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(j => {
            const sc = STATUS_CONFIG[j.status] || STATUS_CONFIG.pending;
            const tags = j.tags || [];
            const driver = drivers.find(d => d.id === j.assignedDriverId);
            const hasAttention = tags.some(t => ["ai_failed", "needs_callback", "callback_requested"].includes(t));
            return (
              <div
                key={j.id}
                onClick={() => setSelectedJob(j)}
                onContextMenu={(e) => openMenu(e, [
                  { label: "View Details", icon: "👁️", action: () => setSelectedJob(j) },
                  { label: "Assign Driver", icon: "🚗", action: () => setShowDriverAssign(j.id) },
                  { label: "Auto-Assign Nearest", icon: "🤖", action: () => autoAssignNearest(j.id) },
                  { label: "Copy Job ID", icon: "📋", action: () => navigator.clipboard.writeText(j.id) },
                  { label: "Copy Address", icon: "📍", action: () => navigator.clipboard.writeText(j.pickupAddress) },
                  ...(j.status !== "completed" && j.status !== "cancelled" ? [
                    { label: "Advance Status", icon: "➡️", action: () => advanceStatus(j) },
                  ] : []),
                  { label: "Delete", icon: "🗑️", action: () => {}, variant: "danger" as const },
                ])}
                className={`bg-white border rounded-lg p-4 cursor-pointer card-hover ${
                  selectedJob?.id === j.id ? "border-[#533afd] shadow-[0_4px_12px_rgba(83,58,253,0.1)]" :
                  hasAttention ? "border-[#fecaca] shadow-[0_0_0_1px_rgba(220,38,38,0.1)]" :
                  "border-[#e5edf5]"
                }`}
              >
                {/* Top row: status + tags + timer */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                    {j.source === "ai_dispatcher" && <span className="badge badge-accent">🤖 AI</span>}
                    {tags.slice(0, 3).map(tag => {
                      const tc = TAG_CONFIG[tag];
                      return tc ? <span key={tag} className="badge" style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>{tc.icon} {tc.label}</span> : null;
                    })}
                  </div>
                  <WaitTimer createdAt={j.createdAt} assignedAt={j.assignedAt} />
                </div>

                {/* Customer + Location */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-[#061b31] truncate">{j.customerName || "Walk-in"}</div>
                    <div className="text-[12px] text-[#64748d] truncate mt-0.5">📍 {j.pickupAddress}</div>
                    {j.destinationAddress && <div className="text-[12px] text-[#64748d] truncate">🏁 {j.destinationAddress}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    {j.totalAmount && <div className="text-[15px] font-semibold tabular-nums">${j.totalAmount.toFixed(0)}</div>}
                    {j.customerPhone && <div className="text-[11px] text-[#533afd]">{j.customerPhone}</div>}
                  </div>
                </div>

                {/* Vehicle + Driver */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {(j.towVehicleMake || j.towVehicleModel) && (
                      <span className="text-[11px] text-[#64748d] truncate">🚛 {j.towVehicleYear} {j.towVehicleMake} {j.towVehicleModel} {j.towVehiclePlate ? `(${j.towVehiclePlate})` : ""}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {driver ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#15be53] font-medium">
                        <span className="w-1.5 h-1.5 bg-[#15be53] rounded-full" /> {driver.firstName}
                      </span>
                    ) : j.status === "pending" ? (
                      <button onClick={(e) => { e.stopPropagation(); setShowDriverAssign(j.id); }} className="text-[10px] px-2 py-0.5 bg-[#fef3c7] text-[#92400e] border border-[#fde68a] rounded font-medium hover:bg-[#fde68a] transition-colors">
                        Assign Driver
                      </button>
                    ) : null}
                    <CopyButton text={`${j.customerName || "Walk-in"}\n${j.pickupAddress}\n${j.customerPhone || ""}`} />
                  </div>
                </div>

                {/* Quick tag buttons */}
                <div className="flex gap-1 mt-2 pt-2 border-t border-[#e5edf5]">
                  {["ai_failed", "needs_callback", "callback_requested", "urgent"].map(tag => {
                    const tc = TAG_CONFIG[tag];
                    const active = tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={(e) => { e.stopPropagation(); toggleTag(j.id, tag); }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                          active ? "" : "bg-white border-[#e5edf5] text-[#94a3b8] hover:border-current hover:text-current"
                        }`}
                        style={active ? { background: tc.bg, color: tc.color, borderColor: tc.border } : { }}
                        title={tc.label}
                      >
                        {tc.icon}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Driver Assign Modal */}
      {showDriverAssign && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDriverAssign(null)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold mb-4">Assign Driver</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {/* Auto-assign nearest */}
              <button
                onClick={() => autoAssignNearest(showDriverAssign)}
                className="w-full flex items-center gap-3 p-3 bg-[#533afd]/[0.04] border border-[#533afd]/20 rounded-lg hover:bg-[#533afd]/[0.08] transition-colors"
              >
                <span className="text-[20px]">🤖</span>
                <div className="text-left">
                  <div className="text-[13px] font-medium text-[#533afd]">Auto-Assign Nearest</div>
                  <div className="text-[11px] text-[#64748d]">AI selects closest available driver</div>
                </div>
              </button>
              {/* Manual list */}
              {availableDrivers.map(d => (
                <button
                  key={d.id}
                  onClick={() => assignDriver(showDriverAssign, d.id)}
                  className="w-full flex items-center gap-3 p-3 bg-white border border-[#e5edf5] rounded-lg hover:border-[#b9b9f9] hover:bg-[#f6f9fc] transition-colors"
                >
                  <div className="w-8 h-8 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[12px] font-semibold text-[#533afd]">
                    {d.firstName[0]}{d.lastName[0]}
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-[13px] font-medium">{d.firstName} {d.lastName}</div>
                    <div className="text-[11px] text-[#64748d]">{d.phone || "No phone"}</div>
                  </div>
                  <span className="w-2 h-2 bg-[#15be53] rounded-full" />
                </button>
              ))}
              {availableDrivers.length === 0 && (
                <div className="text-center py-4 text-[12px] text-[#94a3b8]">No available drivers</div>
              )}
            </div>
            <button onClick={() => setShowDriverAssign(null)} className="w-full mt-4 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
          </div>
        </div>
      )}

      {/* Add Job Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px] mb-6">New Job</h2>
            <form onSubmit={addJob} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Customer Name</label><input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Phone</label><input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Pickup Address *</label><input required value={form.pickupAddress} onChange={e => setForm(f => ({ ...f, pickupAddress: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Destination</label><input value={form.destinationAddress} onChange={e => setForm(f => ({ ...f, destinationAddress: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Make</label><input value={form.towVehicleMake} onChange={e => setForm(f => ({ ...f, towVehicleMake: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" placeholder="Honda" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Model</label><input value={form.towVehicleModel} onChange={e => setForm(f => ({ ...f, towVehicleModel: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" placeholder="Civic" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Year</label><input value={form.towVehicleYear} onChange={e => setForm(f => ({ ...f, towVehicleYear: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" placeholder="2020" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Base $</label><input type="number" value={form.baseRate} onChange={e => setForm(f => ({ ...f, baseRate: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">$/Mile</label><input type="number" value={form.mileageRate} onChange={e => setForm(f => ({ ...f, mileageRate: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Est. Miles</label><input type="number" value={form.estimatedMiles} onChange={e => setForm(f => ({ ...f, estimatedMiles: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none resize-none focus:border-[#533afd]" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">Create Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {ctxMenu && <ContextMenu items={ctxMenu.items} x={ctxMenu.x} y={ctxMenu.y} onClose={closeMenu} />}
    </div>
  );
}