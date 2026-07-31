"use client";

import { useState, useEffect } from "react";
import { DocumentUploader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

interface DriverDoc {
  id: string;
  driverId: string;
  type: string;
  fileUrl: string;
  issuedAt: string | null;
  expiresAt: string | null;
  status: string;
  notes: string | null;
  driverFirstName: string;
  driverLastName: string;
  driverEmail: string;
  computedStatus: string;
  daysUntilExpiry: number | null;
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const DOC_TYPES = [
  { value: "cdl", label: "CDL License", icon: "🪪" },
  { value: "medical_card", label: "Medical Card", icon: "🏥" },
  { value: "insurance", label: "Insurance", icon: "🛡️" },
  { value: "registration", label: "Registration", icon: "📋" },
  { value: "background_check", label: "Background Check", icon: "🔍" },
  { value: "drug_test", label: "Drug Test", icon: "🧪" },
  { value: "other", label: "Other", icon: "📄" },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  valid: { bg: "bg-[#dcfce7]", text: "text-[#166534]", border: "border-[#bbf7d0]", label: "Valid" },
  expiring_30d: { bg: "bg-[#fef3c7]", text: "text-[#92400e]", border: "border-[#fde68a]", label: "Expiring in 30 days" },
  expiring_7d: { bg: "bg-[#ffedd5]", text: "text-[#9a3412]", border: "border-[#fed7aa]", label: "Expiring in 7 days" },
  expired: { bg: "bg-[#fef2f2]", text: "text-[#991b1b]", border: "border-[#fecaca]", label: "Expired" },
  missing: { bg: "bg-[#f3f4f6]", text: "text-[#4b5563]", border: "border-[#e5e7eb]", label: "Missing" },
};

export default function CompliancePage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DriverDoc[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, expiring_30d: 0, expiring_7d: 0, expired: 0 });
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DriverDoc | null>(null);
  const [form, setForm] = useState({ driverId: "", type: "cdl", issuedAt: "", expiresAt: "", notes: "" });

  const load = async () => {
    const [docsRes, driversRes] = await Promise.all([
      fetch("/api/driver-documents"),
      fetch("/api/drivers"),
    ]);
    const docsData = await docsRes.json();
    const driversData = await driversRes.json();
    setDocs(docsData.documents || []);
    setStats(docsData.stats || {});
    setDrivers(driversData.drivers || driversData || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const method = selectedDoc ? "POST" : "POST";
    const body = selectedDoc
      ? { id: selectedDoc.id, ...form }
      : { ...form };

    await fetch("/api/driver-documents", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setShowAdd(false);
    setSelectedDoc(null);
    setForm({ driverId: "", type: "cdl", issuedAt: "", expiresAt: "", notes: "" });
    load();
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await fetch("/api/driver-documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  // Filter docs
  let filtered = docs;
  if (filterDriver !== "all") filtered = filtered.filter(d => d.driverId === filterDriver);
  if (filterType !== "all") filtered = filtered.filter(d => d.type === filterType);
  if (filterStatus !== "all") filtered = filtered.filter(d => d.computedStatus === filterStatus);

  // Group by driver
  const driverMap = new Map<string, DriverDoc[]>();
  filtered.forEach(doc => {
    const key = doc.driverId;
    if (!driverMap.has(key)) driverMap.set(key, []);
    driverMap.get(key)!.push(doc);
  });

  // Required docs per driver
  const requiredDocs = ["cdl", "medical_card", "insurance"];
  const getMissingDocs = (driverId: string) => {
    const driverDocs = docs.filter(d => d.driverId === driverId);
    const existingTypes = driverDocs.map(d => d.type);
    return requiredDocs.filter(t => !existingTypes.includes(t));
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">📋 Driver Compliance</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Track CDL, medical cards, insurance and other driver documents</p>
        </div>
        <button
          onClick={() => { setSelectedDoc(null); setForm({ driverId: "", type: "cdl", issuedAt: "", expiresAt: "", notes: "" }); setShowAdd(true); }}
          className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]"
        >
          + Add Document
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "#061b31", bg: "#f6f9fc" },
          { label: "Valid", value: stats.valid, color: "#166534", bg: "#dcfce7" },
          { label: "Expiring 30d", value: stats.expiring_30d, color: "#92400e", bg: "#fef3c7" },
          { label: "Expiring 7d", value: stats.expiring_7d, color: "#9a3412", bg: "#ffedd5" },
          { label: "Expired", value: stats.expired, color: "#991b1b", bg: "#fef2f2" },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilterStatus(filterStatus === s.label.toLowerCase().replace(" ", "_") ? "all" : s.label.toLowerCase().replace(" ", "_"))}
            className="bg-white border border-[#e5edf5] rounded-lg p-3 text-left hover:shadow-md transition-shadow"
          >
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider">{s.label}</div>
            <div className="text-[24px] font-light" style={{ color: s.color }}>{s.value}</div>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {(stats.expiring_7d > 0 || stats.expired > 0) && (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-4 flex items-center gap-3">
          <span className="text-[20px]">🚨</span>
          <div>
            <div className="text-[14px] font-semibold text-[#991b1b]">Compliance Alert</div>
            <div className="text-[12px] text-[#991b1b]">
              {stats.expired > 0 && `${stats.expired} expired document${stats.expired > 1 ? "s" : ""}`}
              {stats.expired > 0 && stats.expiring_7d > 0 && " • "}
              {stats.expiring_7d > 0 && `${stats.expiring_7d} expiring within 7 days`}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterDriver}
          onChange={e => setFilterDriver(e.target.value)}
          className="px-3 py-2 border border-[#e5edf5] rounded text-[13px] bg-white"
        >
          <option value="all">All Drivers</option>
          {drivers.map(d => (
            <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-[#e5edf5] rounded text-[13px] bg-white"
        >
          <option value="all">All Types</option>
          {DOC_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
          ))}
        </select>
      </div>

      {/* Document Table */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">📋</div>
          <div className="text-[14px] text-[#64748d]">No documents found</div>
          <div className="text-[12px] text-[#94a3b8] mt-1">Add driver documents to track compliance</div>
        </div>
      ) : (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>
                {["Driver", "Document Type", "Issued", "Expires", "Status", "Days Left", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {filtered.map(doc => {
                const s = STATUS_CONFIG[doc.computedStatus] || STATUS_CONFIG.valid;
                const docType = DOC_TYPES.find(t => t.value === doc.type);
                return (
                  <tr key={doc.id} className="hover:bg-[#f6f9fc]">
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-medium">{doc.driverFirstName} {doc.driverLastName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{docType?.icon}</span>
                        <span className="text-[13px]">{docType?.label || doc.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#64748d]">{fmtDate(doc.issuedAt)}</td>
                    <td className="px-4 py-3 text-[12px] text-[#64748d]">{fmtDate(doc.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.daysUntilExpiry !== null ? (
                        <span className={`text-[13px] font-medium ${
                          doc.daysUntilExpiry < 0 ? "text-[#991b1b]" :
                          doc.daysUntilExpiry <= 7 ? "text-[#9a3412]" :
                          doc.daysUntilExpiry <= 30 ? "text-[#92400e]" :
                          "text-[#166534]"
                        }`}>
                          {doc.daysUntilExpiry < 0 ? `${Math.abs(doc.daysUntilExpiry)}d overdue` : `${doc.daysUntilExpiry}d`}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedDoc(doc);
                            setForm({
                              driverId: doc.driverId,
                              type: doc.type,
                              issuedAt: doc.issuedAt ? doc.issuedAt.split("T")[0] : "",
                              expiresAt: doc.expiresAt ? doc.expiresAt.split("T")[0] : "",
                              notes: doc.notes || "",
                            });
                            setShowAdd(true);
                          }}
                          className="text-[12px] text-[#533afd] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteDoc(doc.id)}
                          className="text-[12px] text-[#991b1b] hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px] mb-1">{selectedDoc ? "Edit" : "Add"} Driver Document</h2>
            <p className="text-[13px] text-[#64748d] mb-6">Track compliance documents for your drivers</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Driver *</label>
                <select
                  value={form.driverId}
                  onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                >
                  <option value="">Select driver...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Document Type *</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                >
                  {DOC_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Issued Date</label>
                  <input
                    type="date"
                    value={form.issuedAt}
                    onChange={e => setForm(f => ({ ...f, issuedAt: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Expiration Date</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t border-[#e5edf5]">
              <button onClick={() => { setShowAdd(false); setSelectedDoc(null); }} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
              <button onClick={save} className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">
                {selectedDoc ? "Update" : "Add"} Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}