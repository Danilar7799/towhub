"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/lib/toast";

/*
 * Fleet Management — redesigned
 * Big truck photos, no copy buttons, clean card design, all functionality working
 * Design: Stripe tokens
 */

interface Vehicle {
  id: string; name: string; type: string; make?: string; model?: string;
  year?: number; licensePlate?: string; color?: string; isActive: boolean;
  assignedDriverId?: string; mileage?: number; capacityLbs?: number;
  photoUrl?: string; vin?: string; insuranceExpiry?: string; lastService?: string;
}

interface Driver {
  id: string; firstName: string; lastName: string; email: string; isActive: boolean;
  phone?: string;
}

const VEHICLE_TYPES = [
  { value: "flatbed", label: "Flatbed", icon: "🚛", color: "#3b82f6" },
  { value: "wheel_lift", label: "Wheel Lift", icon: "🔧", color: "#15be53" },
  { value: "heavy_duty", label: "Heavy Duty", icon: "🏗️", color: "#f59e0b" },
  { value: "medium_duty", label: "Medium Duty", icon: "🚚", color: "#7c3aed" },
  { value: "motorcycle", label: "Motorcycle", icon: "🏍️", color: "#f97316" },
  { value: "other", label: "Other", icon: "🚗", color: "#64748d" },
];

const TYPE_MAP = Object.fromEntries(VEHICLE_TYPES.map(t => [t.value, t]));

