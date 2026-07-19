"use client";

import { useState, useEffect } from "react";

interface Org {
  id: string; name: string; slug: string; email: string; phone?: string;
  city?: string; state?: string; status: string; commissionPercent?: number;
  createdAt: string;
}

export default function CompaniesPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);

  const load = () => fetch("/api/admin").then(r => r.json()).then(d => setOrgs(d.organizations || []));
  useEffect(() => { load(); }, []);

  const updateStatus = async (orgId: string, status: string) => {
    await fetch("/api/admin/approve", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, status }) });
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Companies</h1>

      {orgs.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-5xl mb-4">🏢</div>
          <h2 className="text-xl font-bold">No companies yet</h2>
          <p className="text-gray-500">Companies will appear here after you approve waitlist entries.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Company</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Contact</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Location</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Commission</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orgs.map(org => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{org.name}</td>
                  <td className="px-6 py-4 text-gray-500">{org.email}</td>
                  <td className="px-6 py-4 text-gray-500">{org.city}, {org.state}</td>
                  <td className="px-6 py-4">{org.commissionPercent || 15}%</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      org.status === "approved" ? "bg-green-100 text-green-700" :
                      org.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      org.status === "suspended" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>{org.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      {org.status !== "approved" && <button onClick={() => updateStatus(org.id, "approved")} className="text-sm text-green-600 hover:text-green-800">Approve</button>}
                      {org.status !== "suspended" && <button onClick={() => updateStatus(org.id, "suspended")} className="text-sm text-red-600 hover:text-red-800">Suspend</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
