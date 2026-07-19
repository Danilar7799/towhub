"use client";

import { useState, useEffect } from "react";

interface Lead {
  id: string; source: string; customerName?: string; customerPhone?: string;
  customerEmail?: string; message?: string; pickupAddress?: string;
  estimatedValue?: number; status: string; createdAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  new: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", border: "border-[#bfdbfe]" },
  contacted: { bg: "bg-[#fef3c7]", text: "text-[#92400e]", border: "border-[#fde68a]" },
  quoted: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]", border: "border-[#e9d5ff]" },
  accepted: { bg: "bg-[#dcfce7]", text: "text-[#166534]", border: "border-[#bbf7d0]" },
  declined: { bg: "bg-[#fef2f2]", text: "text-[#991b1b]", border: "border-[#fecaca]" },
  expired: { bg: "bg-[#f6f9fc]", text: "text-[#94a3b8]", border: "border-[#e5edf5]" },
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
  const newCount = leads.filter(l => l.status === "new").length;

  const updateLead = async (id: string, updates: Record<string, unknown>) => {
    await fetch("/api/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    load();
  };

  const convertToJob = async (id: string) => {
    const res = await fetch("/api/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, convertToJob: true }) });
    if (res.ok) { load(); }
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Leads</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">{newCount} new lead{newCount !== 1 ? "s" : ""} • {leads.length} total</p>
        </div>
      </div>

      {/* Source filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[{ l: "All", v: "all" }, { l: "🟡 Yelp", v: "yelp" }, { l: "🟢 Thumbtack", v: "thumbtack" }, { l: "🔵 Google", v: "google" }, { l: "📞 Phone", v: "phone" }, { l: "🌐 Website", v: "website" }, { l: "✏️ Manual", v: "manual" }].map(s => (
          <button key={s.v} onClick={() => setFilter(s.v)}
            className={`px-3 py-1.5 rounded text-[12px] font-medium whitespace-nowrap ${filter === s.v ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"}`}>
            {s.l}
          </button>
        ))}
      </div>

      {/* Integration notice */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-[#533afd]/[0.06] rounded-lg flex items-center justify-center text-[20px]">🔗</div>
        <div>
          <div className="text-[13px] font-medium text-[#061b31]">Lead Integrations</div>
          <div className="text-[12px] text-[#64748d]">Yelp and Thumbtack API integrations will auto-import leads here. Configure in Settings.</div>
        </div>
      </div>

      {/* Leads list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">🔗</div>
          <div className="text-[14px] text-[#64748d]">No {filter !== "all" ? filter : ""} leads yet.</div>
          <div className="text-[12px] text-[#94a3b8] mt-1">Leads from Yelp, Thumbtack, and Google will appear automatically.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(l => {
            const s = STATUS_STYLES[l.status] || STATUS_STYLES.new;
            return (
              <div key={l.id} className="bg-white border border-[#e5edf5] rounded-lg p-5 hover:border-[#b9b9f9] hover:shadow-[0_4px_12px_rgba(50,50,93,0.06)] transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[14px]">{SOURCE_ICONS[l.source] || "📌"}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>{l.status}</span>
                      <span className="text-[10px] text-[#94a3b8] capitalize">{l.source}</span>
                      <span className="text-[10px] text-[#94a3b8]">{new Date(l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="text-[14px] font-medium text-[#061b31]">{l.customerName || "Unknown"}</div>
                    <div className="flex items-center gap-3 mt-1">
                      {l.customerPhone && <span className="text-[12px] text-[#64748d]">📞 {l.customerPhone}</span>}
                      {l.customerEmail && <span className="text-[12px] text-[#64748d]">📧 {l.customerEmail}</span>}
                    </div>
                    {l.pickupAddress && <div className="text-[12px] text-[#64748d] mt-1">📍 {l.pickupAddress}</div>}
                    {l.message && <div className="text-[12px] text-[#94a3b8] mt-1 line-clamp-2">{l.message}</div>}
                    {l.estimatedValue && <div className="text-[13px] font-medium text-[#15be53] mt-1">Est. ${l.estimatedValue}</div>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {l.status === "new" && (
                      <>
                        <button onClick={() => updateLead(l.id, { status: "contacted" })} className="px-3 py-1.5 rounded text-[12px] font-medium bg-[#fef3c7] text-[#92400e] border border-[#fde68a] hover:bg-[#fde68a] transition-colors">Contact</button>
                        <button onClick={() => convertToJob(l.id)} className="px-3 py-1.5 rounded text-[12px] font-medium bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] hover:bg-[#bbf7d0] transition-colors">→ Job</button>
                      </>
                    )}
                    {l.status === "contacted" && <button onClick={() => updateLead(l.id, { status: "quoted" })} className="px-3 py-1.5 rounded text-[12px] font-medium bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff] hover:bg-[#e9d5ff] transition-colors">Quote</button>}
                    {l.status === "quoted" && (
                      <>
                        <button onClick={() => convertToJob(l.id)} className="px-3 py-1.5 rounded text-[12px] font-medium bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] hover:bg-[#bbf7d0] transition-colors">Accept</button>
                        <button onClick={() => updateLead(l.id, { status: "declined" })} className="px-3 py-1.5 rounded text-[12px] font-medium text-[#dc2626] bg-[#fef2f2] border border-[#fecaca]">Decline</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
