"use client";

import { useState, useEffect } from "react";

interface Vehicle {
  id: string; name: string; type: string; make?: string; model?: string;
  year?: number; licensePlate?: string; color?: string; isActive: boolean;
  assignedDriverId?: string; mileage?: number;
}

const VEHICLE_TYPES = ["flatbed", "wheel_lift", "heavy_duty", "medium_duty", "motorcycle", "other"];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Fleet Management</h1>
        <button onClick={() => setShowAdd(true)} className="bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-800">
          + Add Vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-5xl mb-4">🚛</div>
          <h2 className="text-xl font-bold mb-2">No vehicles yet</h2>
          <p className="text-gray-500 mb-4">Add your first tow truck to get started.</p>
          <button onClick={() => setShowAdd(true)} className="bg-blue-900 text-white px-6 py-3 rounded-xl font-bold">Add First Vehicle</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map(v => (
            <div key={v.id} className={`bg-white rounded-xl border p-6 ${!v.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{v.type === "flatbed" ? "🚛" : v.type === "heavy_duty" ? "🚜" : "🏎️"}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {v.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <h3 className="text-lg font-bold">{v.name}</h3>
              <div className="text-sm text-gray-500 space-y-1 mt-2">
                <div>{v.make} {v.model} {v.year}</div>
                <div>Plate: {v.licensePlate || "—"}</div>
                <div>Type: <span className="capitalize">{v.type.replace("_", " ")}</span></div>
                {v.mileage && <div>Mileage: {v.mileage.toLocaleString()} mi</div>}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => toggleActive(v)} className="text-sm text-gray-500 hover:text-blue-600">
                  {v.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black mb-6">Add Vehicle</h2>
            <form onSubmit={addVehicle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" placeholder="e.g. Truck #1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-4 py-3 border rounded-xl">
                    {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Year</label>
                  <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Make</label><input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">Model</label><input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">License Plate</label><input value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">Color</label><input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 border rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold">Add Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
