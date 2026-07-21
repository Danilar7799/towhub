"use client";

import { useState, useEffect, useRef } from "react";

interface Job {
  id: string; status: string; customerName?: string; pickupAddress: string; destinationAddress?: string;
  totalAmount?: number; assignedDriverId?: string; source: string; createdAt: string;
  towVehicleMake?: string; towVehicleModel?: string; towVehicleYear?: number;
}

interface Driver {
  id: string; firstName: string; lastName: string; email: string;
}

const COLUMNS = [
  { id: "pending", label: "New", icon: "📥", color: "#f59e0b", bg: "#fef3c7" },
  { id: "assigned", label: "Assigned", icon: "👤", color: "#3b82f6", bg: "#dbeafe" },
  { id: "en_route", label: "En Route", icon: "🚗", color: "#6366f1", bg: "#e0e7ff" },
  { id: "on_scene", label: "On Scene", icon: "📍", color: "#a855f7", bg: "#f3e8ff" },
  { id: "towing", label: "Towing", icon: "🚛", color: "#f97316", bg: "#ffedd5" },
  { id: "completed", label: "Completed", icon: "✅", color: "#15be53", bg: "#dcfce7" },
];

export default function KanbanPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [draggedJob, setDraggedJob] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [assigningJob, setAssigningJob] = useState<string | null>(null);
  const [filterDriver, setFilterDriver] = useState<string>("all");

  const load = async () => {
    try {
      const [jobsRes, driversRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/drivers"),
      ]);
      const jobsData = await jobsRes.json();
      const driversData = await driversRes.json();
      setJobs(jobsData.jobs || []);
      setDrivers(driversData.drivers || driversData || []);
    } catch (e) {}
  };

  useEffect(() => { load(); }, []);

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    await fetch("/api/jobs", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: jobId, status: newStatus }),
    });
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
  };

  const assignDriver = async (jobId: string, driverId: string) => {
    await fetch("/api/jobs", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: jobId, assignedDriverId: driverId, status: "assigned" }),
    });
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, assignedDriverId: driverId, status: "assigned" } : j));
    setAssigningJob(null);
  };

  const autoAssign = async (jobId: string) => {
    try {
      const res = await fetch("/api/dispatch/auto-assign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (data.ok) load();
    } catch {}
  };

  const onDragStart = (jobId: string) => setDraggedJob(jobId);
  const onDragOver = (e: React.DragEvent, colId: string) => { e.preventDefault(); setDragOverCol(colId); };
  const onDragLeave = () => setDragOverCol(null);
  const onDrop = (colId: string) => {
    if (draggedJob) updateJobStatus(draggedJob, colId);
    setDraggedJob(null);
    setDragOverCol(null);
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return null;
    const d = drivers.find(d => d.id === driverId);
    return d ? `${d.firstName} ${d.lastName}` : null;
  };

  const getJobsForColumn = (colId: string) => {
    let colJobs = jobs.filter(j => j.status === colId);
    if (filterDriver !== "all") colJobs = colJobs.filter(j => j.assignedDriverId === filterDriver);
    return colJobs;
  };

  const totalRevenue = jobs.filter(j => j.status === "completed").reduce((s, j) => s + (j.totalAmount || 0), 0);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Dispatch Board</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">{jobs.length} jobs • ${totalRevenue.toFixed(0)} completed revenue</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Driver filter */}
          <select value={filterDriver} onChange={e => setFilterDriver(e.target.value)}
            className="px-3 py-1.5 border border-[#e5edf5] rounded text-[12px] bg-white outline-none">
            <option value="all">All Drivers</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
          </select>
          <button onClick={load} className="px-3 py-1.5 border border-[#e5edf5] rounded text-[12px] text-[#64748d] hover:bg-[#f6f9fc]">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-3 overflow-x-auto pb-3">
        {COLUMNS.map(col => {
          const colJobs = getJobsForColumn(col.id);
          const isOver = dragOverCol === col.id;
          const colRevenue = colJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
          return (
            <div key={col.id}
              className="flex-1 min-w-[250px] max-w-[320px] flex flex-col rounded-xl transition-all"
              style={{ backgroundColor: isOver ? col.bg : "#f6f9fc", border: isOver ? `2px dashed ${col.color}` : "2px solid transparent" }}
              onDragOver={e => onDragOver(e, col.id)} onDragLeave={onDragLeave} onDrop={() => onDrop(col.id)}>
              {/* Column header */}
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">{col.icon}</span>
                  <span className="text-[13px] font-semibold" style={{ color: col.color }}>{col.label}</span>
                  <span className="text-[11px] text-[#94a3b8] bg-white px-1.5 py-0.5 rounded-full">{colJobs.length}</span>
                </div>
                {colRevenue > 0 && <span className="text-[11px] font-medium" style={{ color: col.color }}>${colRevenue.toFixed(0)}</span>}
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {colJobs.map(job => (
                  <div key={job.id} draggable onDragStart={() => onDragStart(job.id)}
                    className="bg-white rounded-lg border border-[#e5edf5] p-3 cursor-grab active:cursor-grabbing hover:shadow-[0_4px_12px_rgba(50,50,93,0.06)] transition-all">
                    {/* Customer + amount */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-[#061b31] truncate">{job.customerName || "Walk-in"}</span>
                      {job.totalAmount && <span className="text-[13px] font-semibold" style={{ color: col.color }}>${job.totalAmount.toFixed(0)}</span>}
                    </div>

                    {/* Vehicle */}
                    {job.towVehicleMake && (
                      <div className="text-[11px] text-[#94a3b8] mb-1.5">{job.towVehicleYear} {job.towVehicleMake} {job.towVehicleModel}</div>
                    )}

                    {/* Address */}
                    <div className="flex items-start gap-1.5 mb-2">
                      <div className="flex flex-col items-center gap-0 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                        <div className="w-px h-3 bg-[#e5edf5]" />
                        {job.destinationAddress && <div className="w-1.5 h-1.5 rounded-full bg-[#15be53]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] text-[#64748d] truncate">{job.pickupAddress}</div>
                        {job.destinationAddress && <div className="text-[11px] text-[#94a3b8] truncate">{job.destinationAddress}</div>}
                      </div>
                    </div>

                    {/* Driver assignment */}
                    <div className="flex items-center gap-1.5">
                      {job.assignedDriverId ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-[#533afd] flex items-center justify-center shrink-0">
                            <span className="text-[9px] text-white font-bold">{getDriverName(job.assignedDriverId)?.[0]}</span>
                          </div>
                          <span className="text-[11px] text-[#64748d] truncate">{getDriverName(job.assignedDriverId)}</span>
                        </div>
                      ) : (
                        <div className="flex gap-1.5 flex-1">
                          <button onClick={() => setAssigningJob(job.id)}
                            className="text-[10px] px-2 py-1 border border-[#e5edf5] rounded text-[#64748d] hover:bg-[#f6f9fc] hover:border-[#b9b9f9]">
                            + Assign
                          </button>
                          {col.id === "pending" && (
                            <button onClick={() => autoAssign(job.id)}
                              className="text-[10px] px-2 py-1 bg-[#533afd] text-white rounded hover:bg-[#4434d4]">
                              🤖 Auto
                            </button>
                          )}
                        </div>
                      )}
                      <span className="text-[10px] text-[#94a3b8] shrink-0">{job.source}</span>
                    </div>
                  </div>
                ))}

                {colJobs.length === 0 && (
                  <div className="text-center py-6 text-[12px] text-[#94a3b8]">
                    {isOver ? "Drop here" : "No jobs"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Driver Assignment Modal */}
      {assigningJob && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setAssigningJob(null)}>
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold mb-4">Assign Driver</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {drivers.map(d => (
                <button key={d.id} onClick={() => assignDriver(assigningJob, d.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-[#e5edf5] hover:border-[#533afd] hover:bg-[#f6f9fc] transition-all text-left">
                  <div className="w-8 h-8 rounded-full bg-[#533afd] flex items-center justify-center">
                    <span className="text-[13px] text-white font-bold">{d.firstName[0]}{d.lastName[0]}</span>
                  </div>
                  <div>
                    <div className="text-[13px] font-medium">{d.firstName} {d.lastName}</div>
                    <div className="text-[11px] text-[#94a3b8]">{d.email}</div>
                  </div>
                </button>
              ))}
              {drivers.length === 0 && <div className="text-[13px] text-[#94a3b8] text-center py-4">No drivers available</div>}
            </div>
            <button onClick={() => setAssigningJob(null)} className="w-full mt-4 py-2 border border-[#e5edf5] rounded text-[13px] text-[#64748d]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
