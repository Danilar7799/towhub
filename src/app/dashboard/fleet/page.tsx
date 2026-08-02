"use client";

import { useState, useEffect } from "react";

interface Vehicle {
  id: string; name: string; type: string; make?: string; model?: string;
  year?: number; licensePlate?: string; color?: string; isActive: boolean;
  assignedDriverId?: string; assignedDriverName?: string; mileage?: number; capacityLbs?: number;
}

interface Driver {
  id: string; firstName: string; lastName: string; email: string; isActive: boolean;
}

const VEHICLE_TYPES = [
  { value: "flatbed", label: "Flatbed" },
  { value: "wheel_lift", label: "Wheel Lift" },
  { value: "heavy_duty", label: "Heavy Duty" },
  { value: "medium_duty", label: "Medium Duty" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "other", label: "Other" },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  flatbed: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", border: "border-[#bfdbfe]" },
  wheel_lift: { bg: "bg-[#dcfce7]", text: "text-[#166534]", border: "border-[#bbf7d0]" },
  heavy_duty: { bg: "bg-[#fef3c7]", text: "text-[#92400e]", border: "border-[#fde68a]" },
  medium_duty: { bg: "bg-[#f3e8ff]", text: "text-[#7c3aed]", border: "border-[#e9d5ff]" },
  motorcycle: { bg: "bg-[#ffedd5]", text: "text-[#9a3412]", border: "border-[#fed7aa]" },
  other: { bg: "bg-[#f3f4f6]", text: "text-[#4b5563]", border: "border-[#e5e7eb]" },
};

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [assigningVehicle, setAssigningVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ name: "", type: "flatbed", make: "", model: "", year: "", licensePlate: "", color: "", capacityLbs: "" });

  const loadVehicles = () => fetch("/api/fleet").then(r => r.json()).then(d => setVehicles(d.vehicles || []));
  const loadDrivers = () => fetch("/api/drivers").then(r => r.json()).then(d => setDrivers(d.drivers || d || []));

  useEffect(() => { loadVehicles(); loadDrivers(); }, []);

  const addVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/fleet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ name: "", type: "flatbed", make: "", model: "", year: "", licensePlate: "", color: "", capacityLbs: "" }); loadVehicles(); }
  };

  const updateVehicle = async (id: string, updates: Partial<Vehicle>) => {
    await fetch("/api/fleet", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    loadVehicles();
  };

  const assignDriver = async (vehicleId: string, driverId: string | null) => {
    await fetch("/api/fleet", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: vehicleId, assignedDriverId: driverId || null }) });
    setAssigningVehicle(null);
    loadVehicles();
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return null;
    const d = drivers.find(d => d.id === driverId);
    return d ? `${d.firstName} ${d.lastName}` : null;
  };

  const getUnassignedDrivers = () => {
    const assignedIds = vehicles.filter(v => v.assignedDriverId).map(v => v.assignedDriverId);
    return drivers.filter(d => d.isActive && !assignedIds.includes(d.id));
  };

  const activeCount = vehicles.filter(v => v.isActive).length;
  const assignedCount = vehicles.filter(v => v.assignedDriverId).length;

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Fleet Management</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">
            {activeCount} active • {assignedCount} assigned • {vehicles.length} total
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
          + Add Vehicle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: vehicles.length, color: "#061b31" },
          { label: "Active", value: activeCount, color: "#15be53" },
          { label: "Assigned", value: assignedCount, color: "#533afd" },
          { label: "Unassigned", value: vehicles.length - assignedCount, color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#e5edf5] rounded-lg p-3">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider">{s.label}</div>
            <div className="text-[22px] font-light" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Vehicle Grid */}
      {vehicles.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[14px] text-[#64748d] mb-4">No vehicles yet. Add your first tow truck to get started.</div>
          <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4]">
            + Add First Vehicle
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map(v => {
            const tc = TYPE_COLORS[v.type] || TYPE_COLORS.other;
            const driverName = getDriverName(v.assignedDriverId);
            
            const copyVehicleInfo = () => {
              const info = `Vehicle: ${v.name}\nType: ${v.type.replace("_", " ")}\n${v.year ? `Year: ${v.year}\n` : ""}${v.make ? `Make: ${v.make}\n` : ""}${v.model ? `Model: ${v.model}\n` : ""}${v.licensePlate ? `License Plate: ${v.licensePlate}\n` : ""}${v.color ? `Color: ${v.color}\n` : ""}${v.mileage ? `Mileage: ${v.mileage.toLocaleString()} mi\n` : ""}${v.capacityLbs ? `Capacity: ${v.capacityLbs.toLocaleString()} lbs\n` : ""}Status: ${v.isActive ? "Active" : "Inactive"}\nAssigned Driver: ${driverName || "Unassigned"}\nID: ${v.id}`;
              navigator.clipboard.writeText(info);
            };

            return (
              <div key={v.id} className={`bg-white border rounded-lg overflow-hidden hover:shadow-[0_8px_24px_rgba(50,50,93,0.06)] transition-all ${!v.isActive ? "opacity-50 border-[#e5edf5]" : "border-[#e5edf5]"}`}>
                {/* Color accent bar */}
                <div className="h-1" style={{ background: v.color || "#533afd" }} />

                <div className="p-5">
                  {/* Top row: Name + Status + Copy */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-[15px] font-semibold text-[#061b31] tracking-[-0.2px]">{v.name}</div>
                      {(v.make || v.model || v.year) && (
                        <div className="text-[13px] text-[#64748d] mt-0.5">{v.year} {v.make} {v.model}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${v.isActive ? "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]" : "bg-[#f6f9fc] text-[#94a3b8] border-[#e5edf5]"}`}>
                        {v.isActive ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={copyVehicleInfo}
                        className="p-1.5 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd] transition-colors"
                        title="Copy vehicle details"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Vehicle details with copy buttons */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${tc.bg} ${tc.text} ${tc.border}`}>
                        {v.type.replace("_", " ")}
                      </span>
                      {v.color && <span className="text-[12px] text-[#64748d]">{v.color}</span>}
                    </div>
                    {v.licensePlate && (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#64748d]">Plate:</span>
                        <span className="font-mono text-[#061b31] flex-1 truncate">{v.licensePlate}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(v.licensePlate || "")}
                          className="text-[9px] px-1.5 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd]"
                          title="Copy plate"
                        >
                          📋
                        </button>
                      </div>
                    )}
                    {v.mileage && (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#64748d]">Mileage:</span>
                        <span className="font-mono text-[#061b31]">{v.mileage.toLocaleString()} mi</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(String(v.mileage))}
                          className="text-[9px] px-1.5 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd]"
                          title="Copy mileage"
                        >
                          📋
                        </button>
                      </div>
                    )}
                    {v.capacityLbs && (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#64748d]">Capacity:</span>
                        <span className="font-mono text-[#061b31]">{v.capacityLbs.toLocaleString()} lbs</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(String(v.capacityLbs))}
                          className="text-[9px] px-1.5 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd]"
                          title="Copy capacity"
                        >
                          📋
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Assigned Driver */}
                  <div className="pt-3 border-t border-[#e5edf5]">
                    {driverName ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[11px] font-medium text-[#533afd]">
                            {driverName.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <div className="text-[12px] font-medium text-[#061b31]">{driverName}</div>
                            <div className="text-[10px] text-[#64748d]">Assigned driver</div>
                          </div>
                        </div>
                        <button
                          onClick={() => assignDriver(v.id, null)}
                          className="text-[11px] text-[#991b1b] hover:underline"
                        >
                          Unassign
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssigningVehicle(v)}
                        className="w-full py-2 border border-dashed border-[#e5edf5] rounded text-[12px] text-[#64748d] hover:border-[#533afd] hover:text-[#533afd] transition-colors"
                      >
                        + Assign Driver
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => updateVehicle(v.id, { isActive: !v.isActive })}
                      className="flex-1 text-[11px] font-medium py-1.5 rounded border border-[#e5edf5] hover:bg-[#f6f9fc] transition-colors"
                    >
                      {v.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => { setEditingVehicle(v); setForm({ name: v.name, type: v.type, make: v.make || "", model: v.model || "", year: String(v.year || ""), licensePlate: v.licensePlate || "", color: v.color || "", capacityLbs: String(v.capacityLbs || "") }); setShowAdd(true); }}
                      className="flex-1 text-[11px] font-medium py-1.5 rounded border border-[#e5edf5] hover:bg-[#f6f9fc] transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Driver Modal */}
      {assigningVehicle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setAssigningVehicle(null)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold mb-1">Assign Driver</h3>
            <p className="text-[13px] text-[#64748d] mb-4">Select a driver for <strong>{assigningVehicle.name}</strong></p>

            {drivers.filter(d => d.isActive).length === 0 ? (
              <div className="text-center py-6">
                <div className="text-[13px] text-[#64748d]">No active drivers available</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {drivers.filter(d => d.isActive).map(d => {
                  const isAssigned = vehicles.some(v => v.assignedDriverId === d.id && v.id !== assigningVehicle.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => !isAssigned && assignDriver(assigningVehicle.id, d.id)}
                      disabled={isAssigned}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isAssigned
                          ? "border-[#e5edf5] bg-[#f6f9fc] opacity-50 cursor-not-allowed"
                          : "border-[#e5edf5] hover:border-[#533afd] hover:bg-[#533afd]/[0.02] cursor-pointer"
                      }`}
                    >
                      <div className="w-9 h-9 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[12px] font-medium text-[#533afd]">
                        {d.firstName[0]}{d.lastName[0]}
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-[13px] font-medium">{d.firstName} {d.lastName}</div>
                        <div className="text-[11px] text-[#64748d]">{d.email}</div>
                      </div>
                      {isAssigned && (
                        <span className="text-[10px] text-[#94a3b8]">Already assigned</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <button onClick={() => setAssigningVehicle(null)} className="w-full mt-4 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Vehicle Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowAdd(false); setEditingVehicle(null); }}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px] mb-6">{editingVehicle ? "Edit Vehicle" : "Add Vehicle"}</h2>
            <form onSubmit={editingVehicle ? (e) => { e.preventDefault(); updateVehicle(editingVehicle.id, form as any); setShowAdd(false); setEditingVehicle(null); } : addVehicle} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" placeholder="e.g. Truck #1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none">
                    {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
                <button type="button" onClick={() => { setShowAdd(false); setEditingVehicle(null); }} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">{editingVehicle ? "Save Changes" : "Add Vehicle"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}