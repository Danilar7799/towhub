"use client";

import { useState, useEffect } from "react";

interface TeamUser {
  id: string; email: string; firstName: string; lastName: string;
  phone?: string; role: string; isActive: boolean; createdAt: string;
}

const ROLE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  owner: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]", border: "border-[#e9d5ff]" },
  admin: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", border: "border-[#bfdbfe]" },
  dispatcher: { bg: "bg-[#dcfce7]", text: "text-[#166534]", border: "border-[#bbf7d0]" },
  driver: { bg: "bg-[#fef3c7]", text: "text-[#92400e]", border: "border-[#fde68a]" },
};

export default function DriversPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", phone: "", role: "driver", password: "" });

  const load = () => fetch("/api/drivers").then(r => r.json()).then(d => setUsers(d.users || []));
  useEffect(() => { load(); }, []);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/drivers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      const data = await res.json();
      alert(`Driver added!\nEmail: ${data.credentials.email}\nPassword: ${data.credentials.password}`);
      setShowAdd(false);
      setForm({ email: "", firstName: "", lastName: "", phone: "", role: "driver", password: "" });
      load();
    }
  };

  const toggleActive = async (u: TeamUser) => {
    await fetch("/api/drivers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, isActive: !u.isActive }) });
    load();
  };

  const activeCount = users.filter(u => u.isActive).length;
  const driverCount = users.filter(u => u.role === "driver").length;

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Team Management</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">{activeCount} active • {driverCount} drivers • {users.length} total</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
          + Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Members", value: users.length, accent: "#061b31" },
          { label: "Active", value: activeCount, accent: "#15be53" },
          { label: "Drivers", value: driverCount, accent: "#533afd" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-[28px] font-light tracking-[-0.5px]" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {users.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">👥</div>
          <div className="text-[14px] text-[#64748d] mb-4">No team members yet. Add drivers and dispatchers to your team.</div>
          <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4]">
            + Add First Member
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>
                {["Name", "Email", "Phone", "Role", "Status", ""].map(h => (
                  <th key={h} className="text-left px-5 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {users.map(u => {
                const role = ROLE_STYLES[u.role] || ROLE_STYLES.driver;
                return (
                  <tr key={u.id} className="hover:bg-[#f6f9fc]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[#533afd] text-[11px] font-semibold shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span className="text-[13px] font-medium text-[#061b31]">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[#64748d]">{u.email}</td>
                    <td className="px-5 py-3 text-[13px] text-[#64748d]">{u.phone || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${role.bg} ${role.text} ${role.border}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${u.isActive ? "text-[#15be53]" : "text-[#94a3b8]"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-[#15be53]" : "bg-[#e5edf5]"}`} />
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => toggleActive(u)} className="text-[12px] text-[#533afd] font-medium hover:underline">
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px] mb-6">Add Team Member</h2>
            <form onSubmit={addUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">First Name *</label><input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Last Name *</label><input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Email *</label><input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none">
                  <option value="driver">Driver</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Password *</label><input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
