"use client";

import { useState, useEffect } from "react";

interface ImpoundVehicle {
  id: string; vehicleMake?: string; vehicleModel?: string; vehicleYear?: number; vehicleColor?: string;
  vehiclePlate?: string; ownerName?: string; ownerPhone?: string; lotSpot?: string;
  dailyRate: number; status: string; storedAt: string; totalCharges: number;
}

export default function ImpoundPage() {
  const [vehicles, setVehicles] = useState<ImpoundVehicle[]>([]);
  const [filter, setFilter] = useState("stored");

  const load = () => fetch(`/api/impound?status=${filter}`).then(r => r.json()).then(d => setVehicles(d.vehicles || []));
  useEffect(() => { load(); }, [filter]);

  const release = async (id: string) => {
    if (!confirm("Release this vehicle? Charges will be calculated automatically.")) return;
    await fetch("/api/impound", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "released" }) });
    load();
  };

  const totalCharges = vehicles.reduce((s, v) => s + v.totalCharges, 0);

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Impound Lot</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Track stored vehicles and manage releases</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["stored", "released", "all"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded text-[12px] font-medium capitalize ${filter === f ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>{f}</button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Stored</div><div className="text-[28px] font-light">{vehicles.filter(v => v.status === "stored").length}</div></div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Total Charges</div><div className="text-[28px] font-light">${totalCharges.toFixed(0)}</div></div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Avg Stay</div><div className="text-[28px] font-light">{vehicles.length > 0 ? Math.round(vehicles.filter(v => v.status === "stored").reduce((s, v) => s + Math.ceil((Date.now() - new Date(v.storedAt).getTime()) / 86400000), 0) / Math.max(vehicles.filter(v => v.status === "stored").length, 1)) : 0} days</div></div>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">🅿️</div>
          <div className="text-[14px] text-[#64748d]">No {filter} vehicles.</div>
        </div>
      ) : (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>{["Vehicle", "Plate", "Owner", "Spot", "Rate/Day", "Stored", "Charges", "Actions"].map(h => <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {vehicles.map(v => {
                const days = Math.ceil((Date.now() - new Date(v.storedAt).getTime()) / 86400000);
                return (
                  <tr key={v.id} className="hover:bg-[#f6f9fc]">
                    <td className="px-4 py-2.5 text-[13px] font-medium">{v.vehicleYear} {v.vehicleMake} {v.vehicleModel} {v.vehicleColor && `(${v.vehicleColor})`}</td>
                    <td className="px-4 py-2.5 text-[13px] font-mono">{v.vehiclePlate || "—"}</td>
                    <td className="px-4 py-2.5 text-[13px] text-[#64748d]">{v.ownerName || "—"}</td>
                    <td className="px-4 py-2.5 text-[13px]">{v.lotSpot || "—"}</td>
                    <td className="px-4 py-2.5 text-[13px]">${v.dailyRate}</td>
                    <td className="px-4 py-2.5 text-[13px] text-[#64748d]">{new Date(v.storedAt).toLocaleDateString()} ({days}d)</td>
                    <td className="px-4 py-2.5 text-[13px] font-medium">${(v.totalCharges || days * v.dailyRate).toFixed(0)}</td>
                    <td className="px-4 py-2.5">{v.status === "stored" && <button onClick={() => release(v.id)} className="text-[12px] text-[#15be53] font-medium">Release</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
