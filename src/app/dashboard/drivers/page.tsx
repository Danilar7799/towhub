"use client";

import { useState, useEffect } from "react";

interface TeamUser {
  id: string; email: string; firstName: string; lastName: string;
  phone?: string; role: string; isActive: boolean; createdAt: string;
}

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

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    dispatcher: "bg-green-100 text-green-700",
    driver: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Team Management</h1>
        <button onClick={() => setShowAdd(true)} className="bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold">
          + Add Member
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h2 className="text-xl font-bold mb-2">No team members yet</h2>
          <p className="text-gray-500 mb-4">Add drivers and dispatchers to your team.</p>
          <button onClick={() => setShowAdd(true)} className="bg-blue-900 text-white px-6 py-3 rounded-xl font-bold">Add First Member</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Role</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{u.firstName} {u.lastName}</td>
                  <td className="px-6 py-4 text-gray-500">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${roleColors[u.role] || "bg-gray-100"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${u.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => toggleActive(u)} className="text-sm text-gray-500 hover:text-blue-600">
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black mb-6">Add Team Member</h2>
            <form onSubmit={addUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">First Name *</label><input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
                <div><label className="block text-sm font-medium mb-1">Last Name *</label><input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Email *</label><input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="w-full px-4 py-3 border rounded-xl">
                  <option value="driver">Driver</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Password *</label><input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-4 py-3 border rounded-xl" /></div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 border rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
