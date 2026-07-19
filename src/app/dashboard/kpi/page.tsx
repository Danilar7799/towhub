"use client";

import { useState, useEffect } from "react";

interface DriverKPI {
  id: string; name: string; email: string;
  totalTrips: number; totalRevenue: number; totalMiles: number;
  avgTripMinutes: number; avgRevenuePerTrip: number;
  reviewsRequested: number; reviewsReceived: number; qcScore: number | null;
}

export default function DriverKPIPage() {
  const [drivers, setDrivers] = useState<DriverKPI[]>([]);
  const [totals, setTotals] = useState({ totalTrips: 0, totalRevenue: 0, totalMiles: 0, activeDrivers: 0 });
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    fetch(`/api/drivers/kpi?period=${period}`).then(r => r.json()).then(d => {
      setDrivers(d.drivers || []);
      setTotals(d.totals || {});
    });
  }, [period]);

  const maxRevenue = Math.max(...drivers.map(d => d.totalRevenue), 1);

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-[20px] font-semibold tracking-[-0.3px]">Driver KPI Leaderboard</h2><p className="text-[13px] text-[#64748d] mt-0.5">Performance metrics and rankings</p></div>
        <div className="flex gap-2">
          {["week", "month", "all"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded text-[12px] font-medium capitalize ${period === p ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Total Trips</div><div className="text-[28px] font-light">{totals.totalTrips}</div></div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Total Revenue</div><div className="text-[28px] font-light">${(totals.totalRevenue || 0).toFixed(0)}</div></div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Total Miles</div><div className="text-[28px] font-light">{(totals.totalMiles || 0).toLocaleString()}</div></div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Active Drivers</div><div className="text-[28px] font-light">{totals.activeDrivers}</div></div>
      </div>

      {/* Leaderboard */}
      {drivers.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">🏆</div>
          <div className="text-[14px] text-[#64748d]">No driver data yet. Complete some jobs to see KPIs.</div>
        </div>
      ) : (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>
                {["#", "Driver", "Trips", "Revenue", "Miles", "Avg Trip", "Avg $/Trip", "Reviews", "QC"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {drivers.map((d, i) => (
                <tr key={d.id} className="hover:bg-[#f6f9fc]">
                  <td className="px-4 py-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${i === 0 ? "bg-[#f59e0b] text-white" : i === 1 ? "bg-[#94a3b8] text-white" : i === 2 ? "bg-[#cd7f32] text-white" : "bg-[#f6f9fc] text-[#64748d]"}`}>
                      {i + 1}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium">{d.name}</div>
                    <div className="text-[11px] text-[#64748d]">{d.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[14px] font-medium">{d.totalTrips}</td>
                  <td className="px-4 py-3">
                    <div className="text-[14px] font-medium">${d.totalRevenue.toFixed(0)}</div>
                    <div className="w-full bg-[#f6f9fc] rounded-full h-1.5 mt-1">
                      <div className="bg-[#533afd] h-1.5 rounded-full" style={{ width: `${(d.totalRevenue / maxRevenue) * 100}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px]">{d.totalMiles.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[13px]">{d.avgTripMinutes}min</td>
                  <td className="px-4 py-3 text-[13px] font-medium">${d.avgRevenuePerTrip}</td>
                  <td className="px-4 py-3 text-[13px]">{d.reviewsRequested}/{d.reviewsReceived}</td>
                  <td className="px-4 py-3">
                    {d.qcScore !== null ? (
                      <span className={`text-[12px] font-medium ${d.qcScore >= 4 ? "text-[#15be53]" : d.qcScore >= 3 ? "text-[#f59e0b]" : "text-[#dc2626]"}`}>
                        {d.qcScore}/5
                      </span>
                    ) : <span className="text-[12px] text-[#94a3b8]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
