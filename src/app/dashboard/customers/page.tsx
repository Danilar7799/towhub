"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Customer { id: string; name: string; email?: string; phone?: string; company?: string; city?: string; totalJobs: number; totalSpent: number; isVip: boolean; createdAt: string; }

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", address: "", city: "", state: "", notes: "" });

  const load = () => fetch(`/api/customers${search ? `?q=${search}` : ""}`).then(r => r.json()).then(d => setCustomers(d.customers || []));
  useEffect(() => { load(); }, [search]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { setShowAdd(false); setForm({ name: "", email: "", phone: "", company: "", address: "", city: "", state: "", notes: "" }); load(); }
  };

  const toggleVip = async (c: Customer) => {
    await fetch("/api/customers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, isVip: !c.isVip }) });
    load();
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Customers</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">{customers.length} customers in your database</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4]">+ Add Customer</button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, or email..." className="w-full max-w-sm px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] outline-none" />

      {customers.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">👤</div>
          <div className="text-[14px] text-[#64748d]">No customers yet. They&apos;ll be auto-created from jobs or add manually.</div>
        </div>
      ) : (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>
                {["Name", "Contact", "Company", "Jobs", "Spent", ""].map(h => <th key={h} className="text-left px-5 py-2.5 text-[12px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-[#f6f9fc] cursor-pointer" onClick={() => router.push(`/dashboard/customers/${c.id}`)}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium">{c.name}</span>
                      {c.isVip && <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-1.5 py-0.5 rounded font-medium">VIP</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-[#64748d]">{c.phone || c.email || "—"}</td>
                  <td className="px-5 py-3 text-[13px] text-[#64748d]">{c.company || "—"}</td>
                  <td className="px-5 py-3 text-[14px]">{c.totalJobs}</td>
                  <td className="px-5 py-3 text-[14px] font-medium">${(c.totalSpent || 0).toFixed(0)}</td>
                  <td className="px-5 py-3 text-right"><button onClick={(e) => { e.stopPropagation(); toggleVip(c); }} className="text-[12px] text-[#533afd]">{c.isVip ? "Remove VIP" : "Mark VIP"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold mb-6">Add Customer</h2>
            <form onSubmit={add} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Name *</label><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Company</label><input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Address</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd] resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
