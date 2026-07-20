"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

/* ───── Design tokens ───── */
const P = "#533afd";
const TEXT = "#061b31";
const MUTED = "#64748d";
const BORDER = "#e5edf5";
const SURFACE = "#f6f9fc";

/* ───── Interfaces ───── */
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  totalJobs: number;
  totalSpent: number;
  isVip: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Job {
  id: string;
  status: string;
  pickupAddress: string;
  destinationAddress?: string;
  customerName?: string;
  towVehicleMake?: string;
  towVehicleModel?: string;
  towVehicleYear?: number;
  towVehicleColor?: string;
  totalAmount?: number;
  createdAt: string;
  completedAt?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paidAmount?: number;
  dueDate?: string;
  paidAt?: string;
  createdAt: string;
  jobId?: string;
  customerName?: string;
}

/* ───── Status badge helper ───── */
const statusColor: Record<string, string> = {
  pending: "#f59e0b",
  assigned: "#3b82f6",
  en_route: "#8b5cf6",
  on_scene: "#6366f1",
  towing: "#0ea5e9",
  completed: "#10b981",
  cancelled: "#ef4444",
  draft: "#94a3b8",
  sent: "#3b82f6",
  paid: "#10b981",
  overdue: "#ef4444",
};

function Badge({ status }: { status: string }) {
  const color = statusColor[status] || MUTED;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        color,
        background: color + "18",
        whiteSpace: "nowrap",
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

/* ───── Activity timeline entry ───── */
interface ActivityItem {
  id: string;
  type: "job_created" | "job_completed" | "job_cancelled" | "invoice_created" | "invoice_paid" | "customer_created";
  title: string;
  detail: string;
  date: string;
}

function buildTimeline(jobs: Job[], invoices: Invoice[], customer: Customer): ActivityItem[] {
  const items: ActivityItem[] = [];

  items.push({
    id: `cust-${customer.id}`,
    type: "customer_created",
    title: "Customer added",
    detail: customer.name,
    date: customer.createdAt,
  });

  for (const j of jobs) {
    items.push({
      id: `job-${j.id}`,
      type: j.status === "completed" ? "job_completed" : j.status === "cancelled" ? "job_cancelled" : "job_created",
      title: j.status === "completed" ? "Job completed" : j.status === "cancelled" ? "Job cancelled" : "Job created",
      detail: `${j.pickupAddress}${j.destinationAddress ? ` → ${j.destinationAddress}` : ""}`,
      date: j.completedAt || j.createdAt,
    });
  }

  for (const inv of invoices) {
    items.push({
      id: `inv-${inv.id}`,
      type: inv.status === "paid" ? "invoice_paid" : "invoice_created",
      title: inv.status === "paid" ? `Invoice ${inv.invoiceNumber} paid` : `Invoice ${inv.invoiceNumber} ${inv.status}`,
      detail: `$${inv.total.toFixed(2)}`,
      date: inv.paidAt || inv.createdAt,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}

const timelineIcon: Record<string, string> = {
  job_created: "🚛",
  job_completed: "✅",
  job_cancelled: "❌",
  invoice_created: "📄",
  invoice_paid: "💰",
  customer_created: "👤",
};

/* ───── Main Page ───── */
export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notes, setNotes] = useState("");
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"jobs" | "invoices" | "activity">("jobs");

  /* ── Fetch data ── */
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const custRes = await fetch(`/api/customers?id=${id}`);
      if (!custRes.ok) throw new Error("Failed to load customer");
      const custData = await custRes.json();
      const found: Customer | undefined = (custData.customers || []).find((c: Customer) => c.id === id);
      if (!found) {
        setError("Customer not found");
        setLoading(false);
        return;
      }
      setCustomer(found);
      setNotes(found.notes || "");

      /* Fetch jobs by customer name */
      const [jobsRes, invRes] = await Promise.all([
        fetch(`/api/jobs?customerName=${encodeURIComponent(found.name)}`).then((r) => (r.ok ? r.json() : { jobs: [] })),
        fetch(`/api/invoices?customerId=${found.id}`).then((r) => (r.ok ? r.json() : { invoices: [] })),
      ]);

      setJobs(jobsRes.jobs || []);
      setInvoices(invRes.invoices || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Save notes ── */
  const saveNotes = async () => {
    if (!customer) return;
    await fetch("/api/customers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: customer.id, notes: notesDraft }),
    });
    setNotes(notesDraft);
    setNotesEditing(false);
  };

  /* ── Toggle VIP ── */
  const toggleVip = async () => {
    if (!customer) return;
    await fetch("/api/customers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: customer.id, isVip: !customer.isVip }),
    });
    setCustomer({ ...customer, isVip: !customer.isVip });
  };

  /* ── Computed stats ── */
  const totalJobs = customer?.totalJobs ?? jobs.length;
  const totalSpent = customer?.totalSpent ?? jobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
  const avgJobValue = totalJobs > 0 ? totalSpent / totalJobs : 0;
  const lastJobDate = jobs.length > 0 ? jobs[0].createdAt : null;

  const timeline = customer ? buildTimeline(jobs, invoices, customer) : [];

  /* ── Loading / Error ── */
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>⏳</div>
          <div style={{ fontSize: 13, color: MUTED }}>Loading customer…</div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>😕</div>
          <div style={{ fontSize: 14, color: TEXT, fontWeight: 600, marginBottom: 4 }}>{error || "Customer not found"}</div>
          <button
            onClick={() => router.push("/dashboard/customers")}
            style={{
              marginTop: 12,
              padding: "8px 20px",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              background: "white",
              cursor: "pointer",
            }}
          >
            ← Back to Customers
          </button>
        </div>
      </div>
    );
  }

  /* ── Vehicle label helper ── */
  const vehicleLabel = (j: Job) => {
    const parts = [j.towVehicleYear, j.towVehicleColor, j.towVehicleMake, j.towVehicleModel].filter(Boolean);
    return parts.length ? parts.join(" ") : "—";
  };

  const statCard = (label: string, value: string, sub?: string) => (
    <div
      style={{
        flex: 1,
        minWidth: 140,
        background: "white",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: "16px 20px",
      }}
    >
      <div style={{ fontSize: 12, color: MUTED, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: TEXT, letterSpacing: "-0.3px" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  /* ── Quick action button ── */
  const quickAction = (icon: string, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 6,
        border: `1px solid ${BORDER}`,
        background: "white",
        fontSize: 13,
        fontWeight: 500,
        color: TEXT,
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = P)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
    >
      <span>{icon}</span>
      {label}
    </button>
  );

  /* ── Tab underline ── */
  const tabBtn = (key: "jobs" | "invoices" | "activity", label: string, count: number) => (
    <button
      onClick={() => setActiveTab(key)}
      style={{
        padding: "10px 16px",
        fontSize: 13,
        fontWeight: 500,
        color: activeTab === key ? P : MUTED,
        background: "none",
        border: "none",
        borderBottom: activeTab === key ? `2px solid ${P}` : "2px solid transparent",
        cursor: "pointer",
        transition: "color 0.15s",
      }}
    >
      {label}{" "}
      <span
        style={{
          fontSize: 11,
          color: MUTED,
          marginLeft: 4,
          background: activeTab === key ? P + "14" : SURFACE,
          padding: "1px 7px",
          borderRadius: 9999,
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </button>
  );

  /* ── Invoices table row helper ── */
  const invoiceStatusLabel = (s: string) => {
    const labels: Record<string, string> = { draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled" };
    return labels[s] || s;
  };

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", padding: "24px 0", fontFeatureSettings: "'ss01'" }}>
      {/* ── Breadcrumb ── */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => router.push("/dashboard/customers")}
          style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer", padding: 0 }}
        >
          ← Back to Customers
        </button>
      </div>

      {/* ══════════ PROFILE CARD ══════════ */}
      <div
        style={{
          background: "white",
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: "28px 32px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        {/* Left: avatar + info */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flex: 1, minWidth: 280 }}>
          {/* Avatar circle */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${P}, ${P}cc)`,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
              flexShrink: 0,
              letterSpacing: "-0.5px",
            }}
          >
            {customer.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: "-0.3px" }}>{customer.name}</h1>
              {customer.isVip && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: "#fef3c7",
                    color: "#92400e",
                    padding: "3px 10px",
                    borderRadius: 9999,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  VIP
                </span>
              )}
            </div>
            {customer.company && (
              <div style={{ fontSize: 14, color: MUTED, marginTop: 2 }}>{customer.company}</div>
            )}
            <div style={{ display: "flex", gap: 20, marginTop: 10, flexWrap: "wrap" }}>
              {customer.phone && (
                <div style={{ fontSize: 13, color: TEXT, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ opacity: 0.5 }}>📞</span> {customer.phone}
                </div>
              )}
              {customer.email && (
                <div style={{ fontSize: 13, color: TEXT, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ opacity: 0.5 }}>✉️</span> {customer.email}
                </div>
              )}
              {(customer.city || customer.state) && (
                <div style={{ fontSize: 13, color: TEXT, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ opacity: 0.5 }}>📍</span> {[customer.city, customer.state].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: quick actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {customer.phone &&
            quickAction("📞", "Call", () => window.open(`tel:${customer.phone}`))}
          {customer.email &&
            quickAction("✉️", "Email", () => window.open(`mailto:${customer.email}`))}
          {quickAction("🚛", "Create Job", () => router.push(`/dashboard/dispatch?customer=${customer.name}`))}
          {quickAction("📄", "Create Invoice", () => router.push(`/dashboard/billing?customer=${customer.id}`))}
          <button
            onClick={toggleVip}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: `1px solid ${customer.isVip ? "#f59e0b" : BORDER}`,
              background: customer.isVip ? "#fef3c7" : "white",
              fontSize: 13,
              fontWeight: 500,
              color: customer.isVip ? "#92400e" : TEXT,
              cursor: "pointer",
            }}
          >
            {customer.isVip ? "★ VIP" : "☆ Mark VIP"}
          </button>
        </div>
      </div>

      {/* ══════════ STATS ROW ══════════ */}
      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        {statCard("Total Jobs", String(totalJobs))}
        {statCard("Total Spent", `$${totalSpent.toFixed(2)}`)}
        {statCard("Avg Job Value", `$${avgJobValue.toFixed(2)}`)}
        {statCard("Last Job", lastJobDate ? new Date(lastJobDate).toLocaleDateString() : "—", lastJobDate ? undefined : "No jobs yet")}
      </div>

      {/* ══════════ NOTES ══════════ */}
      <div
        style={{
          marginTop: 16,
          background: "white",
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: "20px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: TEXT, margin: 0 }}>Notes</h3>
          {!notesEditing && (
            <button
              onClick={() => {
                setNotesDraft(notes);
                setNotesEditing(true);
              }}
              style={{ background: "none", border: "none", color: P, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              Edit
            </button>
          )}
        </div>
        {notesEditing ? (
          <div>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: `1px solid ${P}`,
                borderRadius: 6,
                fontSize: 13,
                color: TEXT,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
              }}
              placeholder="Add notes about this customer…"
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={saveNotes}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  background: P,
                  color: "white",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                onClick={() => setNotesEditing(false)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  background: SURFACE,
                  color: MUTED,
                  border: `1px solid ${BORDER}`,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: notes ? TEXT : MUTED, margin: 0, lineHeight: 1.6 }}>
            {notes || "No notes yet. Click Edit to add notes."}
          </p>
        )}
      </div>

      {/* ══════════ TABS ══════════ */}
      <div style={{ marginTop: 20, borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 0 }}>
        {tabBtn("jobs", "Jobs", jobs.length)}
        {tabBtn("invoices", "Invoices", invoices.length)}
        {tabBtn("activity", "Activity", timeline.length)}
      </div>

      {/* ── Jobs Tab ── */}
      {activeTab === "jobs" && (
        <div style={{ marginTop: 16 }}>
          {jobs.length === 0 ? (
            <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 6 }}>🚛</div>
              <div style={{ fontSize: 13, color: MUTED }}>No jobs found for this customer.</div>
            </div>
          ) : (
            <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
                    {["Date", "Status", "Pickup", "Destination", "Vehicle", "Amount"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "10px 16px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: MUTED,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j, i) => (
                    <tr
                      key={j.id}
                      style={{ borderBottom: i < jobs.length - 1 ? `1px solid ${BORDER}` : "none", cursor: "pointer" }}
                      onClick={() => router.push(`/dashboard/dispatch?job=${j.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                    >
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>{new Date(j.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge status={j.status} />
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.pickupAddress}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.destinationAddress || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, whiteSpace: "nowrap" }}>{vehicleLabel(j)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>${(j.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Invoices Tab ── */}
      {activeTab === "invoices" && (
        <div style={{ marginTop: 16 }}>
          {invoices.length === 0 ? (
            <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 6 }}>📄</div>
              <div style={{ fontSize: 13, color: MUTED }}>No invoices for this customer.</div>
            </div>
          ) : (
            <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
                    {["Invoice #", "Date", "Status", "Subtotal", "Tax", "Total", "Paid"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "10px 16px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: MUTED,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr
                      key={inv.id}
                      style={{ borderBottom: i < invoices.length - 1 ? `1px solid ${BORDER}` : "none", cursor: "pointer" }}
                      onClick={() => router.push(`/dashboard/billing?invoice=${inv.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                    >
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: P }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge status={inv.status} />
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>${inv.subtotal.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>${(inv.tax || 0).toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600 }}>${inv.total.toFixed(2)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13 }}>${(inv.paidAmount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Activity Timeline Tab ── */}
      {activeTab === "activity" && (
        <div style={{ marginTop: 16 }}>
          {timeline.length === 0 ? (
            <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 6 }}>📋</div>
              <div style={{ fontSize: 13, color: MUTED }}>No activity yet.</div>
            </div>
          ) : (
            <div
              style={{
                background: "white",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "24px 28px",
              }}
            >
              {timeline.map((item, idx) => (
                <div key={item.id} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: idx < timeline.length - 1 ? 20 : 0 }}>
                  {/* Vertical line */}
                  {idx < timeline.length - 1 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 15,
                        top: 32,
                        bottom: 0,
                        width: 2,
                        background: BORDER,
                      }}
                    />
                  )}
                  {/* Icon */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: SURFACE,
                      border: `1px solid ${BORDER}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      flexShrink: 0,
                      zIndex: 1,
                    }}
                  >
                    {timelineIcon[item.type] || "•"}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{item.detail}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 4, opacity: 0.7 }}>{new Date(item.date).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Footer spacing ── */}
      <div style={{ height: 40 }} />
    </div>
  );
}
