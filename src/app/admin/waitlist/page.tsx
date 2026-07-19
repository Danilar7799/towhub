"use client";

import { useState, useEffect } from "react";

interface WaitlistEntry {
  id: string; companyName: string; contactName: string; email: string; phone: string;
  city: string; state: string; fleetSize?: number; yearsInBusiness?: number;
  servicesOffered?: string[]; monthlyTowVolume?: number; website?: string;
  message?: string; isApproved: boolean; approvedAt?: string; createdAt: string;
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [approving, setApproving] = useState<string | null>(null);
  const [commission, setCommission] = useState("15");

  const load = () => fetch("/api/waitlist").then(r => r.json()).then(d => setEntries(d.entries || []));
  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    setApproving(id);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlistId: id, commissionPercent: parseFloat(commission) }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Approved!\n\nLogin credentials:\nEmail: ${data.credentials.email}\nPassword: ${data.credentials.password}\n\nShare these with the company.`);
        load();
      } else {
        alert(`Error: ${data.error}`);
      }
    } finally {
      setApproving(null);
    }
  };

  const pending = entries.filter(e => !e.isApproved);
  const approved = entries.filter(e => e.isApproved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Waitlist</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Default Commission:</label>
            <input type="number" value={commission} onChange={e => setCommission(e.target.value)}
              className="w-20 px-3 py-2 border rounded-lg text-sm" />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
      </div>

      {/* Pending */}
      <div>
        <h2 className="text-lg font-bold mb-3">⏳ Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400">No pending applications.</div>
        ) : (
          <div className="space-y-4">
            {pending.map(entry => (
              <div key={entry.id} className="bg-white rounded-xl border p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{entry.companyName}</h3>
                    <div className="text-sm text-gray-500 mt-2 space-y-1">
                      <div>👤 {entry.contactName} • 📧 {entry.email} • 📞 {entry.phone}</div>
                      <div>📍 {entry.city}, {entry.state}</div>
                      {entry.fleetSize && <div>🚛 Fleet: {entry.fleetSize} vehicles</div>}
                      {entry.yearsInBusiness && <div>📅 {entry.yearsInBusiness} years in business</div>}
                      {entry.monthlyTowVolume && <div>📊 ~{entry.monthlyTowVolume} tows/month</div>}
                      {entry.website && <div>🌐 {entry.website}</div>}
                    </div>
                    {entry.servicesOffered && entry.servicesOffered.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {entry.servicesOffered.map(s => (
                          <span key={s} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{s}</span>
                        ))}
                      </div>
                    )}
                    {entry.message && <div className="mt-3 text-sm text-gray-400 italic">&ldquo;{entry.message}&rdquo;</div>}
                    <div className="text-xs text-gray-400 mt-2">Applied: {new Date(entry.createdAt).toLocaleDateString()}</div>
                  </div>
                  <button
                    onClick={() => approve(entry.id)}
                    disabled={approving === entry.id}
                    className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {approving === entry.id ? "Approving..." : "✅ Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved */}
      {approved.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3">✅ Approved ({approved.length})</h2>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Company</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Contact</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Location</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Approved</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {approved.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{e.companyName}</td>
                    <td className="px-6 py-4 text-gray-500">{e.email}</td>
                    <td className="px-6 py-4 text-gray-500">{e.city}, {e.state}</td>
                    <td className="px-6 py-4 text-gray-500">{e.approvedAt ? new Date(e.approvedAt).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
