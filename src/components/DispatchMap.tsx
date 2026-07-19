"use client";

import { useEffect, useRef, useState } from "react";

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

const STATUS_COLORS: Record<string, string> = {
  pending: "#eab308", assigned: "#3b82f6", en_route: "#6366f1",
  on_scene: "#a855f7", towing: "#f97316", completed: "#22c55e",
};

interface MapProps {
  drivers: DriverLocation[];
  jobs: Job[];
  center: { lat: number; lng: number };
  onDriverClick?: (d: DriverLocation) => void;
  onJobClick?: (j: Job) => void;
}

export default function DispatchMap({ drivers, jobs, center, onDriverClick, onJobClick }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<unknown>(null);
  const markersRef = useRef<unknown[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], 12);

      // OpenStreetMap tiles (free, no key)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletMap.current = map;
      setReady(true);
    };

    init();
  }, [center]);

  // Update markers
  useEffect(() => {
    if (!ready || !leafletMap.current) return;

    const load = async () => {
      const L = (await import("leaflet")).default;
      const map = leafletMap.current as L.Map;

      // Clear old markers
      markersRef.current.forEach(m => (m as L.Marker).remove());
      markersRef.current = [];

      // Driver markers
      drivers.forEach(d => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:32px;height:32px;border-radius:50%;background:${d.isOnline ? "#22c55e" : "#94a3b8"};color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer">${d.driverFirstName[0]}${d.driverLastName[0]}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([d.lat, d.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${d.driverFirstName} ${d.driverLastName}</b><br>${d.speed ? Math.round(d.speed) + " mph" : ""} ${d.batteryLevel ? "🔋 " + d.batteryLevel + "%" : ""}`);

        marker.on("click", () => onDriverClick?.(d));
        markersRef.current.push(marker);
      });

      // Job markers
      const activeJobs = jobs.filter(j => ["pending", "assigned", "en_route", "on_scene", "towing"].includes(j.status) && j.pickupLat && j.pickupLng);
      activeJobs.forEach(j => {
        const color = STATUS_COLORS[j.status] || "#6b7280";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer">📋</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([j.pickupLat!, j.pickupLng!], { icon })
          .addTo(map)
          .bindPopup(`<b>${j.customerName || "Walk-in"}</b><br>📍 ${j.pickupAddress}<br><span style="color:${color}">${j.status.replace("_", " ")}</span>`);

        marker.on("click", () => onJobClick?.(j));
        markersRef.current.push(marker);
      });

      // Fit bounds if we have markers
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current as L.Marker[]);
        map.fitBounds(group.getBounds().pad(0.1));
      }
    };

    load();
  }, [ready, drivers, jobs, onDriverClick, onJobClick]);

  return (
    <div className="w-full h-full relative">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full h-full" />

      {/* Provider badge */}
      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur border border-[#e5edf5] rounded px-2 py-1 text-[10px] text-[#64748d]">
        🗺️ OpenStreetMap • Free
      </div>
    </div>
  );
}
