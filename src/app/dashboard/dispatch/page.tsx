"use client";

import { useState, useEffect } from "react";

interface DriverLocation {
  id: string; userId: string; lat: number; lng: number;
  speed?: number; batteryLevel?: number; isOnline: boolean;
  activeJobId?: string; timestamp: string;
  driverFirstName: string; driverLastName: string;
}

export default function DispatchPage() {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadDrivers = () => {
    fetch("/api/gps").then(r => r.json()).then(d => {
      setDrivers(d.drivers || []);
      setLastUpdate(new Date());
    });
  };

  useEffect(() => {
    loadDrivers();
    const interval = setInterval(loadDrivers, 15000);
    return () => clearInterval(interval);
  }, []);

  const online = drivers.filter(d => d.isOnline).length;
  const onJob = drivers.filter(d => d.activeJobId).length;

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Dispatch Board</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Real-time driver tracking and dispatch</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[#94a3b8]">Updated {lastUpdate.toLocaleTimeString()}</span>
          <button onClick={loadDrivers} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Online", value: online, accent: "#15be53" },
          { label: "On Active Job", value: onJob, accent: "#533afd" },
          { label: "Total Drivers", value: drivers.length, accent: "#061b31" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-[28px] font-light tracking-[-0.5px]" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Map placeholder */}
        <div className="lg:col-span-2 bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <div className="bg-[#f6f9fc] h-[500px] flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                {drivers.filter(d => d.isOnline).slice(0, 5).map((d, i) => (
                  <div key={d.id} className="w-3 h-3 bg-[#533afd] rounded-full animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
                {drivers.filter(d => d.isOnline).length === 0 && (
                  <>
                    <div className="w-3 h-3 bg-[#533afd] rounded-full animate-pulse" />
                    <div className="w-3 h-3 bg-[#15be53] rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                    <div className="w-3 h-3 bg-[#f5bf4f] rounded-full animate-pulse" style={{ animationDelay: "600ms" }} />
                  </>
                )}
              </div>
              <div className="text-[15px] font-medium text-[#061b31] mb-1">Live GPS Tracking</div>
              <div className="text-[13px] text-[#64748d] mb-4">Google Maps integration coming soon</div>
              <div className="inline-flex items-center gap-2 bg-[#533afd]/[0.06] text-[#533afd] px-3 py-1.5 rounded text-[12px] font-medium">
                <div className="w-1.5 h-1.5 bg-[#15be53] rounded-full" />
                {online} driver{online !== 1 ? "s" : ""} online
              </div>
            </div>
          </div>
        </div>

        {/* Driver list */}
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e5edf5]">
            <div className="text-[14px] font-medium text-[#061b31]">Active Drivers</div>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {drivers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-[32px] mb-3 opacity-30">🚛</div>
                <div className="text-[14px] text-[#64748d]">No drivers online</div>
                <div className="text-[12px] text-[#94a3b8] mt-1">Drivers appear here when they share location</div>
              </div>
            ) : (
              <div className="divide-y divide-[#e5edf5]">
                {drivers.map(d => (
                  <div key={d.id} className="px-5 py-3.5 hover:bg-[#f6f9fc] transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full ${d.isOnline ? "bg-[#15be53]" : "bg-[#e5edf5]"}`} />
                        <span className="text-[13px] font-medium text-[#061b31]">{d.driverFirstName} {d.driverLastName}</span>
                      </div>
                      {d.activeJobId && (
                        <span className="text-[10px] bg-[#533afd]/[0.06] text-[#533afd] px-2 py-0.5 rounded font-medium">On Job</span>
                      )}
                    </div>
                    <div className="pl-[18px] space-y-0.5">
                      <div className="text-[12px] text-[#64748d]">📍 {d.lat.toFixed(4)}, {d.lng.toFixed(4)}</div>
                      {d.speed !== undefined && <div className="text-[12px] text-[#64748d]">🏎️ {Math.round(d.speed)} mph</div>}
                      {d.batteryLevel !== undefined && <div className="text-[12px] text-[#64748d]">🔋 {d.batteryLevel}%</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Dispatcher */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#533afd]/[0.06] rounded-lg flex items-center justify-center text-[24px]">🤖</div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-[#061b31] tracking-[-0.2px]">AI Dispatcher</div>
            <div className="text-[13px] text-[#64748d] mt-0.5">Bland.ai auto-answers calls, captures job details, and dispatches the nearest driver. Configure in Settings.</div>
          </div>
          <span className="text-[11px] bg-[#fef3c7] text-[#92400e] px-2.5 py-1 rounded font-medium border border-[#fde68a]">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}
