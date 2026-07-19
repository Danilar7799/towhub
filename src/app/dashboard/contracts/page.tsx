"use client";

import { useState, useEffect } from "react";

interface Contract { id: string; contractType: string; status: string; title: string; terms?: string; ratePerMile?: number; flatRate?: number; monthlyRetainer?: number; commission?: number; startDate: string; endDate: string; notifyDaysBefore: number; isAutoRenew: boolean; notes?: string; }

const STATUS_STYLES: Record<string, string> = {
  active: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]",
  expired: "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]",
  terminated: "bg-[#f6f9fc] text-[#94a3b8] border-[#e5edf5]",
  pending: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ contractType: "b2b", title: "", terms: "", ratePerMile: "", flatRate: "", monthlyRetainer: "", commission: "", startDate: "", endDate: "", notifyDaysBefore: "30", isAutoRenew: false, notes: "" });

  const load = () => fetch("/api/contracts").then(r => r.json()).then(d => setContracts(d.contracts || []));
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? contracts : contracts.filter(c => c.status === filter);

  // Check for expiring contracts
  const expiring = contracts.filter(c => {
    const daysLeft = (new Date(c.endDate).getTime() - Date.now()) / 86400000;
    return c.status === "active" && daysLeft > 0 && daysLeft <= c.notifyDaysBefore;
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowAdd(false); load();
  };

  const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-[20px] font-semibold tracking-[-0.3px]">Contracts</h2><p className="text-[13px] text-[#64748d] mt-0.5">B2B & B2C contracts with expiration tracking</p></div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">+ New Contract</button>
      </div>

      {/* Expiring warning */}
      {expiring.length > 0 && (
        <div className="bg-[#fef3c7] border border-[#fde68a] rounded-lg p-4 flex items-center gap-3">
          <span className="text-[20px]">⚠️</span>
          <div><div className="text-[13px] font-medium text-[#92400e]">{expiring.length} contract(s) expiring soon</div><div className="text-[12px] text-[#b45309]">{expiring.map(c => c.title).join(", ")}</div></div>
        </div>
      )}

      <div className="flex gap-2">
        {["all", "active", "expired", "pending"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded text-[12px] font-medium capitalize ${filter === f ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">📄</div><div className="text-[14px] text-[#64748d]">No contracts yet.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const days = daysUntil(c.endDate);
            return (
              <div key={c.id} className="bg-white border border-[#e5edf5] rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[15px] font-semibold">{c.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                      <span className="text-[10px] bg-[#f6f9fc] text-[#64748d] px-1.5 py-0.5 rounded uppercase">{c.contractType}</span>
                    </div>
                    {c.terms && <p className="text-[13px] text-[#64748d] mt-1 line-clamp-2">{c.terms}</p>}
                    <div className="flex gap-4 mt-2 text-[12px] text-[#64748d]">
                      {c.ratePerMile && <span>${c.ratePerMile}/mi</span>}
                      {c.flatRate && <span>Flat: ${c.flatRate}</span>}
                      {c.monthlyRetainer && <span>Retainer: ${c.monthlyRetainer}/mo</span>}
                      {c.commission && <span>{c.commission}%</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] text-[#64748d]">Expires</div>
                    <div className={`text-[14px] font-medium ${days < 0 ? "text-[#dc2626]" : days < 30 ? "text-[#f59e0b]" : "text-[#061b31]"}`}>
                      {days < 0 ? "Expired" : `${days} days`}
                    </div>
                    <div className="text-[11px] text-[#94a3b8] mt-1">{new Date(c.endDate).toLocaleDateString()}</div>
                    {c.isAutoRenew && <div className="text-[10px] text-[#15be53] mt-1">Auto-renew</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold mb-6">New Contract</h2>
            <form onSubmit={add} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Type *</label><select value={form.contractType} onChange={e => setForm(f => ({ ...f, contractType: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none"><option value="b2b">B2B</option><option value="b2c">B2C</option></select></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Title *</label><input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Terms</label><textarea rows={2} value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Start Date *</label><input required type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">End Date *</label><input required type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">$/Mile</label><input type="number" value={form.ratePerMile} onChange={e => setForm(f => ({ ...f, ratePerMile: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Retainer $/mo</label><input type="number" value={form.monthlyRetainer} onChange={e => setForm(f => ({ ...f, monthlyRetainer: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Notify Before (days)</label><input type="number" value={form.notifyDaysBefore} onChange={e => setForm(f => ({ ...f, notifyDaysBefore: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
