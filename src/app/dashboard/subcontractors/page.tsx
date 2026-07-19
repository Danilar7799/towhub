"use client";

import { useState, useEffect } from "react";

interface SubDriver { id: string; firstName: string; lastName: string; phone?: string; email?: string; }
interface SubVehicle { id: string; name: string; type: string; make?: string; model?: string; licensePlate?: string; }
interface Subcontractor { id: string; companyName: string; contactName?: string; email?: string; phone?: string; city?: string; state?: string; mcNumber?: string; dotNumber?: string; ratePerMile?: number; flatRate?: number; commission?: number; isActive: boolean; drivers: SubDriver[]; vehicles: SubVehicle[]; }

export default function SubcontractorsPage() {
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ companyName: "", contactName: "", email: "", phone: "", address: "", city: "", state: "", mcNumber: "", dotNumber: "", ratePerMile: "", flatRate: "", commission: "", notes: "" });

  const load = () => fetch("/api/subcontractors").then(r => r.json()).then(d => setSubs(d.subcontractors || []));
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/subcontractors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowAdd(false); setForm({ companyName: "", contactName: "", email: "", phone: "", address: "", city: "", state: "", mcNumber: "", dotNumber: "", ratePerMile: "", flatRate: "", commission: "", notes: "" }); load();
  };

  const toggle = async (id: string, isActive: boolean) => {
    await fetch("/api/subcontractors", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !isActive }) });
    load();
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-[20px] font-semibold tracking-[-0.3px]">Subcontractors</h2><p className="text-[13px] text-[#64748d] mt-0.5">Manage partner companies, their fleet and drivers</p></div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">+ Add Subcontractor</button>
      </div>

      {subs.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">🏢</div>
          <div className="text-[14px] text-[#64748d]">No subcontractors yet. Add partner towing companies.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {subs.map(sub => (
            <div key={sub.id} className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
              <div className="p-5 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-semibold">{sub.companyName}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${sub.isActive ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fef2f2] text-[#991b1b]"}`}>{sub.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="text-[13px] text-[#64748d] mt-1 space-y-0.5">
                    {sub.contactName && <div>👤 {sub.contactName}</div>}
                    {sub.phone && <div>📞 {sub.phone}</div>}
                    {sub.email && <div>📧 {sub.email}</div>}
                    {sub.city && <div>📍 {sub.city}, {sub.state}</div>}
                    {sub.mcNumber && <div>MC: {sub.mcNumber} • DOT: {sub.dotNumber}</div>}
                  </div>
                  <div className="flex gap-3 mt-2 text-[12px] text-[#64748d]">
                    {sub.ratePerMile && <span>${sub.ratePerMile}/mi</span>}
                    {sub.flatRate && <span>Flat: ${sub.flatRate}</span>}
                    {sub.commission && <span>{sub.commission}% commission</span>}
                  </div>
                </div>
                <button onClick={() => toggle(sub.id, sub.isActive)} className="text-[12px] text-[#64748d] hover:text-[#533afd]">{sub.isActive ? "Deactivate" : "Activate"}</button>
              </div>

              {/* Drivers & Vehicles */}
              <div className="border-t border-[#e5edf5] grid grid-cols-2 divide-x divide-[#e5edf5]">
                <div className="p-4">
                  <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Drivers ({sub.drivers.length})</div>
                  {sub.drivers.length === 0 ? <div className="text-[12px] text-[#94a3b8]">No drivers</div> : sub.drivers.map(d => (
                    <div key={d.id} className="text-[13px] py-1">{d.firstName} {d.lastName} {d.phone && <span className="text-[#64748d]">• {d.phone}</span>}</div>
                  ))}
                </div>
                <div className="p-4">
                  <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Vehicles ({sub.vehicles.length})</div>
                  {sub.vehicles.length === 0 ? <div className="text-[12px] text-[#94a3b8]">No vehicles</div> : sub.vehicles.map(v => (
                    <div key={v.id} className="text-[13px] py-1">{v.name} {v.licensePlate && <span className="font-mono text-[#64748d]">• {v.licensePlate}</span>}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold mb-6">Add Subcontractor</h2>
            <form onSubmit={add} className="space-y-3">
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Company Name *</label><input required value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Contact Name</label><input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">MC#</label><input value={form.mcNumber} onChange={e => setForm(f => ({ ...f, mcNumber: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">DOT#</label><input value={form.dotNumber} onChange={e => setForm(f => ({ ...f, dotNumber: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Commission %</label><input type="number" value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
