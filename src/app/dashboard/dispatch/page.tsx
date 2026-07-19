"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const DispatchMap = dynamic(() => import("@/components/DispatchMap"), { ssr: false });

interface DriverLocation {
  id: string; userId: string; lat: number; lng: number;
  speed?: number; heading?: number; batteryLevel?: number;
  isOnline: boolean; activeJobId?: string; timestamp?: string;
  driverFirstName: string; driverLastName: string;
}

interface Job {
  id: string; status: string; customerName?: string; pickupAddress: string;
  pickupLat?: number; pickupLng?: number; destinationAddress?: string;
  totalAmount?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#eab308", assigned: "#3b82f6", en_route: "#6366f1",
  on_scene: "#a855f7", towing: "#f97316", completed: "#22c55e", cancelled: "#ef4444",
};

export default function DispatchPage() {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const loadData = useCallback(async () => {
    const [gpsRes, jobsRes] = await Promise.all([
      fetch("/api/gps").then(r => r.json()),
      fetch("/api/jobs").then(r => r.json()),
    ]);
    setDrivers(gpsRes.drivers || []);
    setJobs(jobsRes.jobs || []);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const activeJobs = jobs.filter(j => ["pending", "assigned", "en_route", "on_scene", "towing"].includes(j.status));
  const center = drivers.length > 0
    ? { lat: drivers[0].lat, lng: drivers[0].lng }
    : { lat: 34.0522, lng: -118.2437 };

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Map area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Dispatch Board</h2>
            <p className="text-[12px] text-[#64748d]">Last update: {lastUpdate.toLocaleTimeString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[12px]">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#22c55e] rounded-full" /> Online ({drivers.filter(d => d.isOnline).length})</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#94a3b8] rounded-full" /> Offline</div>
            </div>
            <button onClick={loadData} className="bg-[#533afd] text-white px-3 py-1.5 rounded text-[12px] font-medium">Refresh</button>
          </div>
        </div>

        {/* Real map */}
        <div className="flex-1 bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <DispatchMap
            drivers={drivers}
            jobs={jobs}
            center={center}
            onDriverClick={(d) => setSelectedDriver(d)}
            onJobClick={(j) => setSelectedJob(j)}
          />
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-[320px] shrink-0 flex flex-col gap-4">
        {/* Active Jobs */}
        <div className="bg-white border border-[#e5edf5] rounded-lg flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#e5edf5] flex items-center justify-between">
            <div className="text-[13px] font-medium">Active Jobs ({activeJobs.length})</div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#e5edf5]">
            {activeJobs.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-[#64748d]">No active jobs</div>
            ) : activeJobs.slice(0, 10).map(j => (
              <div key={j.id} onClick={() => setSelectedJob(j)}
                className={`px-4 py-3 cursor-pointer hover:bg-[#f6f9fc] transition-colors ${selectedJob?.id === j.id ? "bg-[#533afd]/[0.04] border-l-2 border-[#533afd]" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium truncate">{j.customerName || "Walk-in"}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: STATUS_COLORS[j.status] + "20", color: STATUS_COLORS[j.status] }}>
                    {j.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-[11px] text-[#64748d] truncate">📍 {j.pickupAddress}</div>
                {j.totalAmount && <div className="text-[12px] font-medium mt-1">${j.totalAmount.toFixed(0)}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Driver list */}
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e5edf5]">
            <div className="text-[13px] font-medium">Drivers ({drivers.length})</div>
          </div>
          <div className="divide-y divide-[#e5edf5] max-h-[200px] overflow-y-auto">
            {drivers.length === 0 ? (
              <div className="p-4 text-center text-[13px] text-[#64748d]">No drivers online</div>
            ) : drivers.map(d => (
              <div key={d.id} onClick={() => setSelectedDriver(d)}
                className={`px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-[#f6f9fc] transition-colors ${selectedDriver?.id === d.id ? "bg-[#533afd]/[0.04]" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ${d.isOnline ? "bg-[#22c55e]" : "bg-[#94a3b8]"}`}>
                  {d.driverFirstName[0]}{d.driverLastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{d.driverFirstName} {d.driverLastName}</div>
                  <div className="text-[11px] text-[#64748d]">
                    {d.speed !== undefined && `${Math.round(d.speed)} mph • `}
                    {d.batteryLevel !== undefined && `🔋 ${d.batteryLevel}%`}
                  </div>
                </div>
                {d.activeJobId && <span className="text-[10px] bg-[#533afd]/10 text-[#533afd] px-1.5 py-0.5 rounded font-medium">On Job</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Bland.ai placeholder */}
        <div className="bg-gradient-to-r from-[#f3e8ff] to-[#e0e7ff] border border-[#c7d2fe] rounded-lg p-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[20px]">🤖</span>
            <div>
              <div className="text-[13px] font-semibold text-[#3730a3]">AI Dispatcher</div>
              <div className="text-[11px] text-[#4338ca]">Bland.ai integration coming soon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
