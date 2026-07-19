"use client";

import { useState, useEffect } from "react";

interface Job {
  id: string; status: string; source: string; customerName?: string; customerPhone?: string;
  pickupAddress: string; destinationAddress?: string; totalAmount?: number; notes?: string;
  assignedDriverId?: string; createdAt: string; completedAt?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", assigned: "bg-blue-100 text-blue-700",
  en_route: "bg-indigo-100 text-indigo-700", on_scene: "bg-purple-100 text-purple-700",
  towing: "bg-orange-100 text-orange-700", completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", pickupAddress: "", destinationAddress: "",
    notes: "", baseRate: "", mileageRate: "", estimatedMiles: "",
  });

  const load = () => fetch("/api/jobs").then(r => r.json()).then(d => setJobs(d.jobs || []));
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? jobs : jobs.filter(j => j.status === filter);

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ customerName: "", customerPhone: "", pickupAddress: "", destinationAddress: "", notes: "", baseRate: "", mileageRate: "", estimatedMiles: "" }); load(); }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/jobs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Jobs</h1>
        <button onClick={() => setShowAdd(true)} className="bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold">+ New Job</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["all", "pending", "assigned", "en_route", "on_scene", "towing", "completed", "cancelled"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filter === s ? "bg-blue-900 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
            {s === "all" ? "All" : s.replace("_", " ")} {s !== "all" && `(${jobs.filter(j => j.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Jobs list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold mb-2">No jobs{filter !== "all" ? ` with status "${filter}"` : ""}</h2>
          <p className="text-gray-500">Create your first job to start dispatching.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(j => (
            <div key={j.id} className="bg-white rounded-xl border p-5 hover:shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[j.status]}`}>
                      {j.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">via {j.source}</span>
                  </div>
                  <div className="font-bold text-lg">{j.customerName || "Walk-in"}</div>
                  <div className="text-sm text-gray-500 mt-1">📍 {j.pickupAddress}</div>
                  {j.destinationAddress && <div className="text-sm text-gray-500">🏁 {j.destinationAddress}</div>}
                  {j.customerPhone && <div className="text-sm text-gray-500">📞 {j.customerPhone}</div>}
                  {j.totalAmount && <div className="text-sm font-medium text-green-600 mt-1">${j.totalAmount.toFixed(2)}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  {j.status === "pending" && <button onClick={() => updateStatus(j.id, "assigned")} className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">Assign</button>}
                  {j.status === "assigned" && <button onClick={() => updateStatus(j.id, "en_route")} className="text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg">En Route</button>}
                  {j.status === "en_route" && <button onClick={() => updateStatus(j.id, "on_scene")} className="text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg">On Scene</button>}
                  {j.status === "on_scene" && <button onClick={() => updateStatus(j.id, "towing")} className="text-sm bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg">Towing</button>}
                  {j.status === "towing" && <button onClick={() => updateStatus(j.id, "completed")} className="text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-lg">Complete</button>}
                  {["pending", "assigned"].includes(j.status) && <button onClick={() => updateStatus(j.id, "cancelled")} className="text-sm text-red-500 hover:text-red-700">Cancel</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Job Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black mb-6">New Job</h2>
            <form onSubmit={createJob} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Customer Name</label><input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">Phone</label><input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Pickup Address *</label><input required value={form.pickupAddress} onChange={e => setForm(f => ({ ...f, pickupAddress: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Destination</label><input value={form.destinationAddress} onChange={e => setForm(f => ({ ...f, destinationAddress: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Base Rate $</label><input type="number" value={form.baseRate} onChange={e => setForm(f => ({ ...f, baseRate: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">$/Mile</label><input type="number" value={form.mileageRate} onChange={e => setForm(f => ({ ...f, mileageRate: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">Est. Miles</label><input type="number" value={form.estimatedMiles} onChange={e => setForm(f => ({ ...f, estimatedMiles: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Notes</label><textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 border rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold">Create Job</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
