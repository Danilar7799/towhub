"use client";

import { useState, useEffect } from "react";

interface Lead {
  id: string; source: string; customerName?: string; customerPhone?: string;
  customerEmail?: string; message?: string; pickupAddress?: string;
  estimatedValue?: number; status: string; createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700", contacted: "bg-yellow-100 text-yellow-700",
  quoted: "bg-purple-100 text-purple-700", accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700", expired: "bg-gray-100 text-gray-500",
};

const SOURCE_ICONS: Record<string, string> = {
  yelp: "🔴", thumbtack: "🟢", google: "🔵", phone: "📞", website: "🌐", manual: "✏️",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState("all");

  const load = () => fetch("/api/leads").then(r => r.json()).then(d => setLeads(d.leads || []));
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? leads : leads.filter(l => l.source === filter);

  const updateLead = async (id: string, updates: Record<string, unknown>) => {
    await fetch("/api/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    load();
  };

  const convertToJob = async (id: string) => {
    const res = await fetch("/api/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, convertToJob: true }) });
    if (res.ok) { alert("Lead converted to job!"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Leads</h1>
        <div className="text-sm text-gray-500">{leads.filter(l => l.status === "new").length} new leads</div>
      </div>

      {/* Source filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["all", "yelp", "thumbtack", "google", "phone", "website", "manual"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filter === s ? "bg-blue-900 text-white" : "bg-white border text-gray-600"}`}>
            {s === "all" ? "All" : `${SOURCE_ICONS[s] || ""} ${s.charAt(0).toUpperCase() + s.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Yelp/Thumbtack integration notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">🔗</span>
        <div>
          <div className="font-bold text-amber-900">Lead Integrations</div>
          <div className="text-sm text-amber-700">Yelp and Thumbtack API integrations will auto-import leads here. Configure in Settings.</div>
        </div>
      </div>

      {/* Leads list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-bold mb-2">No leads yet</h2>
          <p className="text-gray-500">Leads from Yelp, Thumbtack, and Google will appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(l => (
            <div key={l.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{SOURCE_ICONS[l.source] || "📌"}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[l.status]}`}>
                      {l.status}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{l.source}</span>
                  </div>
                  <div className="font-bold">{l.customerName || "Unknown"}</div>
                  {l.customerPhone && <div className="text-sm text-gray-500">📞 {l.customerPhone}</div>}
                  {l.pickupAddress && <div className="text-sm text-gray-500">📍 {l.pickupAddress}</div>}
                  {l.message && <div className="text-sm text-gray-400 mt-1 line-clamp-2">{l.message}</div>}
                  {l.estimatedValue && <div className="text-sm font-medium text-green-600 mt-1">Est. ${l.estimatedValue}</div>}
                </div>
                <div className="flex flex-col gap-2">
                  {l.status === "new" && (
                    <>
                      <button onClick={() => updateLead(l.id, { status: "contacted" })} className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg">Contact</button>
                      <button onClick={() => convertToJob(l.id)} className="text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-lg">→ Job</button>
                    </>
                  )}
                  {l.status === "contacted" && <button onClick={() => updateLead(l.id, { status: "quoted" })} className="text-sm bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg">Quote</button>}
                  {l.status === "quoted" && (
                    <>
                      <button onClick={() => convertToJob(l.id)} className="text-sm bg-green-100 text-green-700 px-3 py-1.5 rounded-lg">Accept</button>
                      <button onClick={() => updateLead(l.id, { status: "declined" })} className="text-sm text-red-500">Decline</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
