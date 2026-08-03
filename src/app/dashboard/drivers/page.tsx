"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/lib/toast";
import { useAuth } from "@/lib/auth-context";
import { CopyButton } from "@/components/micro-interactions";
import { DocumentUploader } from "@/components/ui";

/*
 * Team Management — redesigned with categories, profile cards, vehicle assignment, messaging
 * Design: Stripe tokens — #533afd accent, #061b31 text, #64748d body, #e5edf5 border
 */

interface TeamUser {
  id: string; email: string; firstName: string; lastName: string;
  phone?: string; role: string; isActive: boolean; createdAt: string;
  photoUrl?: string; assignedVehicleId?: string;
  startDate?: string; birthday?: string; schedule?: string;
  payRate?: number; notes?: string;
}

interface Vehicle {
  id: string; name: string; type: string; make?: string; model?: string;
  year?: number; licensePlate?: string; color?: string;
}

const CATEGORIES = [
  { id: "all", label: "All", icon: "👥", roles: ["owner", "admin", "dispatcher", "driver", "subcontractor"] },
  { id: "drivers", label: "Drivers", icon: "🚗", roles: ["driver"] },
  { id: "dispatchers", label: "Dispatchers", icon: "📞", roles: ["dispatcher"] },
  { id: "admins", label: "Admins", icon: "⚙️", roles: ["admin", "owner", "super_admin"] },
  { id: "subs", label: "Subcontractors", icon: "🏢", roles: ["subcontractor"] },
];

