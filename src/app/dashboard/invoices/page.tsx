"use client";

import { useState, useEffect } from "react";

interface Invoice { id: string; invoiceNumber: string; status: string; subtotal: number; tax: number; discount: number; total: number; paidAmount: number; dueDate?: string; createdAt: string; }

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[#f6f9fc] text-[#64748d] border-[#e5edf5]",
  sent: "bg-[#dbeafe] text-[#1e40af] border-[#bfdbfe]",
  paid: "bg-[#dcfce7] text-[#166534] border-[#bbf7d0]",
  overdue: "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]",
  cancelled: "bg-[#f6f9fc] text-[#94a3b8] border-[#e5edf5]",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ subtotal: "", tax: "", discount: "", notes: "", dueDate: "" });

  const load = () => fetch("/api/invoices").then(r => r.json()).then(d => setInvoices(d.invoices || []));
  useEffect(() => { load(); }, []);

  const totalOutstanding = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.total - (i.paidAmount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, subtotal: parseFloat(form.subtotal), tax: parseFloat(form.tax || "0"), discount: parseFloat(form.discount || "0") }) });
    if (res.ok) { setShowAdd(false); setForm({ subtotal: "", tax: "", discount: "", notes: "", dueDate: "" }); load(); }
  };

  const markPaid = async (id: string) => {
    await fetch("/api/invoices", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "paid", paidAmount: invoices.find(i => i.id === id)?.total }) });
    load();
  };

  const sendPaymentLink = async (id: string) => {
    try {
      const res = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: id }) });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
      } else {
        alert(data.message || "Payment link not available");
      }
    } catch { alert("Error creating payment link"); }
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Invoices</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">{invoices.length} invoices total</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">+ Create Invoice</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5"><div className="text-[12px] text-[#64748d] uppercase tracking-wider mb-1">Outstanding</div><div className="text-[28px] font-light text-[#ea2261]">${totalOutstanding.toFixed(0)}</div></div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5"><div className="text-[12px] text-[#64748d] uppercase tracking-wider mb-1">Paid</div><div className="text-[28px] font-light text-[#15be53]">${totalPaid.toFixed(0)}</div></div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5"><div className="text-[12px] text-[#64748d] uppercase tracking-wider mb-1">Total</div><div className="text-[28px] font-light">{invoices.length}</div></div>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">📄</div>
          <div className="text-[14px] text-[#64748d]">No invoices yet. Create one from a completed job or manually.</div>
        </div>
      ) : (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>{["Invoice", "Status", "Amount", "Due Date", "Actions"].map(h => <th key={h} className="text-left px-5 py-2.5 text-[12px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-[#f6f9fc]">
                  <td className="px-5 py-3 text-[14px] font-mono">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${STATUS_STYLES[inv.status]}`}>{inv.status}</span></td>
                  <td className="px-5 py-3 text-[14px] font-medium">${inv.total.toFixed(2)}</td>
                  <td className="px-5 py-3 text-[13px] text-[#64748d]">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {inv.status !== "paid" && <button onClick={() => markPaid(inv.id)} className="text-[12px] text-[#15be53] font-medium hover:underline">Mark Paid</button>}
                      {["sent", "overdue"].includes(inv.status) && <button onClick={() => sendPaymentLink(inv.id)} className="text-[12px] text-[#533afd] font-medium hover:underline">Pay Online →</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold mb-6">Create Invoice</h2>
            <form onSubmit={create} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Subtotal *</label><input required type="number" step="0.01" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Tax</label><input type="number" step="0.01" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Discount</label><input type="number" step="0.01" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none resize-none" /></div>
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
