"use client";

import { useState, useEffect } from "react";

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: "oil_change" | "tire_rotation" | "brake_service" | "transmission" | "inspection" | "repair" | "other";
  description: string;
  cost: number;
  mileage: number;
  date: string;
  nextDueDate?: string;
  nextDueMileage?: number;
  shop?: string;
  receiptUrl?: string;
}

const MAINT_TYPES = [
  { value: "oil_change", label: "🛢️ Oil Change", interval: "5,000 mi / 6 months" },
  { value: "tire_rotation", label: "🔄 Tire Rotation", interval: "7,500 mi / 6 months" },
  { value: "brake_service", label: "🛑 Brake Service", interval: "25,000 mi / 2 years" },
  { value: "transmission", label: "⚙️ Transmission", interval: "60,000 mi / 4 years" },
  { value: "inspection", label: "🔍 Inspection", interval: "Annual" },
  { value: "repair", label: "🔧 Repair", interval: "As needed" },
  { value: "other", label: "📋 Other", interval: "—" },
];

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; name: string; mileage?: number }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    vehicleId: "", type: "oil_change", description: "", cost: "", mileage: "", date: "",
    nextDueDate: "", nextDueMileage: "", shop: "",
  });

  useEffect(() => {
    fetch("/api/fleet").then(r => r.json()).then(d => setVehicles((d.vehicles || []).map((v: { id: string; name: string; mileage?: number }) => ({ id: v.id, name: v.name, mileage: v.mileage }))));
  }, []);

  const totalCost = records.reduce((s, r) => s + r.cost, 0);
  const upcoming = records.filter(r => r.nextDueDate && new Date(r.nextDueDate) <= new Date(Date.now() + 30 * 86400000));

  const addRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: MaintenanceRecord = {
      id: `maint-${Date.now()}`,
      vehicleId: form.vehicleId,
      vehicleName: vehicles.find(v => v.id === form.vehicleId)?.name || "Unknown",
      type: form.type as MaintenanceRecord["type"],
      description: form.description,
      cost: parseFloat(form.cost) || 0,
      mileage: parseInt(form.mileage) || 0,
      date: form.date || new Date().toISOString().slice(0, 10),
      nextDueDate: form.nextDueDate || undefined,
      nextDueMileage: form.nextDueMileage ? parseInt(form.nextDueMileage) : undefined,
      shop: form.shop || undefined,
    };
    setRecords(prev => [newRecord, ...prev]);
    setShowAdd(false);
    setForm({ vehicleId: "", type: "oil_change", description: "", cost: "", mileage: "", date: "", nextDueDate: "", nextDueMileage: "", shop: "" });
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Fleet Maintenance</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Track vehicle maintenance, costs, and upcoming service</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">
          + Log Service
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Spent", value: `$${totalCost.toFixed(0)}`, accent: "#061b31" },
          { label: "Service Records", value: records.length, accent: "#533afd" },
          { label: "Due Soon", value: upcoming.length, accent: upcoming.length > 0 ? "#f59e0b" : "#15be53" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-[28px] font-light tracking-[-0.5px]" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Upcoming maintenance alerts */}
      {upcoming.length > 0 && (
        <div className="bg-[#fef3c7] border border-[#fde68a] rounded-lg p-4">
          <div className="text-[13px] font-medium text-[#92400e] mb-2">⚠️ Upcoming Maintenance</div>
          <div className="space-y-1">
            {upcoming.map(r => (
              <div key={r.id} className="text-[12px] text-[#92400e]">
                • {r.vehicleName}: {MAINT_TYPES.find(t => t.value === r.type)?.label} — due {new Date(r.nextDueDate!).toLocaleDateString()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance schedule reference */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
        <div className="text-[13px] font-medium text-[#061b31] mb-3">📋 Recommended Maintenance Schedule</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {MAINT_TYPES.filter(t => t.value !== "other" && t.value !== "repair").map(t => (
            <div key={t.value} className="p-3 bg-[#f6f9fc] rounded-lg">
              <div className="text-[12px] font-medium text-[#061b31]">{t.label}</div>
              <div className="text-[11px] text-[#64748d]">{t.interval}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Records table */}
      {records.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">🔧</div>
          <div className="text-[14px] text-[#64748d]">No maintenance records yet</div>
          <div className="text-[12px] text-[#94a3b8] mt-1">Log oil changes, tire rotations, repairs, and inspections</div>
        </div>
      ) : (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>{["Vehicle", "Service", "Date", "Mileage", "Cost", "Shop", "Next Due"].map(h =>
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-[#f6f9fc]">
                  <td className="px-4 py-3 text-[13px] font-medium">{r.vehicleName}</td>
                  <td className="px-4 py-3 text-[13px]">{MAINT_TYPES.find(t => t.value === r.type)?.label || r.type}</td>
                  <td className="px-4 py-3 text-[12px] text-[#64748d]">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-[12px]">{r.mileage.toLocaleString()} mi</td>
                  <td className="px-4 py-3 text-[13px] font-medium">${r.cost.toFixed(0)}</td>
                  <td className="px-4 py-3 text-[12px] text-[#64748d]">{r.shop || "—"}</td>
                  <td className="px-4 py-3 text-[12px]">{r.nextDueDate ? new Date(r.nextDueDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[18px] font-semibold tracking-[-0.3px] mb-5">Log Maintenance</h2>
            <form onSubmit={addRecord} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Vehicle *</label>
                  <select required value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none">
                    <option value="">Select vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Service Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none">
                    {MAINT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Full synthetic oil change + filter" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Cost ($)</label><input type="number" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Mileage</label><input type="number" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Shop / Mechanic</label><input value={form.shop} onChange={e => setForm(f => ({ ...f, shop: e.target.value }))} placeholder="e.g. Jiffy Lube, Joe's Auto" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Next Due Date</label><input type="date" value={form.nextDueDate} onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Next Due Mileage</label><input type="number" value={form.nextDueMileage} onChange={e => setForm(f => ({ ...f, nextDueMileage: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
