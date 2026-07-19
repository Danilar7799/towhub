"use client";

import { useState, useEffect } from "react";

export default function EarningsPage() {
  const [jobs, setJobs] = useState<{ id: string; status: string; totalAmount?: number; completedAt?: string; createdAt: string; assignedDriverId?: string; customerName?: string }[]>([]);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    fetch("/api/jobs").then(r => r.json()).then(d => setJobs(d.jobs || []));
  }, []);

  const completed = jobs.filter(j => j.status === "completed");
  const now = new Date();
  const filtered = period === "all" ? completed :
    period === "today" ? completed.filter(j => new Date(j.completedAt || j.createdAt).toDateString() === now.toDateString()) :
    period === "week" ? completed.filter(j => { const d = new Date(j.completedAt || j.createdAt); return (now.getTime() - d.getTime()) < 7 * 86400000; }) :
    completed.filter(j => { const d = new Date(j.completedAt || j.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });

  const totalRevenue = filtered.reduce((s, j) => s + (j.totalAmount || 0), 0);
  const avgJob = filtered.length > 0 ? totalRevenue / filtered.length : 0;
  const highestJob = filtered.length > 0 ? Math.max(...filtered.map(j => j.totalAmount || 0)) : 0;

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Earnings</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Track revenue from completed jobs</p>
        </div>
        <div className="flex gap-1.5">
          {["today", "week", "month", "all"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium capitalize ${period === p ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toFixed(0)}`, accent: "#15be53" },
          { label: "Completed Jobs", value: filtered.length, accent: "#061b31" },
          { label: "Avg per Job", value: `$${avgJob.toFixed(0)}`, accent: "#533afd" },
          { label: "Highest Job", value: `$${highestJob.toFixed(0)}`, accent: "#061b31" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-[28px] font-light tracking-[-0.5px]" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart placeholder */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-4">Revenue Trend</div>
        <div className="bg-[#f6f9fc] rounded-lg h-[200px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-[24px] mb-2 opacity-30">📊</div>
            <div className="text-[13px] text-[#64748d]">Revenue trend chart</div>
            <div className="text-[12px] text-[#94a3b8]">Will show daily/weekly/monthly revenue</div>
          </div>
        </div>
      </div>

      {/* Completed jobs table */}
      <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center justify-between">
          <div className="text-[14px] font-medium text-[#061b31]">Completed Jobs</div>
          <div className="text-[12px] text-[#64748d]">{filtered.length} jobs</div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-[32px] mb-3 opacity-30">💰</div>
            <div className="text-[14px] text-[#64748d]">No completed jobs in this period.</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>
                {["Date", "Customer", "Job ID", "Amount"].map(h => (
                  <th key={h} className={`text-left px-5 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider ${h === "Amount" ? "!text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {filtered.map(j => (
                <tr key={j.id} className="hover:bg-[#f6f9fc]">
                  <td className="px-5 py-3 text-[13px] text-[#64748d]">{new Date(j.completedAt || j.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="px-5 py-3 text-[13px] font-medium text-[#061b31]">{j.customerName || "Walk-in"}</td>
                  <td className="px-5 py-3 text-[13px] font-mono text-[#64748d]">{j.id.slice(0, 8)}</td>
                  <td className="px-5 py-3 text-[14px] font-semibold text-right">${(j.totalAmount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
