"use client";

import { useState, useEffect } from "react";

interface Shift {
  id: string; driverId: string; vehicleId?: string;
  startedAt: string; endedAt?: string;
  startMileage?: number; endMileage?: number;
  totalEarnings?: number; totalJobs?: number; notes?: string;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [startMileage, setStartMileage] = useState("");
  const [endMileage, setEndMileage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch("/api/shifts").then(r => r.json()).then(d => {
      const all = d.shifts || [];
      setShifts(all);
      setActiveShift(all.find((s: Shift) => !s.endedAt) || null);
    });
    fetch("/api/fleet").then(r => r.json()).then(d => setVehicles((d.vehicles || []).map((v: { id: string; name: string }) => ({ id: v.id, name: v.name }))));
  };
  useEffect(() => { load(); }, []);

  const startShift = async () => {
    setLoading(true);
    const res = await fetch("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vehicleId, startMileage }) });
    const data = await res.json();
    if (data.shift) { setShowStart(false); setVehicleId(""); setStartMileage(""); load(); }
    setLoading(false);
  };

  const endShift = async () => {
    if (!activeShift) return;
    setLoading(true);
    const res = await fetch("/api/shifts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shiftId: activeShift.id, endMileage }) });
    const data = await res.json();
    if (data.shift) { setEndMileage(""); load(); }
    setLoading(false);
  };

  const fmtDuration = (start: string, end?: string) => {
    const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const totalHours = shifts.filter(s => s.endedAt).reduce((sum, s) => sum + (new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime()) / 3600000, 0);
  const totalEarnings = shifts.reduce((sum, s) => sum + (s.totalEarnings || 0), 0);
  const totalMiles = shifts.filter(s => s.endMileage && s.startMileage).reduce((sum, s) => sum + ((s.endMileage || 0) - (s.startMileage || 0)), 0);

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Shift Management</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Clock in/out and track your work hours</p>
        </div>
        {!activeShift ? (
          <button onClick={() => setShowStart(true)} className="bg-[#15be53] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#12a347]">
            ▶️ Start Shift
          </button>
        ) : (
          <button onClick={endShift} disabled={loading} className="bg-[#dc2626] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#b91c1c]">
            🛑 End Shift
          </button>
        )}
      </div>

      {/* Active shift banner */}
      {activeShift && (
        <div className="bg-[#dcfce7] border border-[#bbf7d0] rounded-lg p-5 flex items-center gap-4">
          <div className="w-3 h-3 bg-[#15be53] rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="text-[14px] font-semibold text-[#166534]">Shift Active</div>
            <div className="text-[12px] text-[#166534]">
              Started {new Date(activeShift.startedAt).toLocaleTimeString()} • {fmtDuration(activeShift.startedAt)} elapsed
            </div>
          </div>
          <div className="text-right">
            <input value={endMileage} onChange={e => setEndMileage(e.target.value)} placeholder="End mileage"
              className="px-3 py-1.5 border border-[#bbf7d0] rounded text-[12px] w-32 focus:border-[#15be53] outline-none" />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, accent: "#533afd" },
          { label: "Total Earnings", value: `$${totalEarnings.toFixed(0)}`, accent: "#15be53" },
          { label: "Total Miles", value: `${totalMiles.toLocaleString()} mi`, accent: "#061b31" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-[28px] font-light tracking-[-0.5px]" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Shift history */}
      <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e5edf5]">
          <div className="text-[13px] font-medium text-[#061b31]">Shift History</div>
        </div>
        {shifts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-[32px] mb-3 opacity-30">⏰</div>
            <div className="text-[14px] text-[#64748d]">No shifts yet. Start your first shift!</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>{["Date", "Start", "End", "Duration", "Miles", "Earnings"].map(h =>
                <th key={h} className="text-left px-5 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
              )}</tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {shifts.slice(0, 20).map(s => {
                const miles = s.endMileage && s.startMileage ? s.endMileage - s.startMileage : null;
                return (
                  <tr key={s.id} className="hover:bg-[#f6f9fc]">
                    <td className="px-5 py-3 text-[13px]">{new Date(s.startedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-[13px]">{new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-5 py-3 text-[13px]">{s.endedAt ? new Date(s.endedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : <span className="text-[#15be53] font-medium">Active</span>}</td>
                    <td className="px-5 py-3 text-[13px]">{fmtDuration(s.startedAt, s.endedAt)}</td>
                    <td className="px-5 py-3 text-[13px]">{miles !== null ? `${miles} mi` : "—"}</td>
                    <td className="px-5 py-3 text-[13px] font-medium">{s.totalEarnings ? `$${s.totalEarnings.toFixed(0)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Start Shift Modal */}
      {showStart && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowStart(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[18px] font-semibold tracking-[-0.3px] mb-5">Start Shift</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Vehicle</label>
                <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none">
                  <option value="">Select vehicle (optional)</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Starting Mileage</label>
                <input value={startMileage} onChange={e => setStartMileage(e.target.value)} type="number" placeholder="e.g. 45000"
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowStart(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium">Cancel</button>
                <button onClick={startShift} disabled={loading} className="flex-1 bg-[#15be53] text-white py-2.5 rounded text-[13px] font-medium disabled:opacity-50">
                  {loading ? "Starting..." : "▶️ Start Shift"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
