"use client";

import { useState, useEffect } from "react";

interface Contract {
  id: string; contractType: string; status: string; title: string; description?: string;
  terms?: string; partyName: string; customerId?: string; subcontractorId?: string;
  ratePerMile?: number; flatRate?: number; monthlyRetainer?: number; commission?: number;
  startDate: string; endDate: string; renewalDate?: string;
  notifyDaysBefore: number; isAutoRenew: boolean; notes?: string; createdAt: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: "bg-[#dcfce7]", text: "text-[#166534]", border: "border-[#bbf7d0]" },
  expired: { bg: "bg-[#fef3c7]", text: "text-[#92400e]", border: "border-[#fde68a]" },
  terminated: { bg: "bg-[#fef2f2]", text: "text-[#991b1b]", border: "border-[#fecaca]" },
  pending: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", border: "border-[#bfdbfe]" },
};

export default function ContractsPage() {
  const [tab, setTab] = useState<"b2b" | "b2c">("b2b");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", terms: "", ratePerMile: "", flatRate: "",
    monthlyRetainer: "", commission: "", startDate: "", endDate: "",
    renewalDate: "", notifyDaysBefore: "30", isAutoRenew: false, notes: "",
  });

  const load = () => fetch(`/api/contracts?type=${tab}`).then(r => r.json()).then(d => setContracts(d.contracts || []));
  useEffect(() => { load(); }, [tab]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractType: tab, ...form }),
    });
    if (res.ok) { setShowAdd(false); resetForm(); load(); }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch("/api/contracts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: newStatus }) });
    load();
    if (selectedContract?.id === id) setSelectedContract(null);
  };

  const resetForm = () => setForm({ title: "", description: "", terms: "", ratePerMile: "", flatRate: "", monthlyRetainer: "", commission: "", startDate: "", endDate: "", renewalDate: "", notifyDaysBefore: "30", isAutoRenew: false, notes: "" });

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  const isExpiringSoon = (c: Contract) => {
    if (!c.endDate) return false;
    const daysLeft = (new Date(c.endDate).getTime() - Date.now()) / 86400000;
    return daysLeft <= c.notifyDaysBefore && daysLeft > 0;
  };

  const b2bContracts = contracts.filter(c => c.contractType === "b2b");
  const b2cContracts = contracts.filter(c => c.contractType === "b2c");
  const activeTab = tab === "b2b" ? b2bContracts : b2cContracts;

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Left: Contract list */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Contracts</h2>
            <p className="text-[13px] text-[#64748d] mt-0.5">Manage B2B partnerships and B2C client agreements</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
            + New Contract
          </button>
        </div>

        {/* B2B / B2C Tabs */}
        <div className="flex gap-1 mb-4 bg-[#f6f9fc] p-1 rounded-lg w-fit">
          {[
            { v: "b2b" as const, l: "B2B", desc: "Subcontractor partnerships", count: b2bContracts.length },
            { v: "b2c" as const, l: "B2C", desc: "Client agreements", count: b2cContracts.length },
          ].map(t => (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all flex items-center gap-2 ${
                tab === t.v
                  ? "bg-white text-[#061b31] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                  : "text-[#64748d] hover:text-[#061b31]"
              }`}>
              <span>{t.l}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tab === t.v ? "bg-[#533afd] text-white" : "bg-[#e5edf5] text-[#64748d]"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Expiring soon warning */}
        {activeTab.some(isExpiringSoon) && (
          <div className="bg-[#fef3c7] border border-[#fde68a] rounded-lg p-3 mb-4 flex items-center gap-2">
            <span className="text-[16px]">⚠️</span>
            <span className="text-[12px] text-[#92400e] font-medium">
              {activeTab.filter(isExpiringSoon).length} contract{activeTab.filter(isExpiringSoon).length > 1 ? "s" : ""} expiring soon — review and renew
            </span>
          </div>
        )}

        {/* Contract list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {activeTab.length === 0 ? (
            <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
              <div className="text-[32px] mb-3 opacity-30">{tab === "b2b" ? "🤝" : "📝"}</div>
              <div className="text-[14px] text-[#64748d]">No {tab.toUpperCase()} contracts yet.</div>
              <div className="text-[12px] text-[#94a3b8] mt-1">
                {tab === "b2b" ? "Create partnerships with subcontractors" : "Create agreements with your clients"}
              </div>
            </div>
          ) : activeTab.map(c => {
            const s = STATUS_STYLES[c.status] || STATUS_STYLES.pending;
            const expiring = isExpiringSoon(c);
            return (
              <div key={c.id} onClick={() => setSelectedContract(c)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(50,50,93,0.06)] ${
                  selectedContract?.id === c.id ? "border-[#533afd] shadow-[0_4px_12px_rgba(83,58,253,0.1)]" :
                  expiring ? "border-[#fde68a]" : "border-[#e5edf5]"
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>{c.status}</span>
                      <span className="text-[10px] bg-[#f6f9fc] text-[#64748d] px-1.5 py-0.5 rounded border border-[#e5edf5] font-medium">{c.contractType.toUpperCase()}</span>
                      {expiring && <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-1.5 py-0.5 rounded font-medium">Expiring soon</span>}
                      {c.isAutoRenew && <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-1.5 py-0.5 rounded font-medium">Auto-renew</span>}
                    </div>
                    <div className="text-[14px] font-medium text-[#061b31] truncate">{c.title}</div>
                    <div className="text-[12px] text-[#64748d] mt-0.5">
                      {c.partyName} • {fmtDate(c.startDate)} → {fmtDate(c.endDate)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {c.monthlyRetainer && <div className="text-[14px] font-medium">${c.monthlyRetainer}/mo</div>}
                    {c.flatRate && <div className="text-[12px] text-[#64748d]">${c.flatRate} flat</div>}
                    {c.commission && <div className="text-[12px] text-[#64748d]">{c.commission}% commission</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Contract detail panel */}
      {selectedContract && (
        <div className="w-[380px] bg-white border border-[#e5edf5] rounded-lg overflow-hidden shrink-0 flex flex-col">
          <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center justify-between">
            <div className="text-[15px] font-semibold">Contract Details</div>
            <button onClick={() => setSelectedContract(null)} className="text-[#64748d] hover:text-[#061b31] text-lg">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Status */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Status</div>
              <div className="flex gap-1.5">
                {(["active", "expired", "terminated", "pending"] as const).map(s => (
                  <button key={s} onClick={() => updateStatus(selectedContract.id, s)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                      selectedContract.status === s
                        ? `${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].text} ${STATUS_STYLES[s].border}`
                        : "bg-white border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"
                    }`}>{s}</button>
                ))}
              </div>
            </div>

            {/* Title + Party */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Contract</div>
              <div className="text-[14px] font-medium text-[#061b31]">{selectedContract.title}</div>
              <div className="text-[13px] text-[#64748d] mt-1">{selectedContract.partyName}</div>
              {selectedContract.description && <div className="text-[12px] text-[#64748d] mt-1">{selectedContract.description}</div>}
            </div>

            {/* Terms */}
            {selectedContract.terms && (
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Terms</div>
                <div className="text-[12px] text-[#64748d] bg-[#f6f9fc] rounded p-3">{selectedContract.terms}</div>
              </div>
            )}

            {/* Rates */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Rates</div>
              <div className="space-y-1">
                {selectedContract.ratePerMile && <div className="flex justify-between text-[13px]"><span className="text-[#64748d]">Per Mile</span><span className="font-medium">${selectedContract.ratePerMile}/mi</span></div>}
                {selectedContract.flatRate && <div className="flex justify-between text-[13px]"><span className="text-[#64748d]">Flat Rate</span><span className="font-medium">${selectedContract.flatRate}</span></div>}
                {selectedContract.monthlyRetainer && <div className="flex justify-between text-[13px]"><span className="text-[#64748d]">Monthly Retainer</span><span className="font-medium">${selectedContract.monthlyRetainer}</span></div>}
                {selectedContract.commission && <div className="flex justify-between text-[13px]"><span className="text-[#64748d]">Commission</span><span className="font-medium">{selectedContract.commission}%</span></div>}
              </div>
            </div>

            {/* Dates */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Dates</div>
              <div className="space-y-1">
                <div className="flex justify-between text-[13px]"><span className="text-[#64748d]">Start</span><span>{fmtDate(selectedContract.startDate)}</span></div>
                <div className="flex justify-between text-[13px]"><span className="text-[#64748d]">End</span><span>{fmtDate(selectedContract.endDate)}</span></div>
                {selectedContract.renewalDate && <div className="flex justify-between text-[13px]"><span className="text-[#64748d]">Renewal</span><span>{fmtDate(selectedContract.renewalDate)}</span></div>}
                <div className="flex justify-between text-[13px]"><span className="text-[#64748d]">Notify before</span><span>{selectedContract.notifyDaysBefore} days</span></div>
              </div>
            </div>

            {/* Notes */}
            {selectedContract.notes && (
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Notes</div>
                <div className="text-[12px] text-[#64748d] bg-[#f6f9fc] rounded p-3">{selectedContract.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px] mb-1">New {tab.toUpperCase()} Contract</h2>
            <p className="text-[13px] text-[#64748d] mb-6">
              {tab === "b2b" ? "Partnership agreement with a subcontractor" : "Service agreement with a client"}
            </p>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" placeholder={tab === "b2b" ? "e.g. Metro Towing Partnership" : "e.g. ABC Corp Fleet Agreement"} />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Terms</label>
                <textarea rows={3} value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Start Date *</label><input required type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">End Date</label><input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              </div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider">Rates</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Per Mile ($)</label><input type="number" step="0.01" value={form.ratePerMile} onChange={e => setForm(f => ({ ...f, ratePerMile: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Flat Rate ($)</label><input type="number" step="0.01" value={form.flatRate} onChange={e => setForm(f => ({ ...f, flatRate: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Monthly Retainer ($)</label><input type="number" step="0.01" value={form.monthlyRetainer} onChange={e => setForm(f => ({ ...f, monthlyRetainer: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Commission (%)</label><input type="number" step="0.01" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Renewal Date</label><input type="date" value={form.renewalDate} onChange={e => setForm(f => ({ ...f, renewalDate: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Notify Before (days)</label><input type="number" value={form.notifyDaysBefore} onChange={e => setForm(f => ({ ...f, notifyDaysBefore: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="autoRenew" checked={form.isAutoRenew} onChange={e => setForm(f => ({ ...f, isAutoRenew: e.target.checked }))} className="rounded border-[#e5edf5]" />
                <label htmlFor="autoRenew" className="text-[13px] text-[#64748d]">Auto-renew</label>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">Create Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
