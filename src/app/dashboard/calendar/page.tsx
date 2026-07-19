"use client";

import { useState, useEffect } from "react";

interface Job {
  id: string; status: string; source: string; customerName?: string; customerPhone?: string;
  pickupAddress: string; destinationAddress?: string; totalAmount?: number;
  assignedDriverId?: string; createdAt: string; completedAt?: string; assignedAt?: string;
  towVehicleMake?: string; towVehicleModel?: string; towVehicleYear?: number; notes?: string;
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [calendar, setCalendar] = useState<Record<string, Job[]>>({});
  const [stats, setStats] = useState({ total: 0, completed: 0, cancelled: 0, totalRevenue: 0, avgTripMinutes: 0 });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/calendar?month=${currentMonth}`).then(r => r.json()).then(d => {
      setJobs(d.jobs || []);
      setCalendar(d.calendar || {});
      setStats(d.stats || {});
    });
  }, [currentMonth]);

  const daysInMonth = new Date(parseInt(currentMonth.split("-")[0]), parseInt(currentMonth.split("-")[1]), 0).getDate();
  const firstDay = new Date(parseInt(currentMonth.split("-")[0]), parseInt(currentMonth.split("-")[1]) - 1, 1).getDay();

  const prevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    setCurrentMonth(m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    setCurrentMonth(m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`);
  };

  const monthName = new Date(`${currentMonth}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const dateJobs = selectedDate ? calendar[selectedDate] || [] : [];

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-[20px] font-semibold tracking-[-0.3px]">Job Calendar</h2><p className="text-[13px] text-[#64748d] mt-0.5">View jobs by date with full trip details</p></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total Jobs", value: stats.total },
          { label: "Completed", value: stats.completed },
          { label: "Cancelled", value: stats.cancelled },
          { label: "Revenue", value: `$${(stats.totalRevenue || 0).toFixed(0)}` },
          { label: "Avg Trip", value: `${stats.avgTripMinutes || 0}min` },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider">{s.label}</div>
            <div className="text-[22px] font-light mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Calendar grid */}
        <div className="flex-1 bg-white border border-[#e5edf5] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-[#f6f9fc] rounded text-[#64748d]">←</button>
            <div className="text-[16px] font-semibold">{monthName}</div>
            <button onClick={nextMonth} className="p-2 hover:bg-[#f6f9fc] rounded text-[#64748d]">→</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-[11px] font-medium text-[#64748d] py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
              const dayJobs = calendar[dateStr] || [];
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === new Date().toISOString().split("T")[0];

              return (
                <div key={day} onClick={() => setSelectedDate(dateStr)}
                  className={`p-2 rounded-lg cursor-pointer min-h-[60px] transition-colors ${isSelected ? "bg-[#533afd]/[0.08] border border-[#533afd]" : isToday ? "bg-[#f6f9fc] border border-[#e5edf5]" : "hover:bg-[#f6f9fc]"}`}>
                  <div className={`text-[13px] font-medium ${isToday ? "text-[#533afd]" : ""}`}>{day}</div>
                  {dayJobs.length > 0 && (
                    <div className="mt-1">
                      <div className="text-[10px] text-[#64748d]">{dayJobs.length} job{dayJobs.length > 1 ? "s" : ""}</div>
                      <div className="flex gap-0.5 mt-0.5">
                        {dayJobs.slice(0, 4).map((j, k) => (
                          <div key={k} className={`w-1.5 h-1.5 rounded-full ${j.status === "completed" ? "bg-[#22c55e]" : j.status === "cancelled" ? "bg-[#ef4444]" : "bg-[#533afd]"}`} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected date jobs */}
        <div className="w-[360px] bg-white border border-[#e5edf5] rounded-lg overflow-hidden shrink-0">
          <div className="px-4 py-3 border-b border-[#e5edf5]">
            <div className="text-[14px] font-medium">
              {selectedDate ? new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "Select a date"}
            </div>
            {selectedDate && <div className="text-[12px] text-[#64748d]">{dateJobs.length} job{dateJobs.length !== 1 ? "s" : ""}</div>}
          </div>
          <div className="divide-y divide-[#e5edf5] max-h-[500px] overflow-y-auto">
            {!selectedDate ? (
              <div className="p-8 text-center text-[13px] text-[#64748d]">Click a date to see jobs</div>
            ) : dateJobs.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-[#64748d]">No jobs on this date</div>
            ) : dateJobs.map(j => (
              <div key={j.id} onClick={() => setSelectedJob(j)} className="p-4 cursor-pointer hover:bg-[#f6f9fc]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium">{j.customerName || "Walk-in"}</span>
                  <span className="text-[11px] text-[#64748d]">{new Date(j.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <div className="text-[12px] text-[#64748d]">📍 {j.pickupAddress}</div>
                {j.destinationAddress && <div className="text-[12px] text-[#64748d]">🏁 {j.destinationAddress}</div>}
                {j.totalAmount && <div className="text-[12px] font-medium mt-1">${j.totalAmount.toFixed(0)}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Job detail modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedJob(null)}>
          <div className="bg-white rounded-lg max-w-md w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold">Job Details</h3>
              <button onClick={() => setSelectedJob(null)} className="text-[#64748d] text-xl">×</button>
            </div>
            <div className="space-y-3 text-[13px]">
              <div><span className="text-[#64748d]">Customer:</span> <span className="font-medium">{selectedJob.customerName || "Walk-in"}</span></div>
              {selectedJob.customerPhone && <div><span className="text-[#64748d]">Phone:</span> {selectedJob.customerPhone}</div>}
              <div><span className="text-[#64748d]">From:</span> {selectedJob.pickupAddress}</div>
              {selectedJob.destinationAddress && <div><span className="text-[#64748d]">To:</span> {selectedJob.destinationAddress}</div>}
              {selectedJob.towVehicleMake && <div><span className="text-[#64748d]">Vehicle:</span> {selectedJob.towVehicleYear} {selectedJob.towVehicleMake} {selectedJob.towVehicleModel}</div>}
              <div><span className="text-[#64748d]">Status:</span> <span className="font-medium capitalize">{selectedJob.status.replace("_", " ")}</span></div>
              <div><span className="text-[#64748d]">Source:</span> <span className="capitalize">{selectedJob.source}</span></div>
              {selectedJob.totalAmount && <div><span className="text-[#64748d]">Amount:</span> <span className="font-semibold">${selectedJob.totalAmount.toFixed(2)}</span></div>}
              <div><span className="text-[#64748d]">Created:</span> {new Date(selectedJob.createdAt).toLocaleString()}</div>
              {selectedJob.completedAt && <div><span className="text-[#64748d]">Completed:</span> {new Date(selectedJob.completedAt).toLocaleString()}</div>}
              {selectedJob.completedAt && selectedJob.assignedAt && (
                <div><span className="text-[#64748d]">Trip Time:</span> <span className="font-medium">{Math.round((new Date(selectedJob.completedAt).getTime() - new Date(selectedJob.assignedAt).getTime()) / 60000)} min</span></div>
              )}
              {selectedJob.notes && <div className="mt-2 p-3 bg-[#f6f9fc] rounded text-[12px] text-[#64748d] whitespace-pre-wrap">{selectedJob.notes}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
