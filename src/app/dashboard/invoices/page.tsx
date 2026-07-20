"use client";

import { useState, useEffect } from "react";

interface Invoice {
  id: string; invoiceNumber: string; status: string; jobId?: string; customerId?: string;
  subtotal: number; tax: number; discount: number; total: number; paidAmount: number;
  paymentMethod?: string; notes?: string; dueDate?: string; paidAt?: string; sentAt?: string; createdAt: string;
  // Enriched
  customerName?: string; customerPhone?: string; customerEmail?: string;
  jobPickup?: string; jobDestination?: string; jobVehicle?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: "bg-[#f6f9fc]", text: "text-[#64748d]", border: "border-[#e5edf5]" },
  sent: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", border: "border-[#bfdbfe]" },
  paid: { bg: "bg-[#dcfce7]", text: "text-[#166534]", border: "border-[#bbf7d0]" },
  overdue: { bg: "bg-[#fef2f2]", text: "text-[#991b1b]", border: "border-[#fecaca]" },
  cancelled: { bg: "bg-[#f6f9fc]", text: "text-[#94a3b8]", border: "border-[#e5edf5]" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInv, setSelectedInv] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ subtotal: "", tax: "", discount: "", notes: "", dueDate: "", customerName: "", customerPhone: "", customerEmail: "" });

  const load = () => fetch("/api/invoices").then(r => r.json()).then(d => setInvoices(d.invoices || []));
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? invoices : invoices.filter(i => i.status === filter);
  const totalOutstanding = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.total - (i.paidAmount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const counts = (s: string) => invoices.filter(i => i.status === s).length;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, subtotal: parseFloat(form.subtotal), tax: parseFloat(form.tax || "0"), discount: parseFloat(form.discount || "0") }) });
    if (res.ok) { setShowAdd(false); setForm({ subtotal: "", tax: "", discount: "", notes: "", dueDate: "", customerName: "", customerPhone: "", customerEmail: "" }); load(); }
  };

  const markPaid = async (id: string) => {
    await fetch("/api/invoices", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "paid", paidAmount: invoices.find(i => i.id === id)?.total }) });
    load();
    if (selectedInv?.id === id) setSelectedInv(null);
  };

  const sendPaymentLink = async (id: string) => {
    try {
      const res = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId: id }) });
      const data = await res.json();
      if (data.checkoutUrl) window.open(data.checkoutUrl, "_blank");
    } catch {}
  };

  const viewPDF = (id: string) => {
    window.open(`/api/invoices/pdf?id=${id}`, "_blank");
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Left: Invoice list */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Invoices</h2>
            <p className="text-[13px] text-[#64748d] mt-0.5">{invoices.length} invoices • ${totalRevenue.toFixed(0)} total</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
            + Create Invoice
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Outstanding", value: `$${totalOutstanding.toFixed(0)}`, accent: "#ea2261" },
            { label: "Paid", value: `$${totalPaid.toFixed(0)}`, accent: "#15be53" },
            { label: "Total Revenue", value: `$${totalRevenue.toFixed(0)}`, accent: "#533afd" },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-3.5">
              <div className="text-[10px] text-[#64748d] uppercase tracking-wider mb-0.5">{s.label}</div>
              <div className="text-[22px] font-light tracking-[-0.5px]" style={{ color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {[{ l: "All", v: "all" }, { l: "Draft", v: "draft" }, { l: "Sent", v: "sent" }, { l: "Paid", v: "paid" }, { l: "Overdue", v: "overdue" }].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium whitespace-nowrap ${filter === f.v ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"}`}>
              {f.l} {f.v !== "all" && `(${counts(f.v)})`}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
              <div className="text-[32px] mb-3 opacity-30">📄</div>
              <div className="text-[14px] text-[#64748d]">No {filter !== "all" ? filter : ""} invoices yet.</div>
            </div>
          ) : filtered.map(inv => {
            const s = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
            const isOverdue = inv.status === "overdue" || (inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status === "sent");
            return (
              <div key={inv.id} onClick={() => setSelectedInv(inv)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(50,50,93,0.06)] ${
                  selectedInv?.id === inv.id ? "border-[#533afd] shadow-[0_4px_12px_rgba(83,58,253,0.1)]" :
                  isOverdue ? "border-[#fecaca]" : "border-[#e5edf5]"
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-[14px] font-mono font-medium text-[#061b31]">{inv.invoiceNumber}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>{inv.status}</span>
                    {isOverdue && inv.status !== "paid" && <span className="text-[10px] text-[#dc2626] font-medium">⚠ Overdue</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] font-semibold text-[#061b31]">${inv.total.toFixed(2)}</div>
                    <div className="text-[10px] text-[#94a3b8]">Due {fmtDate(inv.dueDate)}</div>
                  </div>
                </div>
                {/* Quick info */}
                <div className="flex items-center gap-4 mt-2 text-[11px] text-[#64748d]">
                  <span>Subtotal: ${inv.subtotal.toFixed(2)}</span>
                  {inv.tax > 0 && <span>Tax: ${inv.tax.toFixed(2)}</span>}
                  {inv.discount > 0 && <span>Discount: -${inv.discount.toFixed(2)}</span>}
                  <span>Created: {fmtDate(inv.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Invoice detail panel */}
      {selectedInv && (
        <div className="w-[400px] bg-white border border-[#e5edf5] rounded-lg overflow-hidden shrink-0 flex flex-col">
          <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center justify-between">
            <div className="text-[15px] font-semibold">Invoice Details</div>
            <button onClick={() => setSelectedInv(null)} className="text-[#64748d] hover:text-[#061b31] text-lg">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Header */}
            <div className="text-center pb-4 border-b border-[#e5edf5]">
              <div className="text-[28px] font-light text-[#533afd] tracking-[-1px] mb-1">INVOICE</div>
              <div className="text-[16px] font-mono font-semibold">{selectedInv.invoiceNumber}</div>
              <div className="mt-2">
                {(() => { const s = STATUS_STYLES[selectedInv.status] || STATUS_STYLES.draft; return (
                  <span className={`inline-flex px-3 py-1 rounded text-[12px] font-medium border ${s.bg} ${s.text} ${s.border}`}>{selectedInv.status.toUpperCase()}</span>
                ); })()}
              </div>
            </div>

            {/* Customer */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Bill To</div>
              <div className="text-[14px] font-medium text-[#061b31]">{selectedInv.customerName || "Walk-in Customer"}</div>
              {selectedInv.customerPhone && <div className="text-[12px] text-[#64748d]">📞 {selectedInv.customerPhone}</div>}
              {selectedInv.customerEmail && <div className="text-[12px] text-[#64748d]">📧 {selectedInv.customerEmail}</div>}
            </div>

            {/* Job Details */}
            {selectedInv.jobId && (
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Job Details</div>
                <div className="bg-[#f6f9fc] rounded-lg p-3 space-y-1">
                  {selectedInv.jobPickup && <div className="text-[12px]"><span className="text-[#94a3b8]">From:</span> {selectedInv.jobPickup}</div>}
                  {selectedInv.jobDestination && <div className="text-[12px]"><span className="text-[#94a3b8]">To:</span> {selectedInv.jobDestination}</div>}
                  {selectedInv.jobVehicle && <div className="text-[12px]"><span className="text-[#94a3b8]">Vehicle:</span> {selectedInv.jobVehicle}</div>}
                  <div className="text-[11px] text-[#94a3b8] font-mono">Job #{selectedInv.jobId.slice(0, 8)}</div>
                </div>
              </div>
            )}

            {/* Line Items */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Line Items</div>
              <div className="border border-[#e5edf5] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#f6f9fc]">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] font-medium text-[#64748d] uppercase">Description</th>
                      <th className="text-right px-3 py-2 text-[10px] font-medium text-[#64748d] uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5edf5]">
                    <tr>
                      <td className="px-3 py-2 text-[12px] text-[#061b31]">Towing Services</td>
                      <td className="px-3 py-2 text-[12px] text-right font-medium">${selectedInv.subtotal.toFixed(2)}</td>
                    </tr>
                    {selectedInv.tax > 0 && (
                      <tr>
                        <td className="px-3 py-2 text-[12px] text-[#64748d]">Tax (8.75%)</td>
                        <td className="px-3 py-2 text-[12px] text-right">${selectedInv.tax.toFixed(2)}</td>
                      </tr>
                    )}
                    {selectedInv.discount > 0 && (
                      <tr>
                        <td className="px-3 py-2 text-[12px] text-[#15be53]">Discount</td>
                        <td className="px-3 py-2 text-[12px] text-right text-[#15be53]">-${selectedInv.discount.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-[#f6f9fc] rounded-lg p-4">
              <div className="flex justify-between text-[13px] mb-1"><span className="text-[#64748d]">Subtotal</span><span>${selectedInv.subtotal.toFixed(2)}</span></div>
              {selectedInv.tax > 0 && <div className="flex justify-between text-[13px] mb-1"><span className="text-[#64748d]">Tax</span><span>${selectedInv.tax.toFixed(2)}</span></div>}
              {selectedInv.discount > 0 && <div className="flex justify-between text-[13px] mb-1"><span className="text-[#15be53]">Discount</span><span className="text-[#15be53]">-${selectedInv.discount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-[18px] font-semibold pt-2 border-t border-[#e5edf5] mt-2">
                <span>Total</span>
                <span>${selectedInv.total.toFixed(2)}</span>
              </div>
              {selectedInv.paidAmount > 0 && (
                <div className="flex justify-between text-[13px] mt-1"><span className="text-[#15be53]">Paid</span><span className="text-[#15be53]">${selectedInv.paidAmount.toFixed(2)}</span></div>
              )}
              {selectedInv.status !== "paid" && selectedInv.paidAmount < selectedInv.total && (
                <div className="flex justify-between text-[13px] mt-1"><span className="text-[#ea2261]">Balance Due</span><span className="text-[#ea2261] font-medium">${(selectedInv.total - (selectedInv.paidAmount || 0)).toFixed(2)}</span></div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div><span className="text-[#94a3b8]">Created:</span> <span className="font-medium">{fmtDate(selectedInv.createdAt)}</span></div>
              <div><span className="text-[#94a3b8]">Due Date:</span> <span className="font-medium">{fmtDate(selectedInv.dueDate)}</span></div>
              {selectedInv.sentAt && <div><span className="text-[#94a3b8]">Sent:</span> <span className="font-medium">{fmtDate(selectedInv.sentAt)}</span></div>}
              {selectedInv.paidAt && <div><span className="text-[#15be53]">Paid:</span> <span className="font-medium text-[#15be53]">{fmtDate(selectedInv.paidAt)}</span></div>}
            </div>

            {/* Notes */}
            {selectedInv.notes && (
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Notes</div>
                <div className="text-[12px] text-[#64748d] bg-[#f6f9fc] rounded p-3">{selectedInv.notes}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-[#e5edf5] space-y-2">
            <div className="flex gap-2">
              <button onClick={() => viewPDF(selectedInv.id)} className="flex-1 py-2 border border-[#e5edf5] rounded text-[12px] font-medium hover:bg-[#f6f9fc] transition-colors">
                📄 View PDF
              </button>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/invoices/pdf?id=${selectedInv.id}`); }} className="flex-1 py-2 border border-[#e5edf5] rounded text-[12px] font-medium hover:bg-[#f6f9fc] transition-colors">
                🔗 Copy Link
              </button>
            </div>
            {selectedInv.status !== "paid" && (
              <div className="flex gap-2">
                <button onClick={() => markPaid(selectedInv.id)} className="flex-1 py-2.5 bg-[#15be53] text-white rounded text-[12px] font-medium hover:bg-[#12a347] transition-colors">
                  ✓ Mark Paid
                </button>
                {["sent", "overdue"].includes(selectedInv.status) && (
                  <button onClick={() => sendPaymentLink(selectedInv.id)} className="flex-1 py-2.5 bg-[#533afd] text-white rounded text-[12px] font-medium hover:bg-[#4434d4] transition-colors">
                    💳 Pay Online
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px] mb-6">Create Invoice</h2>
            <form onSubmit={create} className="space-y-4">
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider">Customer</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Name</label><input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Phone</label><input value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Email</label><input type="email" value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider">Pricing</div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Subtotal *</label><input required type="number" step="0.01" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Tax</label><input type="number" step="0.01" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Discount</label><input type="number" step="0.01" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Due Date</label><input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