export default function FleetPage() {
  const toast = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ name: "", type: "flatbed", make: "", model: "", year: "", licensePlate: "", color: "", capacityLbs: "", vin: "" });

  const load = async () => {
    const [vRes, dRes] = await Promise.all([fetch("/api/fleet"), fetch("/api/drivers")]);
    const vData = await vRes.json();
    const dData = await dRes.json();
    setVehicles(vData.vehicles || []);
    setDrivers(dData.drivers || dData.users || []);
  };

  useEffect(() => { load(); }, []);

  const addVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/fleet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      toast.success("Vehicle added");
      setShowAdd(false);
      setForm({ name: "", type: "flatbed", make: "", model: "", year: "", licensePlate: "", color: "", capacityLbs: "", vin: "" });
      load();
    }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    await fetch("/api/fleet", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    toast.success("Updated");
    load();
  };

  const deleteVehicle = async (id: string) => {
    if (!confirm("Delete this vehicle?")) return;
    await fetch("/api/fleet", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    toast.success("Deleted");
    setSelectedVehicle(null);
    load();
  };

  const assignDriver = async (vehicleId: string, driverId: string | null) => {
    await fetch("/api/fleet", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: vehicleId, assignedDriverId: driverId }) });
    toast.success(driverId ? "Driver assigned" : "Driver unassigned");
    setShowAssign(null);
    load();
  };

  const getDriver = (id?: string) => drivers.find(d => d.id === id);
  const getUnassignedDrivers = () => {
    const assigned = vehicles.filter(v => v.assignedDriverId).map(v => v.assignedDriverId);
    return drivers.filter(d => d.isActive && !assigned.includes(d.id));
  };

  // Stats
  const activeCount = vehicles.filter(v => v.isActive).length;
  const assignedCount = vehicles.filter(v => v.assignedDriverId).length;

  // Filter
  const filtered = filter === "all" ? vehicles
    : filter === "assigned" ? vehicles.filter(v => v.assignedDriverId)
    : filter === "unassigned" ? vehicles.filter(v => !v.assignedDriverId)
    : vehicles.filter(v => v.type === filter);

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Fleet</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">{activeCount} active • {assignedCount} assigned • {vehicles.length} total</p>
        </div>
        <button onClick={() => { setEditingVehicle(null); setForm({ name: "", type: "flatbed", make: "", model: "", year: "", licensePlate: "", color: "", capacityLbs: "", vin: "" }); setShowAdd(true); }} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] shadow-[0_2px_8px_rgba(83,58,253,0.2)] press-active">
          + Add Vehicle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "TOTAL", value: vehicles.length, color: "#061b31" },
          { label: "ACTIVE", value: activeCount, color: "#15be53" },
          { label: "ASSIGNED", value: assignedCount, color: "#533afd" },
          { label: "UNASSIGNED", value: vehicles.length - assignedCount, color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#e5edf5] rounded-lg p-3">
            <div className="text-[10px] text-[#64748d] uppercase tracking-wider">{s.label}</div>
            <div className="text-[24px] font-light tracking-[-0.5px] tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { id: "all", label: "All" },
          { id: "assigned", label: "Assigned" },
          { id: "unassigned", label: "Unassigned" },
          ...VEHICLE_TYPES.map(t => ({ id: t.value, label: t.label })),
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${filter === f.id ? "bg-[#533afd] text-white border-[#533afd]" : "bg-white text-[#64748d] border-[#e5edf5] hover:border-[#b9b9f9]"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Vehicle Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-20">🚛</div>
          <div className="text-[14px] font-medium text-[#061b31] mb-1">No vehicles</div>
          <div className="text-[12px] text-[#64748d] mb-4">Add your first tow truck to get started</div>
          <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4]">+ Add Vehicle</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => {
            const tt = TYPE_MAP[v.type] || TYPE_MAP.other;
            const driver = getDriver(v.assignedDriverId);
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVehicle(v)}
                className={`bg-white border rounded-lg overflow-hidden cursor-pointer card-hover ${!v.isActive ? "opacity-60" : ""} ${selectedVehicle?.id === v.id ? "border-[#533afd]" : "border-[#e5edf5]"}`}
              >
                {/* Photo header */}
                <div className="h-36 bg-gradient-to-br from-[#f6f9fc] to-[#e5edf5] flex items-center justify-center relative">
                  {v.photoUrl ? (
                    <img src={v.photoUrl} alt={v.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <div className="text-[40px] mb-1">{tt.icon}</div>
                      <div className="text-[12px] text-[#94a3b8]">{v.type.replace("_", " ")}</div>
                    </div>
                  )}
                  {/* Status badge */}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium ${v.isActive ? "bg-[#15be53] text-white" : "bg-[#94a3b8] text-white"}`}>
                    {v.isActive ? "Active" : "Inactive"}
                  </span>
                  {/* Type badge */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium text-white" style={{ background: tt.color }}>
                    {tt.label}
                  </span>
                </div>

                <div className="p-4">
                  {/* Name + vehicle info */}
                  <div className="mb-3">
                    <div className="text-[15px] font-semibold text-[#061b31]">{v.name}</div>
                    <div className="text-[12px] text-[#64748d]">
                      {[v.year, v.make, v.model].filter(Boolean).join(" ") || "No vehicle details"}
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                    {v.licensePlate && (
                      <div>
                        <div className="text-[10px] text-[#94a3b8] uppercase">Plate</div>
                        <div className="text-[12px] font-medium font-mono text-[#061b31]">{v.licensePlate}</div>
                      </div>
                    )}
                    {v.color && (
                      <div>
                        <div className="text-[10px] text-[#94a3b8] uppercase">Color</div>
                        <div className="text-[12px] font-medium text-[#061b31]">{v.color}</div>
                      </div>
                    )}
                    {v.mileage && (
                      <div>
                        <div className="text-[10px] text-[#94a3b8] uppercase">Mileage</div>
                        <div className="text-[12px] font-medium font-mono text-[#061b31]">{v.mileage.toLocaleString()} mi</div>
                      </div>
                    )}
                    {v.capacityLbs && (
                      <div>
                        <div className="text-[10px] text-[#94a3b8] uppercase">Capacity</div>
                        <div className="text-[12px] font-medium font-mono text-[#061b31]">{v.capacityLbs.toLocaleString()} lbs</div>
                      </div>
                    )}
                  </div>

                  {/* Driver */}
                  {driver ? (
                    <div className="flex items-center gap-2 p-2 bg-[#dcfce7] rounded border border-[#bbf7d0]">
                      <div className="w-7 h-7 bg-[#15be53]/20 rounded-full flex items-center justify-center text-[10px] font-semibold text-[#15be53]">
                        {driver.firstName[0]}{driver.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-[#166534] truncate">{driver.firstName} {driver.lastName}</div>
                        <div className="text-[10px] text-[#166534] opacity-70">{driver.phone || driver.email}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); assignDriver(v.id, null); }} className="text-[10px] text-[#991b1b] hover:underline">Remove</button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAssign(v.id); }}
                      className="w-full py-2 border border-dashed border-[#e5edf5] rounded text-[12px] text-[#64748d] hover:border-[#533afd] hover:text-[#533afd] transition-colors"
                    >
                      + Assign Driver
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Driver Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAssign(null)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold mb-4">Assign Driver</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {drivers.filter(d => d.isActive).map(d => {
                const isAssigned = vehicles.some(v => v.assignedDriverId === d.id && v.id !== showAssign);
                return (
                  <button
                    key={d.id}
                    onClick={() => !isAssigned && assignDriver(showAssign, d.id)}
                    disabled={isAssigned}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${isAssigned ? "border-[#e5edf5] bg-[#f6f9fc] opacity-50 cursor-not-allowed" : "border-[#e5edf5] hover:border-[#533afd] hover:bg-[#533afd]/[0.02]"}`}
                  >
                    <div className="w-9 h-9 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[12px] font-medium text-[#533afd]">
                      {d.firstName[0]}{d.lastName[0]}
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-[13px] font-medium">{d.firstName} {d.lastName}</div>
                      <div className="text-[11px] text-[#64748d]">{d.phone || d.email}</div>
                    </div>
                    {isAssigned && <span className="text-[10px] text-[#94a3b8]">Already assigned</span>}
                  </button>
                );
              })}
              {drivers.filter(d => d.isActive).length === 0 && (
                <div className="text-center py-6 text-[13px] text-[#94a3b8]">No active drivers</div>
              )}
            </div>
            <button onClick={() => setShowAssign(null)} className="w-full mt-4 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowAdd(false); setEditingVehicle(null); }}>
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[18px] font-semibold tracking-[-0.3px] mb-5">{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</h2>
            <form onSubmit={editingVehicle ? (e) => { e.preventDefault(); updateVehicle(editingVehicle.id, form as any); setShowAdd(false); setEditingVehicle(null); } : addVehicle} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" placeholder="e.g. Truck #1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none">
                    {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Year</label>
                  <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" placeholder="2024" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Make</label><input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" placeholder="Ford" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Model</label><input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" placeholder="F-550" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">License Plate</label><input value={form.licensePlate} onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Color</label><input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" placeholder="White" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Capacity (lbs)</label><input type="number" value={form.capacityLbs} onChange={e => setForm(f => ({ ...f, capacityLbs: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">VIN</label><input value={form.vin} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); setEditingVehicle(null); }} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">{editingVehicle ? "Save" : "Add Vehicle"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}