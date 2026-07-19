"use client";

import { useState, useEffect } from "react";

interface Vehicle {
  id: string; name: string; type: string; make?: string; model?: string;
  year?: number; licensePlate?: string; color?: string; isActive: boolean;
  assignedDriverId?: string; mileage?: number; capacityLbs?: number;
}

const VEHICLE_TYPES = ["flatbed", "wheel_lift", "heavy_duty", "medium_duty", "motorcycle", "other"];

const TYPE_ICONS: Record<string, string> = {
  flatbed: "🚛", wheel_lift: "🚐", heavy_duty: "🚜", medium_duty: "🚛", motorcycle: "🏍️", other: "🚗",
};

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "flatbed", make: "", model: "", year: "", licensePlate: "", color: "", capacityLbs: "" });

  const loadVehicles = () => fetch("/api/fleet").then(r => r.json()).then(d => setVehicles(d.vehicles || []));
  useEffect(() => { loadVehicles(); }, []);

  const addVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/fleet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ name: "", type: "flatbed", make: "", model: "", year: "", licensePlate: "", color: "", capacityLbs: "" }); loadVehicles(); }
  };

  const toggleActive = async (v: Vehicle) => {
    await fetch("/api/fleet", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: v.id, isActive: !v.isActive }) });
    loadVehicles();
  };

  const activeCount = vehicles.filter(v => v.isActive).length;

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Fleet Management</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">{activeCount} active vehicle{activeCount !== 1 ? "s" : ""} • {vehicles.length} total</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
          + Add Vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">🚛</div>
          <div className="text-[14px] text-[#64748d] mb-4">No vehicles yet. Add your first tow truck to get started.</div>
          <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4]">
            + Add First Vehicle
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map(v => (
            <div key={v.id} className={`bg-white border border-[#e5edf5] rounded-lg p-5 hover:border-[#b9b9f9] hover:shadow-[0_8px_24px_rgba(50,50,93,0.06)] transition-all ${!v.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[24px]">{TYPE_ICONS[v.type] || "🚛"}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${v.isActive ? "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]" : "bg-[#f6f9fc] text-[#94a3b8] border-[#e5edf5]"}`}>
                  {v.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="text-[15px] font-semibold text-[#061b31] tracking-[-0.2px]">{v.name}</div>
              <div className="mt-2 space-y-1">
                {(v.make || v.model || v.year) && <div className="text-[13px] text-[#64748d]">{v.year} {v.make} {v.model}</div>}
                {v.licensePlate && <div className="text-[13px] text-[#64748d]">Plate: <span className="font-mono">{v.licensePlate}</span></div>}
                <div className="text-[13px] text-[#64748d]">Type: <span className="capitalize">{v.type.replace("_", " ")}</span></div>
                {v.mileage && <div className="text-[13px] text-[#64748d]">Mileage: {v.mileage.toLocaleString()} mi</div>}
                {v.capacityLbs && <div className="text-[13px] text-[#64748d]">Capacity: {v.capacityLbs.toLocaleString()} lbs</div>}
              </div>
              <div className="mt-4 pt-3 border-t border-[#e5edf5]">
                <button onClick={() => toggleActive(v)} className="text-[12px] text-[#533afd] font-medium hover:underline">
                  {v.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px] mb-6">Add Vehicle</h2>
            <form onSubmit={addVehicle} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" placeholder="e.g. Truck #1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none">
                    {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Year</label>
                  <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Make</label><input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Model</label><input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">License Plate</label><input value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Color</label><input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Capacity (lbs)</label>
                <input type="number" value={form.capacityLbs} onChange={e => setForm(f => ({ ...f, capacityLbs: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">Add Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
