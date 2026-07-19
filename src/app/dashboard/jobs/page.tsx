"use client";

import { useState, useEffect } from "react";

interface Job {
  id: string; status: string; source: string; customerName?: string; customerPhone?: string; customerEmail?: string;
  pickupAddress: string; pickupLat?: number; pickupLng?: number;
  destinationAddress?: string; destinationLat?: number; destinationLng?: number;
  towVehicleMake?: string; towVehicleModel?: string; towVehicleYear?: number; towVehicleColor?: string; towVehiclePlate?: string;
  estimatedMiles?: number; actualMiles?: number; baseRate?: number; mileageRate?: number; totalAmount?: number;
  notes?: string; dispatcherNotes?: string; assignedDriverId?: string; assignedVehicleId?: string;
  isPaid: boolean; paymentMethod?: string;
  createdAt: string; assignedAt?: string; enRouteAt?: string; onSceneAt?: string; towingAt?: string; completedAt?: string; cancelledAt?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-[#fef3c7]", text: "text-[#92400e]", border: "border-[#fde68a]" },
  assigned: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", border: "border-[#bfdbfe]" },
  en_route: { bg: "bg-[#e0e7ff]", text: "text-[#3730a3]", border: "border-[#c7d2fe]" },
  on_scene: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]", border: "border-[#e9d5ff]" },
  towing: { bg: "bg-[#ffedd5]", text: "text-[#9a3412]", border: "border-[#fed7aa]" },
  completed: { bg: "bg-[#dcfce7]", text: "text-[#166534]", border: "border-[#bbf7d0]" },
  cancelled: { bg: "bg-[#fef2f2]", text: "text-[#991b1b]", border: "border-[#fecaca]" },
};

const WORKFLOW = [
  { from: "pending", to: "assigned", label: "Assign", color: "#3b82f6" },
  { from: "assigned", to: "en_route", label: "En Route", color: "#6366f1" },
  { from: "en_route", to: "on_scene", label: "On Scene", color: "#a855f7" },
  { from: "on_scene", to: "towing", label: "Towing", color: "#f97316" },
  { from: "towing", to: "completed", label: "Complete", color: "#22c55e" },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", customerEmail: "", pickupAddress: "", destinationAddress: "",
    towVehicleMake: "", towVehicleModel: "", towVehicleYear: "", towVehicleColor: "", towVehiclePlate: "",
    notes: "", baseRate: "", mileageRate: "", estimatedMiles: "",
  });

