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
    const interval = setInterval(loadDrivers, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Dispatch Board</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Last update: {lastUpdate.toLocaleTimeString()}</span>
          <button onClick={loadDrivers} className="bg-blue-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Refresh</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map placeholder */}
        <div className="lg:col-span-2 bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-100 h-[500px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-xl font-bold text-gray-600">Live Map</h3>
              <p className="text-gray-400 mt-2">Google Maps integration coming soon.</p>
              <p className="text-gray-400 text-sm">Driver locations will appear here in real-time.</p>
              <div className="mt-4 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg inline-block text-sm">
                {drivers.length} driver{drivers.length !== 1 ? "s" : ""} online
              </div>
            </div>
          </div>
        </div>

        {/* Driver list */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-bold mb-4">Active Drivers</h2>
          {drivers.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">🚛</div>
              <div>No drivers online</div>
              <div className="text-sm mt-2">Drivers will appear here when they open the app and share their location.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {drivers.map(d => (
                <div key={d.id} className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold">{d.driverFirstName} {d.driverLastName}</div>
                    <span className={`w-3 h-3 rounded-full ${d.isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>📍 {d.lat.toFixed(4)}, {d.lng.toFixed(4)}</div>
                    {d.speed !== undefined && <div>🏎️ {Math.round(d.speed)} mph</div>}
                    {d.batteryLevel !== undefined && <div>🔋 {d.batteryLevel}%</div>}
                    {d.activeJobId && <div>📋 On active job</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bland.ai placeholder */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🤖</div>
          <div>
            <h3 className="text-lg font-bold text-purple-900">AI Dispatcher (Coming Soon)</h3>
            <p className="text-purple-700 text-sm">Bland.ai will automatically answer calls, capture job details, and dispatch the nearest driver. Stay tuned!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