const ROLE_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string; color: string }> = {
  owner: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]", border: "border-[#e9d5ff]", icon: "👑", color: "#7c3aed" },
  super_admin: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]", border: "border-[#e9d5ff]", icon: "👑", color: "#7c3aed" },
  admin: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", border: "border-[#bfdbfe]", icon: "⚙️", color: "#3b82f6" },
  dispatcher: { bg: "bg-[#dcfce7]", text: "text-[#166534]", border: "border-[#bbf7d0]", icon: "📞", color: "#15be53" },
  driver: { bg: "bg-[#fef3c7]", text: "text-[#92400e]", border: "border-[#fde68a]", icon: "🚗", color: "#f59e0b" },
  subcontractor: { bg: "bg-[#f1f5f9]", text: "text-[#475569]", border: "border-[#e2e8f0]", icon: "🏢", color: "#64748d" },
};

export default function DriversPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "driver", startDate: "", birthday: "", schedule: "", payRate: "", notes: "" });
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", phone: "", role: "driver", password: "" });

  const load = async () => {
    const [usersRes, vehiclesRes] = await Promise.all([
      fetch("/api/drivers"),
      fetch("/api/fleet"),
    ]);
    const usersData = await usersRes.json();
    const vehiclesData = await vehiclesRes.json();
    setUsers(usersData.users || []);
    setVehicles(vehiclesData.vehicles || []);
  };

  useEffect(() => { load(); }, []);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/drivers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      toast.success(`Added: ${form.firstName} ${form.lastName}`);
      setShowAdd(false);
      setForm({ email: "", firstName: "", lastName: "", phone: "", role: "driver", password: "" });
      load();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add member");
    }
  };

  const toggleActive = async (u: TeamUser) => {
    await fetch("/api/drivers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, isActive: !u.isActive }) });
    toast.success(`${u.firstName} ${u.isActive ? "deactivated" : "activated"}`);
    load();
    if (selectedUser?.id === u.id) setSelectedUser(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
  };

  const assignVehicle = async (userId: string, vehicleId: string) => {
    await fetch("/api/drivers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: userId, assignedVehicleId: vehicleId }) });
    toast.success("Vehicle assigned");
    load();
  };

  const openEdit = (u: TeamUser) => {
    setEditForm({
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone || "",
      role: u.role,
      startDate: u.startDate || "",
      birthday: u.birthday || "",
      schedule: u.schedule || "",
      payRate: u.payRate?.toString() || "",
      notes: u.notes || "",
    });
    setShowEdit(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const res = await fetch("/api/drivers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedUser.id,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone || undefined,
        role: editForm.role,
        startDate: editForm.startDate || undefined,
        birthday: editForm.birthday || undefined,
        schedule: editForm.schedule || undefined,
        payRate: editForm.payRate ? parseFloat(editForm.payRate) : undefined,
        notes: editForm.notes || undefined,
      }),
    });
    if (res.ok) {
      toast.success("Profile updated");
      setShowEdit(false);
      load();
      setSelectedUser(prev => prev ? {
        ...prev,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone || undefined,
        role: editForm.role,
        startDate: editForm.startDate || undefined,
        birthday: editForm.birthday || undefined,
        schedule: editForm.schedule || undefined,
        payRate: editForm.payRate ? parseFloat(editForm.payRate) : undefined,
        notes: editForm.notes || undefined,
      } : null);
    } else {
      toast.error("Failed to update profile");
    }
  };

  const sendMessage = async () => {
    if (!selectedUser || !messageText.trim()) return;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: selectedUser.id, text: messageText }),
    });
    toast.success(`Message sent to ${selectedUser.firstName}`);
    setMessageText("");
    setShowMessage(false);
  };

  // Filter by category
  const category = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
  const filtered = activeCategory === "all" ? users : users.filter(u => category.roles.includes(u.role));

  // Stats
  const activeCount = users.filter(u => u.isActive).length;
  const driverCount = users.filter(u => u.role === "driver").length;
  const dispatcherCount = users.filter(u => u.role === "dispatcher").length;
  const adminCount = users.filter(u => ["admin", "owner", "super_admin"].includes(u.role)).length;

  const getVehicle = (id?: string) => vehicles.find(v => v.id === id);
  const userVehicles = (u: TeamUser) => u.role === "driver" ? vehicles : [];

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Team</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">{activeCount} active • {driverCount} drivers • {dispatcherCount} dispatchers • {adminCount} admins</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)] press-active">
          + Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "TOTAL", value: users.length, color: "#061b31" },
          { label: "DRIVERS", value: driverCount, color: "#f59e0b" },
          { label: "DISPATCHERS", value: dispatcherCount, color: "#15be53" },
          { label: "ADMINS", value: adminCount, color: "#3b82f6" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#e5edf5] rounded-lg p-3">
            <div className="text-[10px] text-[#64748d] uppercase tracking-wider">{s.label}</div>
            <div className="text-[24px] font-light tracking-[-0.5px] tabular-nums" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 border-b border-[#e5edf5] pb-px">
        {CATEGORIES.map(cat => {
          const count = cat.id === "all" ? users.length : users.filter(u => cat.roles.includes(u.role)).length;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSelectedUser(null); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                activeCategory === cat.id
                  ? "border-[#533afd] text-[#533afd]"
                  : "border-transparent text-[#64748d] hover:text-[#061b31] hover:border-[#e5edf5]"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className="text-[10px] bg-[#f3f4f6] px-1.5 py-0.5 rounded tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content: Grid + Detail Panel */}
      <div className="flex gap-4 min-h-[400px]">
        {/* Card Grid */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
              <div className="text-[32px] mb-3 opacity-20">{category.icon}</div>
              <div className="text-[14px] font-medium text-[#061b31] mb-1">No {category.label.toLowerCase()} yet</div>
              <div className="text-[12px] text-[#64748d] mb-4">Add team members to this category</div>
              <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4]">
                + Add Member
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(u => {
                const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.driver;
                const vehicle = getVehicle(u.assignedVehicleId);
                // Tenure calculation
                const startDate = u.startDate || u.createdAt;
                const tenureMonths = Math.floor((Date.now() - new Date(startDate).getTime()) / (30.4 * 24 * 60 * 60 * 1000));
                const tenureYears = Math.floor(tenureMonths / 12);
                const tenureRemainder = tenureMonths % 12;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`bg-white border rounded-lg overflow-hidden cursor-pointer card-hover ${
                      selectedUser?.id === u.id ? "border-[#533afd] shadow-[0_4px_12px_rgba(83,58,253,0.1)]" : "border-[#e5edf5]"
                    }`}
                  >
                    {/* Photo header */}
                    <div className="h-28 bg-gradient-to-br from-[#533afd]/[0.06] to-[#533afd]/[0.02] flex items-center justify-center relative">
                      {u.photoUrl ? (
                        <img src={u.photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border-3 border-white shadow-md" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#533afd]/20 to-[#533afd]/10 flex items-center justify-center text-[24px] font-semibold text-[#533afd] border-3 border-white shadow-md">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                      )}
                      <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${u.isActive ? "bg-[#15be53]" : "bg-[#d1d5db]"}`} />
                      <span className={`absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${rc.bg} ${rc.text} ${rc.border}`}>
                        {rc.icon} {u.role}
                      </span>
                    </div>

                    <div className="p-3.5">
                      {/* Name + tenure */}
                      <div className="text-center mb-2">
                        <div className="text-[14px] font-semibold text-[#061b31]">{u.firstName} {u.lastName}</div>
                        <div className="text-[10px] text-[#64748d]">
                          {tenureYears > 0 ? `${tenureYears}y ${tenureRemainder}m` : `${tenureMonths}m`} at company
                          {u.schedule && <span> • {u.schedule}</span>}
                        </div>
                      </div>

                      {/* Vehicle badge — prominent if assigned */}
                      {vehicle ? (
                        <div className="flex items-center gap-2 p-2 bg-[#dcfce7] rounded border border-[#bbf7d0] mb-2">
                          <span className="text-[16px]">🚛</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold text-[#166534] truncate">{vehicle.name}</div>
                            <div className="text-[10px] text-[#166534] opacity-70">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                          </div>
                        </div>
                      ) : u.role === "driver" ? (
                        <div className="flex items-center gap-2 p-2 bg-[#fef3c7] rounded border border-[#fde68a] mb-2">
                          <span className="text-[14px]">⚠️</span>
                          <div className="text-[11px] text-[#92400e]">No vehicle assigned</div>
                        </div>
                      ) : null}

                      {/* Contact compact */}
                      <div className="flex items-center justify-between text-[11px] text-[#64748d] mb-2">
                        <span className="truncate">{u.phone || u.email}</span>
                        {u.payRate && <span className="font-medium tabular-nums">${u.payRate}/hr</span>}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <CopyButton text={`${u.firstName} ${u.lastName}\n${u.email}\n${u.phone || ""}`} label="Copy" className="flex-1 justify-center" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedUser(u); setShowMessage(true); }}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium rounded border bg-[#f6f9fc] text-[#533afd] border-[#e5edf5] hover:border-[#b9b9f9] hover:bg-white transition-colors press-active"
                        >
                          ✉️ Message
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedUser && (
          <div className="w-[320px] shrink-0">
            <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden sticky top-4">
              {/* Profile Header */}
              <div className="p-5 bg-gradient-to-b from-[#533afd]/[0.03] to-transparent border-b border-[#e5edf5]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#e5edf5]">
                    {selectedUser.photoUrl ? (
                      <img src={selectedUser.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#533afd]/10 to-[#533afd]/5 flex items-center justify-center text-[22px] font-semibold text-[#533afd]">
                        {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[16px] font-semibold text-[#061b31]">{selectedUser.firstName} {selectedUser.lastName}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${ROLE_CONFIG[selectedUser.role]?.bg} ${ROLE_CONFIG[selectedUser.role]?.text} ${ROLE_CONFIG[selectedUser.role]?.border}`}>
                        {ROLE_CONFIG[selectedUser.role]?.icon} {selectedUser.role}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${selectedUser.isActive ? "text-[#15be53]" : "text-[#94a3b8]"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.isActive ? "bg-[#15be53]" : "bg-[#e5edf5]"}`} />
                        {selectedUser.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="ml-auto text-[16px] text-[#94a3b8] hover:text-[#061b31]">×</button>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { openEdit(selectedUser); }}
                    className="flex items-center justify-center gap-1.5 py-2 bg-[#f6f9fc] border border-[#e5edf5] rounded text-[12px] font-medium hover:bg-[#eef3f8] transition-colors press-active"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setShowMessage(true)}
                    className="flex items-center justify-center gap-1.5 py-2 bg-[#533afd] text-white rounded text-[12px] font-medium hover:bg-[#4434d4] transition-colors press-active"
                  >
                    ✉️ Message
                  </button>
                  <button
                    onClick={() => window.open(`tel:${selectedUser.phone}`, "_self")}
                    className="flex items-center justify-center gap-1.5 py-2 bg-[#f6f9fc] border border-[#e5edf5] rounded text-[12px] font-medium hover:bg-[#eef3f8] transition-colors press-active"
                    disabled={!selectedUser.phone}
                  >
                    📞 Call
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3 border-b border-[#e5edf5]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#64748d] uppercase tracking-wider">Contact</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#64748d]">Email</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium text-[#061b31]">{selectedUser.email}</span>
                      <CopyButton text={selectedUser.email} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#64748d]">Phone</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-medium text-[#061b31]">{selectedUser.phone || "—"}</span>
                      {selectedUser.phone && <CopyButton text={selectedUser.phone} />}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#64748d]">Joined</span>
                    <span className="text-[12px] text-[#061b31]">{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                  </div>
                  {selectedUser.startDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#64748d]">Start Date</span>
                      <span className="text-[12px] text-[#061b31]">{new Date(selectedUser.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedUser.birthday && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#64748d]">Birthday</span>
                      <span className="text-[12px] text-[#061b31]">{new Date(selectedUser.birthday).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                  )}
                  {selectedUser.schedule && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#64748d]">Schedule</span>
                      <span className="text-[12px] text-[#061b31]">{selectedUser.schedule}</span>
                    </div>
                  )}
                  {selectedUser.payRate && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#64748d]">Pay Rate</span>
                      <span className="text-[12px] font-medium text-[#061b31] tabular-nums">${selectedUser.payRate}/hr</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#64748d]">Tenure</span>
                    <span className="text-[12px] font-medium text-[#533afd]">
                      {(() => {
                        const s = selectedUser.startDate || selectedUser.createdAt;
                        const m = Math.floor((Date.now() - new Date(s).getTime()) / (30.4 * 24 * 60 * 60 * 1000));
                        const y = Math.floor(m / 12);
                        return y > 0 ? `${y}y ${m % 12}m` : `${m} months`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Private Notes (owner/dispatcher only) */}
              {["owner", "super_admin", "admin", "dispatcher"].includes(user?.role || "") && (
                <div className="p-4 space-y-3 border-b border-[#e5edf5]">
                  <div className="text-[11px] text-[#64748d] uppercase tracking-wider">🔒 Private Notes</div>
                  <textarea
                    value={selectedUser.notes || ""}
                    onChange={e => {
                      const updated = { ...selectedUser, notes: e.target.value };
                      setSelectedUser(updated);
                    }}
                    onBlur={() => {
                      if (selectedUser.notes !== undefined) {
                        fetch("/api/drivers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedUser.id, notes: selectedUser.notes }) });
                      }
                    }}
                    placeholder="Notes visible only to dispatchers and owner..."
                    rows={3}
                    className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[12px] outline-none resize-none focus:border-[#533afd] bg-[#fefce8]"
                  />
                  <div className="text-[10px] text-[#94a3b8]">Only dispatchers and owner can see these notes</div>
                </div>
              )}

              {/* Vehicle Assignment (drivers only) */}
              {selectedUser.role === "driver" && (
                <div className="p-4 space-y-3 border-b border-[#e5edf5]">
                  <div className="text-[11px] text-[#64748d] uppercase tracking-wider">Assigned Vehicle</div>
                  {(() => {
                    const v = getVehicle(selectedUser.assignedVehicleId);
                    return v ? (
                      <div className="flex items-center gap-2 p-2 bg-[#f6f9fc] rounded border border-[#e5edf5]">
                        <span className="text-[16px]">🚛</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-[#061b31]">{v.name}</div>
                          <div className="text-[10px] text-[#64748d]">{v.year} {v.make} {v.model} {v.licensePlate ? `• ${v.licensePlate}` : ""}</div>
                        </div>
                        <button onClick={() => assignVehicle(selectedUser.id, "")} className="text-[10px] text-[#dc2626] hover:underline">Remove</button>
                      </div>
                    ) : (
                      <div className="text-[12px] text-[#94a3b8]">No vehicle assigned</div>
                    );
                  })()}
                  <select
                    value={selectedUser.assignedVehicleId || ""}
                    onChange={e => assignVehicle(selectedUser.id, e.target.value)}
                    className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[12px] outline-none focus:border-[#533afd]"
                  >
                    <option value="">Assign vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} — {v.year} {v.make} {v.model}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Documents — categorized */}
              <div className="p-4 space-y-3 border-b border-[#e5edf5]">
                <div className="text-[11px] text-[#64748d] uppercase tracking-wider">Documents</div>
                <div className="space-y-2">
                  {[
                    { id: "cdl", label: "CDL License", icon: "🪪", required: true },
                    { id: "medical", label: "Medical Card", icon: "🏥", required: true },
                    { id: "insurance", label: "Insurance", icon: "🛡️", required: true },
                    { id: "drug_test", label: "Drug Test", icon: "🧪", required: false },
                    { id: "mvr", label: "MVR (Driving Record)", icon: "📋", required: false },
                    { id: "photo_id", label: "Photo ID", icon: "🪪", required: false },
                    { id: "other", label: "Other", icon: "📄", required: false },
                  ].map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-2.5 bg-[#f6f9fc] rounded border border-[#e5edf5] hover:border-[#b9b9f9] transition-colors">
                      <span className="text-[16px]">{doc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium text-[#061b31]">
                          {doc.label}
                          {doc.required && <span className="text-[#dc2626] ml-0.5">*</span>}
                        </div>
                        <div className="text-[10px] text-[#94a3b8]">Not uploaded</div>
                      </div>
                      <label className="px-2.5 py-1 bg-white border border-[#e5edf5] rounded text-[11px] font-medium text-[#533afd] hover:border-[#b9b9f9] cursor-pointer transition-colors press-active">
                        Upload
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new window.FormData();
                          fd.append("file", file);
                          fd.append("entityType", "driver_documents");
                          fd.append("entityId", selectedUser.id);
                          fd.append("docType", doc.id);
                          const res = await fetch("/api/upload", { method: "POST", body: fd });
                          if (res.ok) toast.success(`${doc.label} uploaded`);
                          else toast.error("Upload failed");
                        }} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2">
                <button
                  onClick={() => toggleActive(selectedUser)}
                  className={`w-full py-2 rounded text-[12px] font-medium transition-colors press-active ${
                    selectedUser.isActive
                      ? "bg-[#fef2f2] text-[#dc2626] border border-[#fecaca] hover:bg-[#fee2e2]"
                      : "bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] hover:bg-[#bbf7d0]"
                  }`}
                >
                  {selectedUser.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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
                  <option value="driver">🚗 Driver</option>
                  <option value="dispatcher">📞 Dispatcher</option>
                  <option value="admin">⚙️ Admin</option>
                  <option value="subcontractor">🏢 Subcontractor</option>
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

      {/* Message Modal */}
      {showMessage && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowMessage(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#533afd]/10 flex items-center justify-center text-[14px] font-semibold text-[#533afd]">
                {selectedUser.firstName[0]}{selectedUser.lastName[0]}
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[#061b31]">{selectedUser.firstName} {selectedUser.lastName}</div>
                <div className="text-[11px] text-[#64748d]">{selectedUser.email}</div>
              </div>
            </div>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder="Type your message..."
              rows={4}
              className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowMessage(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
              <button
                onClick={sendMessage}
                disabled={!messageText.trim()}
                className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4] disabled:opacity-50 press-active"
              >
                ✉️ Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEdit && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-semibold tracking-[-0.3px]">Edit Profile</h2>
              <button onClick={() => setShowEdit(false)} className="text-[18px] text-[#64748d] hover:text-[#061b31]">×</button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">First Name *</label>
                  <input required value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Last Name *</label>
                  <input required value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Email *</label>
                <input required type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Phone</label>
                  <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Role *</label>
                  <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none">
                    <option value="driver">🚗 Driver</option>
                    <option value="dispatcher">📞 Dispatcher</option>
                    <option value="admin">⚙️ Admin</option>
                    <option value="subcontractor">🏢 Subcontractor</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Start Date</label>
                  <input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Birthday</label>
                  <input type="date" value={editForm.birthday} onChange={e => setEditForm(f => ({ ...f, birthday: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Work Schedule</label>
                  <input value={editForm.schedule} onChange={e => setEditForm(f => ({ ...f, schedule: e.target.value }))} placeholder="e.g. Mon-Fri 7am-5pm" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Pay Rate ($/hr)</label>
                  <input type="number" step="0.01" value={editForm.payRate} onChange={e => setEditForm(f => ({ ...f, payRate: e.target.value }))} placeholder="e.g. 25.00" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Private Notes (owner/dispatcher only)</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Notes visible only to dispatchers and owner..." className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none resize-none bg-[#fefce8]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4] press-active">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}