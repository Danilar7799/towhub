"use client";

import { useState, useEffect } from "react";

interface CallLog { id: string; callerPhone: string; callerName?: string; duration: number; status: string; jobId?: string; transcript?: string; createdAt: string; }

export default function CallLogsPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [stats, setStats] = useState({ total: 0, avgDuration: 0, convertedToJob: 0 });

  useEffect(() => {
    fetch("/api/calls").then(r => r.json()).then(d => {
      setCalls(d.calls || []);
      setStats(d.stats || {});
    });
  }, []);

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div><h2 className="text-[20px] font-semibold tracking-[-0.3px]">Call Logs</h2><p className="text-[13px] text-[#64748d] mt-0.5">Incoming call history from AI dispatcher and phone</p></div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Total Calls</div><div className="text-[28px] font-light">{stats.total}</div></div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Avg Duration</div><div className="text-[28px] font-light">{Math.round(stats.avgDuration / 60)}min</div></div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Converted to Job</div><div className="text-[28px] font-light">{stats.convertedToJob}</div></div>
      </div>

      {calls.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">📞</div>
          <div className="text-[14px] text-[#64748d]">No calls logged yet. Calls from Bland.ai will appear here.</div>
        </div>
      ) : (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>{["Caller", "Duration", "Status", "Job", "Date", "Transcript"].map(h => <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {calls.map(c => (
                <tr key={c.id} className="hover:bg-[#f6f9fc]">
                  <td className="px-4 py-3"><div className="text-[13px] font-medium">{c.callerName || "Unknown"}</div><div className="text-[12px] text-[#64748d]">{c.callerPhone}</div></td>
                  <td className="px-4 py-3 text-[13px]">{Math.floor(c.duration / 60)}:{String(c.duration % 60).padStart(2, "0")}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${c.status === "completed" ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fef3c7] text-[#92400e]"}`}>{c.status}</span></td>
                  <td className="px-4 py-3 text-[12px]">{c.jobId ? <span className="text-[#533afd]">#{c.jobId.slice(0, 8)}</span> : "—"}</td>
                  <td className="px-4 py-3 text-[12px] text-[#64748d]">{new Date(c.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[12px] text-[#64748d] max-w-[200px] truncate">{c.transcript || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
