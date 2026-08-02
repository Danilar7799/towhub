"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DispatchMap from "@/components/DispatchMap";

interface DriverLocation {
  id: string; userId: string; lat: number; lng: number;
  speed?: number; batteryLevel?: number; isOnline: boolean;
  activeJobId?: string; driverFirstName: string; driverLastName: string;
  timestamp?: string;
}

interface Job {
  id: string; status: string; customerName?: string; pickupAddress: string;
  pickupLat?: number; pickupLng?: number;
}

const DEFAULT_CENTER = { lat: 47.2529, lng: -122.4443 }; // Pacific, WA

export default function DispatchMapPage() {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load drivers with GPS locations
  useEffect(() => {
    const load = async () => {
      try {
        const [driversRes, jobsRes] = await Promise.all([
          fetch("/api/gps"),
          fetch("/api/jobs?status=pending&status=assigned&status=en_route&status=on_scene&status=towing"),
        ]);
        const driversData = await driversRes.json();
        const jobsData = await jobsRes.json();
        setDrivers(driversData.drivers || []);
        setJobs(jobsData.jobs || []);
      } catch (e) {
        console.error("Failed to load map data:", e);
      }
    };

    load();
    const interval = setInterval(load, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const onlineDrivers = drivers.filter(d => d.isOnline);
  const activeJobs = jobs.filter(j => 
    ["pending", "assigned", "en_route", "on_scene", "towing"].includes(j.status) && 
    j.pickupLat && j.pickupLng
  );

  const handleDriverClick = (d: DriverLocation) => {
    setSelectedDriver(d);
    setCenter({ lat: d.lat, lng: d.lng });
    setSelectedJob(null);
  };

  const handleJobClick = (j: Job) => {
    if (j.pickupLat && j.pickupLng) {
      setCenter({ lat: j.pickupLat, lng: j.pickupLng });
    }
    setSelectedJob(j);
    setSelectedDriver(null);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add toast here
      console.log(`Copied ${label}: ${text}`);
    });
  };

  const openFullscreen = () => {
    // Open in new window for dual-monitor setup
    const features = "width=1200,height=800,menubar=no,toolbar=no,location=no";
    window.open("/dashboard/map?fullscreen=1", "_blank", features);
  };

  const copyDriverInfo = (d: DriverLocation) => {
    const info = `Driver: ${d.driverFirstName} ${d.driverLastName}\nStatus: ${d.isOnline ? "Online" : "Offline"}\nLocation: ${d.lat.toFixed(6)}, ${d.lng.toFixed(6)}\nSpeed: ${d.speed ? d.speed.toFixed(1) + " mph" : "N/A"}\nBattery: ${d.batteryLevel ? d.batteryLevel + "%" : "N/A"}\nActive Job: ${d.activeJobId || "None"}\nUpdated: ${d.timestamp ? new Date(d.timestamp).toLocaleString() : "N/A"}`;
    copyToClipboard(info, "Driver info");
  };

  const copyJobInfo = (j: Job) => {
    const info = `Job: ${j.id}\nCustomer: ${j.customerName || "Walk-in"}\nStatus: ${j.status.replace("_", " ")}\nPickup: ${j.pickupAddress}\nCoordinates: ${j.pickupLat?.toFixed(6)}, ${j.pickupLng?.toFixed(6)}`;
    copyToClipboard(info, "Job info");
  };

  // Check if opened in fullscreen mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("fullscreen") === "1") {
        setIsFullscreen(true);
      }
    }
  }, []);

  if (isFullscreen) {
    return (
      <div className="h-screen w-screen" style={{ fontFeatureSettings: "'ss01'" }}>
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between p-3 bg-white/95 backdrop-blur border border-[#e5edf5] rounded-lg shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-[#15be53] rounded-full animate-pulse" />
            <span className="text-[14px] font-semibold text-[#061b31]">🗺️ Live Dispatch Map — Fullscreen</span>
            <span className="text-[11px] text-[#64748d]">Drag this window to your second monitor</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/dashboard/dispatch"
              className="px-3 py-1.5 bg-[#533afd] text-white rounded text-[11px] font-medium hover:bg-[#4434d4] transition-colors"
            >
              ← Back to Console
            </a>
          </div>
        </div>
        <DispatchMap
          drivers={drivers}
          jobs={jobs}
          center={center}
          onDriverClick={handleDriverClick}
          onJobClick={handleJobClick}
        />
        {selectedDriver && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:w-80 z-20 bg-white border border-[#e5edf5] rounded-lg shadow-lg p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[14px] font-semibold">
                👤 {selectedDriver.driverFirstName} {selectedDriver.driverLastName}
              </div>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-[#94a3b8] hover:text-[#64748d]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${selectedDriver.isOnline ? "bg-[#15be53]" : "bg-[#94a3b8]"}`} />
                <span>{selectedDriver.isOnline ? "Online" : "Offline"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#64748d] w-20">Location:</span>
                <span className="font-mono flex-1 truncate">{selectedDriver.lat.toFixed(6)}, {selectedDriver.lng.toFixed(6)}</span>
                <button
                  onClick={() => copyDriverInfo(selectedDriver)}
                  className="text-[10px] px-2 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd]"
                  title="Copy driver info"
                >
                  📋 Copy
                </button>
              </div>
              {selectedDriver.speed && (
                <div className="flex items-center gap-2">
                  <span className="text-[#64748d] w-20">Speed:</span>
                  <span>{selectedDriver.speed.toFixed(1)} mph</span>
                </div>
              )}
              {selectedDriver.batteryLevel && (
                <div className="flex items-center gap-2">
                  <span className="text-[#64748d] w-20">Battery:</span>
                  <span>{selectedDriver.batteryLevel}%</span>
                </div>
              )}
              {selectedDriver.activeJobId && (
                <div className="flex items-center gap-2">
                  <span className="text-[#64748d] w-20">Active Job:</span>
                  <span className="font-mono text-[#533afd]">{selectedDriver.activeJobId}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-[#64748d] w-20">Updated:</span>
                <span>{selectedDriver.timestamp ? new Date(selectedDriver.timestamp).toLocaleTimeString() : "—"}</span>
              </div>
            </div>
          </div>
        )}
        {selectedJob && (
          <div className="absolute bottom-4 right-4 sm:right-auto sm:w-80 z-20 bg-white border border-[#e5edf5] rounded-lg shadow-lg p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[14px] font-semibold">
                📋 {selectedJob.customerName || "Walk-in"}
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-[#94a3b8] hover:text-[#64748d]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: {
                  pending: "#eab308", assigned: "#3b82f6", en_route: "#6366f1",
                  on_scene: "#a855f7", towing: "#f97316", completed: "#22c55e"
                }[selectedJob.status] || "#6b7280" }} />
                <span className="capitalize">{selectedJob.status.replace("_", " ")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#64748d] w-20">Pickup:</span>
                <span className="flex-1 truncate">{selectedJob.pickupAddress}</span>
                <button
                  onClick={() => copyJobInfo(selectedJob)}
                  className="text-[10px] px-2 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd]"
                  title="Copy job info"
                >
                  📋 Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">🗺️ Live Dispatch Map</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">
            Real-time driver GPS tracking & job locations — <span className="text-[#533afd] font-medium">Open in new window for dual-monitor</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-[12px] text-[#64748d] hidden sm:flex">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#15be53] rounded-full" /> {onlineDrivers.length} Online
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#eab308] rounded-full" /> {activeJobs.length} Active Jobs
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#94a3b8] rounded-full" /> {drivers.length - onlineDrivers.length} Offline
            </span>
          </div>
          <button
            onClick={openFullscreen}
            className="px-4 py-2 bg-[#533afd] text-white rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)] flex items-center gap-2"
          >
            ⤢ Open Fullscreen
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <DispatchMap
          drivers={drivers}
          jobs={jobs}
          center={center}
          onDriverClick={handleDriverClick}
          onJobClick={handleJobClick}
        />

        {/* Floating Stats Panel */}
        <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur border border-[#e5edf5] rounded-lg shadow-lg p-3 hidden sm:block">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold text-[#533afd] uppercase tracking-wider">Live Stats</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#dcfce7] rounded p-2">
              <div className="text-[18px] font-semibold text-[#166534]">{onlineDrivers.length}</div>
              <div className="text-[10px] text-[#166534]">Online</div>
            </div>
            <div className="bg-[#fef3c7] rounded p-2">
              <div className="text-[18px] font-semibold text-[#92400e]">{activeJobs.length}</div>
              <div className="text-[10px] text-[#92400e]">Active Jobs</div>
            </div>
            <div className="bg-[#f3f4f6] rounded p-2">
              <div className="text-[18px] font-semibold text-[#4b5563]">{drivers.length}</div>
              <div className="text-[10px] text-[#4b5563]">Total Drivers</div>
            </div>
          </div>
        </div>

        {/* Driver List Panel */}
        <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur border border-[#e5edf5] rounded-lg shadow-lg w-64 max-h-[60vh] overflow-hidden hidden lg:block">
          <div className="p-3 border-b border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#64748d]">Online Drivers</span>
            <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-1.5 py-0.5 rounded">{onlineDrivers.length}</span>
          </div>
          <div className="max-h-[40vh] overflow-y-auto p-2 space-y-1.5">
            {onlineDrivers.slice(0, 10).map(d => (
              <button
                key={d.userId}
                onClick={() => handleDriverClick(d)}
                className="w-full text-left p-2 rounded hover:bg-[#f6f9fc] transition-colors border border-transparent hover:border-[#e5edf5]"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#533afd]/10 flex items-center justify-center text-[#533afd] text-[10px] font-bold shrink-0">
                    {d.driverFirstName[0]}{d.driverLastName[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium truncate">{d.driverFirstName} {d.driverLastName}</div>
                    <div className="text-[10px] text-[#64748d] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#15be53] rounded-full" />
                      {d.speed ? `${d.speed.toFixed(0)} mph` : "Stationary"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {onlineDrivers.length === 0 && (
              <div className="text-center py-4 text-[12px] text-[#94a3b8]">No drivers online</div>
            )}
          </div>
        </div>

        {/* Job List Panel */}
        <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur border border-[#e5edf5] rounded-lg shadow-lg w-72 max-h-[50vh] overflow-hidden hidden lg:block">
          <div className="p-3 border-b border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#64748d]">Active Jobs</span>
            <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-1.5 py-0.5 rounded">{activeJobs.length}</span>
          </div>
          <div className="max-h-[35vh] overflow-y-auto p-2 space-y-1.5">
            {activeJobs.slice(0, 8).map(job => (
              <button
                key={job.id}
                onClick={() => handleJobClick(job)}
                className="w-full text-left p-2 rounded hover:bg-[#f6f9fc] transition-colors border border-transparent hover:border-[#e5edf5]"
              >
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: {
                    pending: "#eab308", assigned: "#3b82f6", en_route: "#6366f1",
                    on_scene: "#a855f7", towing: "#f97316", completed: "#22c55e"
                  }[job.status] || "#6b7280" }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium truncate">{job.customerName || "Walk-in"}</div>
                    <div className="text-[10px] text-[#64748d] truncate">{job.pickupAddress}</div>
                    <div className="text-[10px] text-[#94a3b8] capitalize mt-0.5">{job.status.replace("_", " ")}</div>
                  </div>
                </div>
              </button>
            ))}
            {activeJobs.length === 0 && (
              <div className="text-center py-4 text-[12px] text-[#94a3b8]">No active jobs</div>
            )}
          </div>
        </div>
      </div>

      {/* Side Panels for smaller screens */}
      <div className="lg:hidden mt-4 space-y-3">
        <div className="bg-white border border-[#e5edf5] rounded-lg p-3">
          <div className="text-[12px] font-semibold text-[#64748d] mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#15be53] rounded-full" /> Online Drivers ({onlineDrivers.length})
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {onlineDrivers.slice(0, 6).map(d => (
              <button
                key={d.userId}
                onClick={() => handleDriverClick(d)}
                className="w-full text-left p-2 rounded hover:bg-[#f6f9fc] border border-transparent hover:border-[#e5edf5]"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#533afd]/10 flex items-center justify-center text-[#533afd] text-[10px] font-bold shrink-0">
                    {d.driverFirstName[0]}{d.driverLastName[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium truncate">{d.driverFirstName} {d.driverLastName}</div>
                    <div className="text-[9px] text-[#64748d] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#15be53] rounded-full" />
                      {d.speed ? `${d.speed.toFixed(0)} mph` : "Stationary"}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyDriverInfo(d); }}
                    className="text-[9px] px-1.5 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd]"
                  >
                    📋
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#e5edf5] rounded-lg p-3">
          <div className="text-[12px] font-semibold text-[#64748d] mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#eab308] rounded-full" /> Active Jobs ({activeJobs.length})
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {activeJobs.slice(0, 6).map(job => (
              <button
                key={job.id}
                onClick={() => handleJobClick(job)}
                className="w-full text-left p-2 rounded hover:bg-[#f6f9fc] border border-transparent hover:border-[#e5edf5]"
              >
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: {
                    pending: "#eab308", assigned: "#3b82f6", en_route: "#6366f1",
                    on_scene: "#a855f7", towing: "#f97316", completed: "#22c55e"
                  }[job.status] || "#6b7280" }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium truncate">{job.customerName || "Walk-in"}</div>
                    <div className="text-[9px] text-[#64748d] truncate">{job.pickupAddress}</div>
                    <div className="text-[9px] text-[#94a3b8] capitalize mt-0.5">{job.status.replace("_", " ")}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyJobInfo(job); }}
                    className="text-[9px] px-1.5 py-0.5 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#533afd]"
                  >
                    📋
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}