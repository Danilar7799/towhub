"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function DashboardOverview() {
  const [stats, setStats] = useState({ activeJobs: 0, todayJobs: 0, activeDrivers: 0, todayRevenue: 0, pendingLeads: 0, totalVehicles: 0 });
  const [recentJobs, setRecentJobs] = useState<{ id: string; status: string; customerName?: string; pickupAddress: string; totalAmount?: number; createdAt: string; source: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/jobs").then(r => r.json()),
      fetch("/api/fleet").then(r => r.json()),
      fetch("/api/leads").then(r => r.json()),
    ]).then(([jobsData, fleetData, leadsData]) => {
      const jobs = jobsData.jobs || [];
      const today = new Date().toDateString();
      const todayJobs = jobs.filter((j: { createdAt: string }) => new Date(j.createdAt).toDateString() === today);
      const activeJobs = jobs.filter((j: { status: string }) => ["pending", "assigned", "en_route", "on_scene", "towing"].includes(j.status));
      const todayRevenue = todayJobs.filter((j: { status: string }) => j.status === "completed").reduce((s: number, j: { totalAmount: number }) => s + (j.totalAmount || 0), 0);
      const pendingLeads = (leadsData.leads || []).filter((l: { status: string }) => l.status === "new");

      setStats({ activeJobs: activeJobs.length, todayJobs: todayJobs.length, activeDrivers: 0, todayRevenue, pendingLeads: pendingLeads.length, totalVehicles: (fleetData.vehicles || []).length });
      setRecentJobs(jobs.slice(0, 5));
    });
  }, []);

  const STATUS_STYLES: Record<string, string> = {
    pending: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
    assigned: "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]",
    en_route: "bg-[#e0e7ff] text-[#3730a3] border-[#c7d2fe]",
    on_scene: "bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]",
    towing: "bg-[#ffedd5] text-[#9a3412] border-[#fed7aa]",
    completed: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]",
    cancelled: "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]",
  };

  return (
    <div className="space-y-6" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Welcome */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-5 flex items-center justify-between">
        <div>
          <div className="text-[15px] font-semibold text-[#061b31]">Welcome to TowHub</div>
          <div className="text-[13px] text-[#64748d] mt-0.5">Your dashboard is ready. Start by adding your fleet and drivers.</div>
        </div>
        <Link href="/dashboard/fleet" className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
          + Add Vehicle
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Active Jobs", value: stats.activeJobs, accent: "#533afd" },
          { label: "Today&apos;s Jobs", value: stats.todayJobs, accent: "#061b31" },
          { label: "Drivers Online", value: stats.activeDrivers, accent: "#15be53" },
          { label: "Today&apos;s Revenue", value: `$${stats.todayRevenue.toFixed(0)}`, accent: "#061b31" },
          { label: "Pending Leads", value: stats.pendingLeads, accent: "#ea2261" },
          { label: "Vehicles", value: stats.totalVehicles, accent: "#061b31" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-5 hover:border-[#b9b9f9] hover:shadow-[0_8px_24px_rgba(50,50,93,0.06)] transition-all">
            <div className="text-[12px] text-[#64748d] uppercase tracking-wider mb-2">{s.label}</div>
            <div className="text-[32px] font-light tracking-[-0.8px]" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
        <div className="text-[13px] font-medium text-[#273951] mb-4">Quick actions</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "New Job", href: "/dashboard/jobs", icon: "+" },
            { label: "Add Vehicle", href: "/dashboard/fleet", icon: "🚛" },
            { label: "Add Driver", href: "/dashboard/drivers", icon: "👤" },
            { label: "View Map", href: "/dashboard/dispatch", icon: "🗺" },
          ].map((a, i) => (
            <Link key={i} href={a.href} className="flex items-center gap-3 p-3 rounded border border-[#e5edf5] hover:border-[#b9b9f9] hover:bg-[#533afd]/[0.02] transition-all">
              <span className="text-[16px]">{a.icon}</span>
              <span className="text-[13px] font-medium text-[#061b31]">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center justify-between">
          <div className="text-[13px] font-medium text-[#273951]">Recent Jobs</div>
          <Link href="/dashboard/jobs" className="text-[12px] text-[#533afd] font-medium hover:underline">View all →</Link>
        </div>
        {recentJobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-[32px] mb-3 opacity-30">📋</div>
            <div className="text-[14px] text-[#64748d]">No jobs yet. Create your first job to get started.</div>
          </div>
        ) : (
          <div className="divide-y divide-[#e5edf5]">
            {recentJobs.map(j => (
              <div key={j.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-[#f6f9fc] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${STATUS_STYLES[j.status] || ""}`}>
                    {j.status.replace("_", " ")}
                  </span>
                  <span className="text-[14px] font-medium text-[#061b31] truncate">{j.customerName || "Walk-in"}</span>
                  <span className="text-[12px] text-[#64748d] hidden sm:block">{j.pickupAddress}</span>
                </div>
                <div className="flex items-center gap-3">
                  {j.totalAmount && <span className="text-[14px] font-medium text-[#061b31]">${j.totalAmount.toFixed(0)}</span>}
                  <span className="text-[11px] text-[#94a3b8] capitalize">{j.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
