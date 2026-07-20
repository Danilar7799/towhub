"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface FuelEntry {
  id: string;
  vehicleId: string;
  vehicleName: string;
  driverId: string;
  driverName: string;
  date: string;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  mileage: number;
  mpg?: number; // calculated from previous entry
  station?: string;
}

export default function FuelPage() {
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ vehicleId: "", gallons: "", pricePerGallon: "", mileage: "", station: "", date: "" });

  useEffect(() => {
    fetch("/api/fleet").then(r => r.json()).then(d => setVehicles((d.vehicles || []).map((v: { id: string; name: string }) => ({ id: v.id, name: v.name }))));
  }, []);

  const totalGallons = entries.reduce((s, e) => s + e.gallons, 0);
  const totalCost = entries.reduce((s, e) => s + e.totalCost, 0);
  const avgMPG = entries.filter(e => e.mpg).reduce((s, e, _, a) => s + (e.mpg || 0) / a.length, 0);
  const avgPricePerGallon = totalGallons > 0 ? totalCost / totalGallons : 0;

  // Cost per mile analysis
  const totalMiles = entries.length > 1 ? entries[entries.length - 1].mileage - entries[0].mileage : 0;
  const costPerMile = totalMiles > 0 ? totalCost / totalMiles : 0;

  // Monthly trend data
  const monthlyData = entries.reduce((acc, e) => {
    const month = e.date.slice(0, 7);
    const existing = acc.find(m => m.month === month);
    if (existing) {
      existing.cost += e.totalCost;
      existing.gallons += e.gallons;
      existing.entries++;
    } else {
      acc.push({ month, cost: e.totalCost, gallons: e.gallons, entries: 1 });
    }
    return acc;
  }, [] as { month: string; cost: number; gallons: number; entries: number }[]);

  const addEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicleName = vehicles.find(v => v.id === form.vehicleId)?.name || "Unknown";
    const gallons = parseFloat(form.gallons);
    const ppg = parseFloat(form.pricePerGallon);
    const newEntry: FuelEntry = {
      id: `fuel-${Date.now()}`,
      vehicleId: form.vehicleId,
      vehicleName,
      driverId: "",
      driverName: "",
      date: form.date || new Date().toISOString().slice(0, 10),
      gallons,
      pricePerGallon: ppg,
      totalCost: gallons * ppg,
      mileage: parseInt(form.mileage),
      station: form.station || undefined,
    };
    // Calculate MPG if we have a previous entry for this vehicle
    const prevEntries = entries.filter(e => e.vehicleId === form.vehicleId).sort((a, b) => b.mileage - a.mileage);
    if (prevEntries.length > 0) {
      const milesSince = newEntry.mileage - prevEntries[0].mileage;
      if (milesSince > 0) newEntry.mpg = milesSince / gallons;
    }
    setEntries(prev => [...prev, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setShowAdd(false);
    setForm({ vehicleId: "", gallons: "", pricePerGallon: "", mileage: "", station: "", date: "" });
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Fuel Tracking</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Monitor fuel costs, MPG, and efficiency</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">+ Log Fill-Up</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Cost", value: `$${totalCost.toFixed(0)}`, accent: "#061b31" },
          { label: "Total Gallons", value: `${totalGallons.toFixed(0)} gal`, accent: "#533afd" },
          { label: "Avg MPG", value: `${avgMPG.toFixed(1)} mpg`, accent: "#15be53" },
          { label: "Cost/Mile", value: `$${costPerMile.toFixed(2)}`, accent: "#f59e0b" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-[28px] font-light tracking-[-0.5px]" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {entries.length > 2 && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[14px] font-medium text-[#061b31] mb-4">Monthly Fuel Cost</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5edf5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748d" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748d" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={({ active, payload, label }) => active && payload?.[0] ? (
                  <div className="bg-white border border-[#e5edf5] rounded-lg px-3 py-2 shadow">
                    <div className="text-[11px] text-[#64748d]">{label}</div>
                    <div className="text-[13px] font-medium">${Number(payload[0].value).toFixed(0)}</div>
                  </div>
                ) : null} />
                <Bar dataKey="cost" fill="#533afd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[14px] font-medium text-[#061b31] mb-4">MPG Trend</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={entries.filter(e => e.mpg).map(e => ({ date: e.date.slice(5), mpg: e.mpg, vehicle: e.vehicleName }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5edf5" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748d" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748d" }} axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload }) => active && payload?.[0] ? (
                  <div className="bg-white border border-[#e5edf5] rounded-lg px-3 py-2 shadow">
                    <div className="text-[13px] font-medium">{Number(payload[0].value).toFixed(1)} mpg</div>
                  </div>
                ) : null} />
                <Line type="monotone" dataKey="mpg" stroke="#15be53" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">⛽</div>
          <div className="text-[14px] text-[#64748d]">No fuel entries yet</div>
          <div className="text-[12px] text-[#94a3b8] mt-1">Log fill-ups to track MPG and fuel costs</div>
        </div>
      ) : (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>{["Date", "Vehicle", "Gallons", "$/Gal", "Total", "Mileage", "MPG", "Station"].map(h =>
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {entries.slice().reverse().map(e => (
                <tr key={e.id} className="hover:bg-[#f6f9fc]">
                  <td className="px-4 py-3 text-[12px]">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-[13px] font-medium">{e.vehicleName}</td>
                  <td className="px-4 py-3 text-[13px]">{e.gallons.toFixed(1)}</td>
                  <td className="px-4 py-3 text-[13px]">${e.pricePerGallon.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[13px] font-medium">${e.totalCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[12px]">{e.mileage.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px] font-medium" style={{ color: e.mpg && e.mpg > 10 ? "#15be53" : e.mpg ? "#f59e0b" : "#94a3b8" }}>
                    {e.mpg ? e.mpg.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#64748d]">{e.station || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[18px] font-semibold tracking-[-0.3px] mb-5">Log Fill-Up</h2>
            <form onSubmit={addEntry} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Vehicle *</label>
                <select required value={form.vehicleId} onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none">
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Gallons *</label><input required type="number" step="0.1" value={form.gallons} onChange={e => setForm(f => ({ ...f, gallons: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Price/Gallon *</label><input required type="number" step="0.01" value={form.pricePerGallon} onChange={e => setForm(f => ({ ...f, pricePerGallon: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Odometer *</label><input required type="number" value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Station</label><input value={form.station} onChange={e => setForm(f => ({ ...f, station: e.target.value }))} placeholder="e.g. Shell, Chevron" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
