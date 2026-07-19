"use client";

import { useState, useEffect } from "react";

export default function EarningsPage() {
  const [jobs, setJobs] = useState<{ id: string; status: string; totalAmount?: number; completedAt?: string; createdAt: string; assignedDriverId?: string }[]>([]);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Earnings</h1>
        <div className="flex gap-2">
          {["today", "week", "month", "all"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${period === p ? "bg-blue-900 text-white" : "bg-white border"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-6">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-3xl font-black text-green-600">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="text-sm text-gray-500">Completed Jobs</div>
          <div className="text-3xl font-black">{filtered.length}</div>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="text-sm text-gray-500">Avg per Job</div>
          <div className="text-3xl font-black">${avgJob.toFixed(2)}</div>
        </div>
      </div>

      {/* Revenue chart placeholder */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-4">Revenue Trend</h2>
        <div className="bg-gray-50 rounded-lg h-64 flex items-center justify-center text-gray-400">
          📊 Chart coming soon — will show daily/weekly/monthly revenue trends
        </div>
      </div>

      {/* Completed jobs table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b font-bold">Completed Jobs</div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No completed jobs in this period.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Job ID</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(j => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">{new Date(j.completedAt || j.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-mono text-sm">{j.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">${(j.totalAmount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