  const load = () => fetch("/api/jobs").then(r => r.json()).then(d => setJobs(d.jobs || []));
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);
  const counts = (s: string) => jobs.filter(j => j.status === s).length;

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ customerName: "", customerPhone: "", customerEmail: "", pickupAddress: "", destinationAddress: "", towVehicleMake: "", towVehicleModel: "", towVehicleYear: "", towVehicleColor: "", towVehiclePlate: "", notes: "", baseRate: "", mileageRate: "", estimatedMiles: "" }); load(); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/jobs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
    if (selectedJob?.id === id) setSelectedJob(null);
  };

  const fmtTime = (d?: string) => d ? new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—";
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Left: Job list */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Jobs</h2>
          <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4]">+ New Job</button>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {[{ l: "All", v: "all" }, { l: "Pending", v: "pending" }, { l: "Active", v: "assigned" }, { l: "En Route", v: "en_route" }, { l: "On Scene", v: "on_scene" }, { l: "Towing", v: "towing" }, { l: "Completed", v: "completed" }].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium whitespace-nowrap ${filter === f.v ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"}`}>
              {f.l} {f.v !== "all" && `(${counts(f.v)})`}
            </button>
          ))}
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
              <div className="text-[32px] mb-3 opacity-30">📋</div>
              <div className="text-[14px] text-[#64748d]">No {filter !== "all" ? filter : ""} jobs.</div>
            </div>
          ) : filtered.map(j => {
            const s = STATUS_COLORS[j.status] || STATUS_COLORS.pending;
            return (
              <div key={j.id} onClick={() => setSelectedJob(j)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(50,50,93,0.06)] ${selectedJob?.id === j.id ? "border-[#533afd] shadow-[0_4px_12px_rgba(83,58,253,0.1)]" : "border-[#e5edf5]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>{j.status.replace("_", " ")}</span>
                      <span className="text-[10px] text-[#94a3b8] capitalize">{j.source}</span>
                      {j.isPaid && <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-1.5 py-0.5 rounded font-medium">Paid</span>}
                    </div>
                    <div className="text-[14px] font-medium text-[#061b31] truncate">{j.customerName || "Walk-in"}</div>
                    <div className="text-[12px] text-[#64748d] truncate mt-0.5">📍 {j.pickupAddress}</div>
                    {j.destinationAddress && <div className="text-[12px] text-[#64748d] truncate">🏁 {j.destinationAddress}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    {j.totalAmount && <div className="text-[15px] font-semibold">${j.totalAmount.toFixed(0)}</div>}
                    <div className="text-[11px] text-[#94a3b8]">{fmtDate(j.createdAt)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Job detail panel */}
      {selectedJob && (
        <div className="w-[380px] bg-white border border-[#e5edf5] rounded-lg overflow-hidden shrink-0 flex flex-col">
          <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center justify-between">
            <div className="text-[15px] font-semibold">Job Details</div>
            <button onClick={() => setSelectedJob(null)} className="text-[#64748d] hover:text-[#061b31] text-lg">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Status + workflow */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Status</div>
              <div className="flex items-center gap-1">
                {["pending", "assigned", "en_route", "on_scene", "towing", "completed"].map((s, i) => {
                  const active = ["pending", "assigned", "en_route", "on_scene", "towing", "completed"].indexOf(selectedJob.status) >= i;
                  const current = selectedJob.status === s;
                  return (
                    <div key={s} className="flex items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium ${current ? "bg-[#533afd] text-white" : active ? "bg-[#533afd]/20 text-[#533afd]" : "bg-[#f6f9fc] text-[#94a3b8]"}`}>
                        {i + 1}
                      </div>
                      {i < 5 && <div className={`w-4 h-0.5 ${active ? "bg-[#533afd]/30" : "bg-[#e5edf5]"}`} />}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {WORKFLOW.filter(w => w.from === selectedJob.status).map(w => (
                  <button key={w.to} onClick={() => updateStatus(selectedJob.id, w.to)}
                    className="px-3 py-1.5 rounded text-[12px] font-medium text-white transition-colors"
                    style={{ backgroundColor: w.color }}>
                    {w.label}
                  </button>
                ))}
                {["pending", "assigned"].includes(selectedJob.status) && (
                  <button onClick={() => updateStatus(selectedJob.id, "cancelled")} className="px-3 py-1.5 rounded text-[12px] font-medium text-[#dc2626] bg-[#fef2f2] border border-[#fecaca]">
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Customer */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Customer</div>
              <div className="text-[14px] font-medium">{selectedJob.customerName || "Walk-in"}</div>
              {selectedJob.customerPhone && <div className="text-[13px] text-[#64748d]">📞 {selectedJob.customerPhone}</div>}
              {selectedJob.customerEmail && <div className="text-[13px] text-[#64748d]">📧 {selectedJob.customerEmail}</div>}
            </div>

            {/* Location */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Location</div>
              <div className="text-[13px]">📍 {selectedJob.pickupAddress}</div>
              {selectedJob.destinationAddress && <div className="text-[13px] mt-1">🏁 {selectedJob.destinationAddress}</div>}
              {selectedJob.estimatedMiles && <div className="text-[12px] text-[#64748d] mt-1">~{selectedJob.estimatedMiles} miles</div>}
            </div>

            {/* Vehicle being towed */}
            {(selectedJob.towVehicleMake || selectedJob.towVehicleModel) && (
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Vehicle</div>
                <div className="text-[13px]">{selectedJob.towVehicleYear} {selectedJob.towVehicleMake} {selectedJob.towVehicleModel}</div>
                <div className="text-[12px] text-[#64748d]">{selectedJob.towVehicleColor} {selectedJob.towVehiclePlate && `• ${selectedJob.towVehiclePlate}`}</div>
              </div>
            )}

            {/* Pricing */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Pricing</div>
              <div className="space-y-1">
                {selectedJob.baseRate && <div className="flex justify-between text-[13px]"><span className="text-[#64748d]">Base rate</span><span>${selectedJob.baseRate.toFixed(2)}</span></div>}
                {selectedJob.mileageRate && <div className="flex justify-between text-[13px]"><span className="text-[#64748d]">Mileage</span><span>${selectedJob.mileageRate}/mi</span></div>}
                {selectedJob.totalAmount && <div className="flex justify-between text-[14px] font-semibold pt-1 border-t border-[#e5edf5]"><span>Total</span><span>${selectedJob.totalAmount.toFixed(2)}</span></div>}
                {selectedJob.isPaid !== undefined && <div className="flex justify-between text-[12px]"><span className="text-[#64748d]">Payment</span><span className={selectedJob.isPaid ? "text-[#15be53]" : "text-[#ea2261]"}>{selectedJob.isPaid ? "Paid" : "Unpaid"}</span></div>}
              </div>
            </div>

            {/* Notes */}
            {selectedJob.notes && (
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Notes</div>
                <div className="text-[13px] text-[#64748d] bg-[#f6f9fc] rounded p-3">{selectedJob.notes}</div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Timeline</div>
              <div className="space-y-2">
                {[
                  { label: "Created", time: selectedJob.createdAt },
                  { label: "Assigned", time: selectedJob.assignedAt },
                  { label: "En Route", time: selectedJob.enRouteAt },
                  { label: "On Scene", time: selectedJob.onSceneAt },
                  { label: "Towing", time: selectedJob.towingAt },
                  { label: "Completed", time: selectedJob.completedAt },
                ].filter(t => t.time).map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-[#533afd] rounded-full shrink-0" />
                    <div className="text-[12px] text-[#64748d] w-16">{t.label}</div>
                    <div className="text-[12px] font-medium">{fmtTime(t.time)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold mb-6">New Job</h2>
            <form onSubmit={createJob} className="space-y-4">
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Customer</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Name</label><input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Phone</label><input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Location</div>
                <div className="space-y-3">
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Pickup Address *</label><input required value={form.pickupAddress} onChange={e => setForm(f => ({ ...f, pickupAddress: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Destination</label><input value={form.destinationAddress} onChange={e => setForm(f => ({ ...f, destinationAddress: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Vehicle Being Towed</div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Make</label><input value={form.towVehicleMake} onChange={e => setForm(f => ({ ...f, towVehicleMake: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Model</label><input value={form.towVehicleModel} onChange={e => setForm(f => ({ ...f, towVehicleModel: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Year</label><input value={form.towVehicleYear} onChange={e => setForm(f => ({ ...f, towVehicleYear: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Pricing</div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Base $</label><input type="number" value={form.baseRate} onChange={e => setForm(f => ({ ...f, baseRate: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1">$/Mile</label><input type="number" value={form.mileageRate} onChange={e => setForm(f => ({ ...f, mileageRate: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Est. Miles</label><input type="number" value={form.estimatedMiles} onChange={e => setForm(f => ({ ...f, estimatedMiles: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                </div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium">Create Job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
