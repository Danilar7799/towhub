"use client";

import { useState, useEffect } from "react";

interface Location { id: string; name: string; type: string; address: string; city: string; state: string; zip: string; phone?: string; capacity?: number; isActive: boolean; }

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "office", address: "", city: "", state: "", zip: "", phone: "", capacity: "" });

  const load = () => fetch("/api/locations").then(r => r.json()).then(d => setLocations(d.locations || []));
  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowAdd(false); setForm({ name: "", type: "office", address: "", city: "", state: "", zip: "", phone: "", capacity: "" }); load();
  };

  const toggle = async (loc: Location) => {
    await fetch("/api/locations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: loc.id, isActive: !loc.isActive }) });
    load();
  };

  const TYPE_ICONS: Record<string, string> = { office: "🏢", impound_lot: "🅿️", satellite: "📍" };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-[20px] font-semibold tracking-[-0.3px]">Locations</h2><p className="text-[13px] text-[#64748d] mt-0.5">Manage your offices, impound lots, and satellite locations</p></div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">+ Add Location</button>
      </div>

      {locations.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">📍</div>
          <div className="text-[14px] text-[#64748d]">No locations configured yet.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className={`bg-white border rounded-lg p-5 ${loc.isActive ? "border-[#e5edf5]" : "border-[#fecaca] opacity-60"}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">{TYPE_ICONS[loc.type] || "📍"}</span>
                  <div>
                    <h3 className="text-[15px] font-semibold">{loc.name}</h3>
                    <span className="text-[11px] text-[#64748d] capitalize">{loc.type.replace("_", " ")}</span>
                  </div>
                </div>
                <button onClick={() => toggle(loc)} className="text-[11px] text-[#64748d] hover:text-[#533afd]">{loc.isActive ? "Deactivate" : "Activate"}</button>
              </div>
              <div className="text-[13px] text-[#64748d] space-y-0.5">
                <div>📍 {loc.address}, {loc.city}, {loc.state} {loc.zip}</div>
                {loc.phone && <div>📞 {loc.phone}</div>}
                {loc.capacity && <div>🚗 Capacity: {loc.capacity} vehicles</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold mb-6">Add Location</h2>
            <form onSubmit={add} className="space-y-3">
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Name *</label><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Type</label><select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none"><option value="office">Office</option><option value="impound_lot">Impound Lot</option><option value="satellite">Satellite</option></select></div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Address *</label><input required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">City</label><input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">State</label><input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">ZIP</label><input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
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
