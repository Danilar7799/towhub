"use client";

import { useState, useEffect } from "react";

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    activeJobs: 0, todayJobs: 0, activeDrivers: 0, todayRevenue: 0,
    pendingLeads: 0, totalVehicles: 0,
  });

  useEffect(() => {
    // Fetch stats from multiple endpoints
    Promise.all([
      fetch("/api/jobs").then(r => r.json()),
      fetch("/api/fleet").then(r => r.json()),
      fetch("/api/leads").then(r => r.json()),
    ]).then(([jobsData, fleetData, leadsData]) => {
      const today = new Date().toDateString();
      const todayJobs = (jobsData.jobs || []).filter((j: { createdAt: string }) => new Date(j.createdAt).toDateString() === today);
      const activeJobs = (jobsData.jobs || []).filter((j: { status: string }) => ["pending", "assigned", "en_route", "on_scene", "towing"].includes(j.status));
      const todayRevenue = todayJobs.filter((j: { status: string }) => j.status === "completed").reduce((sum: number, j: { totalAmount: number }) => sum + (j.totalAmount || 0), 0);
      const pendingLeads = (leadsData.leads || []).filter((l: { status: string }) => l.status === "new");

      setStats({
        activeJobs: activeJobs.length,
        todayJobs: todayJobs.length,
        activeDrivers: 0, // Will be populated from GPS
        todayRevenue,
        pendingLeads: pendingLeads.length,
        totalVehicles: (fleetData.vehicles || []).length,
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <div>
          <div className="font-bold text-amber-900">Welcome to TowHub!</div>
          <div className="text-sm text-amber-700">Your dashboard is ready. Start by adding your fleet and drivers.</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Active Jobs", value: stats.activeJobs, icon: "📋", color: "blue" },
          { label: "Today&apos;s Jobs", value: stats.todayJobs, icon: "📅", color: "green" },
          { label: "Active Drivers", value: stats.activeDrivers, icon: "🚛", color: "purple" },
          { label: "Today&apos;s Revenue", value: `$${stats.todayRevenue.toFixed(0)}`, icon: "💰", color: "amber" },
          { label: "Pending Leads", value: stats.pendingLeads, icon: "🔗", color: "red" },
          { label: "Vehicles", value: stats.totalVehicles, icon: "🏎️", color: "indigo" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
            </div>
            <div className="text-3xl font-black">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Job", href: "/dashboard/jobs", icon: "➕" },
            { label: "Add Vehicle", href: "/dashboard/fleet", icon: "🚛" },
            { label: "Add Driver", href: "/dashboard/drivers", icon: "👤" },
            { label: "View Map", href: "/dashboard/dispatch", icon: "🗺️" },
          ].map((a, i) => (
            <a key={i} href={a.href} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border transition-colors">
              <span className="text-2xl">{a.icon}</span>
              <span className="text-sm font-medium">{a.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-4">Recent Jobs</h2>
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">📋</div>
          <div>No jobs yet. Create your first job to get started!</div>
        </div>
      </div>
    </div>
  );
}
