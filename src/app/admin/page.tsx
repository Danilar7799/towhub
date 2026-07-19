"use client";

import { useState, useEffect } from "react";

interface AdminData {
  stats: { totalOrgs: number; approvedOrgs: number; pendingOrgs: number; totalUsers: number; waitlistEntries: number };
  organizations: { id: string; name: string; status: string; email: string; city?: string; state?: string; createdAt: string }[];
  waitlist: { id: string; companyName: string; contactName: string; email: string; city: string; state: string; isApproved: boolean; createdAt: string }[];
}

export default function AdminOverview() {
  const [data, setData] = useState<AdminData | null>(null);

  useEffect(() => {
    fetch("/api/admin").then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Companies", value: data.stats.totalOrgs, icon: "🏢", color: "blue" },
          { label: "Approved", value: data.stats.approvedOrgs, icon: "✅", color: "green" },
          { label: "Pending", value: data.stats.pendingOrgs, icon: "⏳", color: "yellow" },
          { label: "Total Users", value: data.stats.totalUsers, icon: "👥", color: "purple" },
          { label: "Waitlist", value: data.stats.waitlistEntries, icon: "📋", color: "red" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{s.icon}</span>
            </div>
            <div className="text-3xl font-black">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-2 gap-4">
        <a href="/admin/companies" className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow">
          <div className="text-2xl mb-2">🏢</div>
          <div className="font-bold text-lg">Manage Companies</div>
          <div className="text-sm text-gray-500">Approve, suspend, or manage towing companies</div>
        </a>
        <a href="/admin/waitlist" className="bg-white rounded-xl border p-6 hover:shadow-md transition-shadow">
          <div className="text-2xl mb-2">📋</div>
          <div className="font-bold text-lg">Review Waitlist</div>
          <div className="text-sm text-gray-500">{data.stats.waitlistEntries} companies waiting for approval</div>
        </a>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-4">Recent Companies</h2>
        {data.organizations.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No companies yet.</div>
        ) : (
          <div className="space-y-3">
            {data.organizations.slice(0, 5).map(org => (
              <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{org.name}</div>
                  <div className="text-sm text-gray-500">{org.email} • {org.city}, {org.state}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  org.status === "approved" ? "bg-green-100 text-green-700" :
                  org.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>{org.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
