"use client";

import { useState, useCallback } from "react";

/*
 * Customer Portal — /track
 *
 * Login: phone + last 4 chars of any job ID (no password)
 * Dashboard: active jobs, history, invoices, reorder
 *
 * Design tokens: primary #533afd, text #061b31, muted #64748d, border #e5edf5, surface #f6f9fc
 * Mobile-first, Stripe-style
 */

const STATUS_STEPS = ["pending", "assigned", "en_route", "on_scene", "towing", "completed"] as const;

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: "Waiting for driver",     color: "#eab308", bg: "#fef9c3", icon: "⏳" },
  assigned:   { label: "Driver assigned",        color: "#3b82f6", bg: "#dbeafe", icon: "👤" },
  en_route:   { label: "Driver en route",        color: "#6366f1", bg: "#e0e7ff", icon: "🚗" },
  on_scene:   { label: "Driver arrived",         color: "#a855f7", bg: "#f3e8ff", icon: "📍" },
  towing:     { label: "In transit",             color: "#f97316", bg: "#ffedd5", icon: "🚛" },
  completed:  { label: "Completed",              color: "#22c55e", bg: "#dcfce7", icon: "✅" },
  cancelled:  { label: "Cancelled",              color: "#ef4444", bg: "#fee2e2", icon: "❌" },
};

/* ── Types ── */

interface CustomerJob {
  id: string;
  status: string;
  customerName?: string;
  pickupAddress: string;
  destinationAddress?: string;
  totalAmount?: number;
  isPaid: boolean;
  paymentMethod?: string;
  towVehicleMake?: string;
  towVehicleModel?: string;
  towVehicleYear?: number;
  towVehicleColor?: string;
  towVehiclePlate?: string;
  assignedDriverId?: string;
  driverName?: string;
  estimatedArrival?: string;
  notes?: string;
  createdAt: string;
  assignedAt?: string;
  enRouteAt?: string;
  onSceneAt?: string;
  towingAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

interface CustomerInvoice {
  id: string;
  jobId?: string;
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
}

interface CustomerInfo {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  totalJobs?: number;
  isVip?: boolean;
}

/* ── Helpers ── */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ═══════════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════════ */

export default function TrackPage() {
  /* ── Login state ── */
  const [phone, setPhone] = useState("");
  const [jobIdLast4, setJobIdLast4] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  /* ── Portal state ── */
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [allJobs, setAllJobs] = useState<CustomerJob[]>([]);
  const [allInvoices, setAllInvoices] = useState<CustomerInvoice[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "history" | "invoices">("active");
  const [dataLoading, setDataLoading] = useState(false);

  /* ── Reorder modal ── */
  const [showReorder, setShowReorder] = useState(false);
  const [reorderPickup, setReorderPickup] = useState("");
  const [reorderDest, setReorderDest] = useState("");
  const [reorderSubmitting, setReorderSubmitting] = useState(false);

  const isLoggedIn = customer !== null;

  /* ── Login ── */
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setLoginError("Enter a valid 10-digit phone number");
      return;
    }
    if (jobIdLast4.trim().length < 4) {
      setLoginError("Enter at least 4 characters of your job ID");
      return;
    }

    setLoggingIn(true);
    try {
      // Authenticate via /api/track
      const authRes = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), jobIdLast4: jobIdLast4.trim() }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) {
        setLoginError(authData.error || "Login failed. Check your phone and job ID.");
        return;
      }

      setCustomer(authData.customer || { phone: cleanPhone });

      // Fetch full job + invoice data
      setDataLoading(true);
      try {
        const [jobsRes, invoicesRes] = await Promise.all([
          fetch(`/api/jobs?phone=${encodeURIComponent(cleanPhone)}`),
          fetch(`/api/invoices?phone=${encodeURIComponent(cleanPhone)}`),
        ]);
        const jobsData = await jobsRes.json();
        const invoicesData = await invoicesRes.json();

        setAllJobs(authData.jobs || jobsData.jobs || []);
        setAllInvoices(authData.invoices || invoicesData.invoices || []);
      } catch {
        // Fall back to auth response data
        setAllJobs(authData.jobs || []);
        setAllInvoices(authData.invoices || []);
      } finally {
        setDataLoading(false);
      }

      setActiveTab("active");
    } catch {
      setLoginError("Connection error. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  }, [phone, jobIdLast4]);

  const handleLogout = useCallback(() => {
    setCustomer(null);
    setAllJobs([]);
    setAllInvoices([]);
    setPhone("");
    setJobIdLast4("");
    setLoginError("");
    setActiveTab("active");
  }, []);

  /* ── Pay Now ── */
  const handlePayNow = useCallback(async (invoiceId: string) => {
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
      }
    } catch {
      // silent
    }
  }, []);

  /* ── Reorder ── */
  const handleReorder = useCallback(() => {
    const lastJob = allJobs[0];
    if (lastJob) setReorderPickup(lastJob.pickupAddress || "");
    setShowReorder(true);
  }, [allJobs]);

  const submitReorder = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderPickup.trim()) return;
    setReorderSubmitting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customer?.name,
          customerPhone: customer?.phone,
          customerEmail: customer?.email,
          pickupAddress: reorderPickup.trim(),
          destinationAddress: reorderDest.trim() || undefined,
          source: "app",
        }),
      });
      const data = await res.json();
      if (data.job) {
        setAllJobs(prev => [data.job, ...prev]);
        setShowReorder(false);
        setReorderPickup("");
        setReorderDest("");
        setActiveTab("active");
      }
    } catch {
      // silent
    } finally {
      setReorderSubmitting(false);
    }
  }, [reorderPickup, reorderDest, customer]);

  /* ── Derived ── */
  const activeJobs = allJobs.filter(j => !["completed", "cancelled"].includes(j.status));
  const completedJobs = allJobs.filter(j => ["completed", "cancelled"].includes(j.status));
  const unpaidInvoices = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled");

  /* ── Render ── */
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f6f9fc", fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#fff", borderBottom: "1px solid #e5edf5" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: "#533afd", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600 }}>T</div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#061b31", letterSpacing: "-0.01em" }}>TowHub</span>
          </div>
          {isLoggedIn && (
            <button onClick={handleLogout} style={{ fontSize: 12, fontWeight: 500, color: "#64748d", padding: "6px 12px", borderRadius: 6, border: "none", background: "none", cursor: "pointer" }}>
              Sign out
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px" }}>
        {/* ═══ NOT LOGGED IN ═══ */}
        {!isLoggedIn && (
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            {/* Login Card */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #e5edf5", borderRadius: 12, padding: "28px 24px", marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "#061b31", marginBottom: 4, letterSpacing: "-0.02em" }}>Customer Portal</h1>
              <p style={{ fontSize: 14, color: "#64748d", marginBottom: 24, lineHeight: 1.5 }}>
                Sign in with your phone number and the last 4 characters of any job ID.
              </p>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748d", marginBottom: 6 }}>Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setLoginError(""); }}
                    placeholder="(555) 123-4567"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid #e5edf5", fontSize: 14, color: "#061b31", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748d", marginBottom: 6 }}>Last 4 Characters of Job ID</label>
                  <input
                    type="text"
                    value={jobIdLast4}
                    onChange={e => { setJobIdLast4(e.target.value.slice(0, 8)); setLoginError(""); }}
                    placeholder="e.g. a1b2"
                    maxLength={8}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid #e5edf5", fontSize: 14, color: "#061b31", fontFamily: "monospace", letterSpacing: "0.05em", outline: "none", boxSizing: "border-box" }}
                  />
                  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Find this in your confirmation email or SMS</p>
                </div>

                {loginError && (
                  <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, backgroundColor: "#fef2f2", border: "1px solid #fecaca", fontSize: 13, color: "#dc2626" }}>
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loggingIn}
                  style={{ width: "100%", padding: "12px 0", borderRadius: 8, backgroundColor: "#533afd", color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: loggingIn ? "default" : "pointer", opacity: loggingIn ? 0.6 : 1 }}
                >
                  {loggingIn ? "Signing in…" : "Sign In"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ═══ LOGGED IN: Dashboard ═══ */}
        {isLoggedIn && (
          <>
            {/* Welcome */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 600, color: "#061b31", letterSpacing: "-0.02em" }}>
                    {customer?.name ? `Hi, ${customer.name.split(" ")[0]}` : "Your Dashboard"}
                  </h1>
                  <p style={{ fontSize: 14, color: "#64748d", marginTop: 2 }}>
                    {customer?.isVip && <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, backgroundColor: "#fef9c3", color: "#a16207", fontSize: 11, fontWeight: 600, marginRight: 6 }}>⭐ VIP</span>}
                    {allJobs.length} job{allJobs.length !== 1 ? "s" : ""} on record
                  </p>
                </div>
                <button
                  onClick={handleReorder}
                  style={{ padding: "10px 18px", borderRadius: 8, backgroundColor: "#533afd", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
                >
                  + New Tow
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
              <SummaryCard label="Active" value={activeJobs.length} color="#533afd" />
              <SummaryCard label="Completed" value={completedJobs.length} color="#22c55e" />
              <SummaryCard label="Unpaid" value={unpaidInvoices.length} color={unpaidInvoices.length > 0 ? "#f59e0b" : "#64748d"} />
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 8, backgroundColor: "#e5edf5", marginBottom: 20 }}>
              {([
                { key: "active" as const, label: "Active", count: activeJobs.length },
                { key: "history" as const, label: "History", count: completedJobs.length },
                { key: "invoices" as const, label: "Invoices", count: unpaidInvoices.length },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 6, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 500,
                    backgroundColor: activeTab === tab.key ? "#fff" : "transparent",
                    color: activeTab === tab.key ? "#061b31" : "#64748d",
                    boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 18, height: 18, borderRadius: 99, fontSize: 10, fontWeight: 600, marginLeft: 4,
                      backgroundColor: activeTab === tab.key ? "#533afd" : "#cbd5e1",
                      color: "#fff",
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Loading indicator */}
            {dataLoading && (
              <div style={{ textAlign: "center", padding: 24, color: "#64748d", fontSize: 13 }}>Loading your data…</div>
            )}

            {/* Active Jobs */}
            {activeTab === "active" && !dataLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {activeJobs.length === 0 && (
                  <EmptyState icon="🚛" title="No active tows" description="Need a tow? Hit the button above to request one." />
                )}
                {activeJobs.map(job => <JobCard key={job.id} job={job} />)}
              </div>
            )}

            {/* History */}
            {activeTab === "history" && !dataLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {completedJobs.length === 0 && (
                  <EmptyState icon="📋" title="No completed jobs yet" description="Your past tow jobs will appear here." />
                )}
                {completedJobs.map(job => <JobCard key={job.id} job={job} />)}
              </div>
            )}

            {/* Invoices */}
            {activeTab === "invoices" && !dataLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {allInvoices.length === 0 && (
                  <EmptyState icon="📄" title="No invoices" description="Invoices will appear here after your tow is completed." />
                )}
                {unpaidInvoices.length === 0 && allInvoices.length > 0 && (
                  <EmptyState icon="✅" title="All paid up!" description="You have no outstanding invoices." />
                )}
                {allInvoices.map(inv => <InvoiceCard key={inv.id} invoice={inv} jobs={allJobs} onPay={handlePayNow} />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Reorder Modal ═══ */}
      {showReorder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(6,27,49,0.5)" }}>
          <div style={{ width: "100%", maxWidth: 440, backgroundColor: "#fff", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#061b31" }}>Request a Tow</h2>
              <button onClick={() => setShowReorder(false)} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 99, border: "none", background: "none", fontSize: 18, color: "#64748d", cursor: "pointer" }}>×</button>
            </div>
            <form onSubmit={submitReorder}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748d", marginBottom: 6 }}>Pickup Address *</label>
                <input
                  value={reorderPickup}
                  onChange={e => setReorderPickup(e.target.value)}
                  placeholder="Where should we pick up?"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid #e5edf5", fontSize: 14, color: "#061b31", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748d", marginBottom: 6 }}>Destination (optional)</label>
                <input
                  value={reorderDest}
                  onChange={e => setReorderDest(e.target.value)}
                  placeholder="Where to?"
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: "1px solid #e5edf5", fontSize: 14, color: "#061b31", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowReorder(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 8, border: "1px solid #e5edf5", backgroundColor: "#fff", color: "#64748d", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={reorderSubmitting} style={{ flex: 1, padding: "12px 0", borderRadius: 8, backgroundColor: "#533afd", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: reorderSubmitting ? "default" : "pointer", opacity: reorderSubmitting ? 0.6 : 1 }}>
                  {reorderSubmitting ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════ */

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e5edf5", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#64748d", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e5edf5", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "#061b31", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#64748d" }}>{description}</div>
    </div>
  );
}

function JobCard({ job }: { job: CustomerJob }) {
  const meta = STATUS_META[job.status] || STATUS_META.pending;
  const currentStepIdx = STATUS_STEPS.indexOf(job.status as typeof STATUS_STEPS[number]);
  const isActive = !["completed", "cancelled"].includes(job.status);

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e5edf5", borderRadius: 12, overflow: "hidden" }}>
      {/* Status banner */}
      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: meta.bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{meta.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: meta.color }}>{meta.label}</span>
        </div>
        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748d" }}>#{job.id.slice(0, 8)}</span>
      </div>

      <div style={{ padding: 20 }}>
        {/* Progress bar */}
        {job.status !== "cancelled" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {STATUS_STEPS.map((step, i) => {
                const reached = i <= currentStepIdx;
                const isCurrent = i === currentStepIdx;
                return (
                  <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 500, flexShrink: 0,
                        backgroundColor: reached ? "#533afd" : "#e5edf5",
                        color: reached ? "#fff" : "#94a3b8",
                        boxShadow: isCurrent ? "0 0 0 3px rgba(83,58,253,0.2)" : "none",
                      }}>
                        {i < currentStepIdx ? "✓" : String(i + 1)}
                      </div>
                      <span style={{ fontSize: 9, color: reached ? "#533afd" : "#94a3b8", marginTop: 3, textAlign: "center", display: "none" }} className="step-label">
                        {STATUS_META[step]?.label.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div style={{ height: 2, flex: 1, marginLeft: 2, marginRight: 2, borderRadius: 1, backgroundColor: i < currentStepIdx ? "#533afd" : "#e5edf5" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ETA */}
        {isActive && job.estimatedArrival && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 16 }}>
            <span>⏱</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#166534" }}>ETA: {formatDateTime(job.estimatedArrival)}</span>
          </div>
        )}

        {/* Route */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, paddingTop: 2 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: "#533afd" }} />
              <div style={{ width: 1, height: 20, backgroundColor: "#e5edf5" }} />
              <div style={{ width: 8, height: 8, borderRadius: 99, backgroundColor: "#e5edf5", border: "2px solid #533afd" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#64748d", marginBottom: 2 }}>From</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#061b31", marginBottom: 10 }}>{job.pickupAddress}</div>
              {job.destinationAddress && (
                <>
                  <div style={{ fontSize: 12, color: "#64748d", marginBottom: 2 }}>To</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#061b31" }}>{job.destinationAddress}</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Driver info */}
        {job.driverName && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, backgroundColor: "#f8fafc", border: "1px solid #e5edf5", marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 99, backgroundColor: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>👤</div>
            <div>
              <div style={{ fontSize: 12, color: "#64748d" }}>Driver</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#061b31" }}>{job.driverName}</div>
            </div>
          </div>
        )}

        {/* Vehicle info */}
        {(job.towVehicleMake || job.towVehicleModel) && (
          <div style={{ padding: "10px 14px", borderRadius: 8, backgroundColor: "#f8fafc", border: "1px solid #e5edf5", marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#64748d", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Vehicle Being Towed</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#061b31" }}>
              {job.towVehicleYear ? `${job.towVehicleYear} ` : ""}{job.towVehicleMake || ""} {job.towVehicleModel || ""}
            </div>
            {(job.towVehicleColor || job.towVehiclePlate) && (
              <div style={{ fontSize: 12, color: "#64748d", marginTop: 2 }}>
                {job.towVehicleColor || ""}{job.towVehicleColor && job.towVehiclePlate ? " · " : ""}{job.towVehiclePlate || ""}
              </div>
            )}
          </div>
        )}

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, fontSize: 13 }}>
          {job.totalAmount != null && (
            <DetailRow label="Total" value={`$${job.totalAmount.toFixed(2)}`} valueColor="#061b31" bold />
          )}
          <DetailRow label="Payment" value={job.isPaid ? "Paid ✓" : "Due on delivery"} valueColor={job.isPaid ? "#22c55e" : "#f59e0b"} />
          <DetailRow label="Booked" value={formatDate(job.createdAt)} />
        </div>

        {/* Timeline */}
        {job.status !== "cancelled" && <StatusTimeline job={job} />}
      </div>
    </div>
  );
}

function StatusTimeline({ job }: { job: CustomerJob }) {
  const events: { label: string; time?: string }[] = [
    { label: "Booked", time: job.createdAt },
    { label: "Assigned", time: job.assignedAt },
    { label: "En route", time: job.enRouteAt },
    { label: "Arrived", time: job.onSceneAt },
    { label: "Towing", time: job.towingAt },
    { label: "Completed", time: job.completedAt },
  ].filter(e => e.time);

  if (events.length <= 1) return null;

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748d", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Timeline</div>
      <div>
        {events.map((ev, i) => (
          <div key={ev.label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, marginTop: 3, backgroundColor: i === events.length - 1 ? "#533afd" : "#cbd5e1" }} />
              {i < events.length - 1 && <div style={{ width: 1, height: 18, backgroundColor: "#e5edf5" }} />}
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#061b31" }}>{ev.label}</span>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>{ev.time ? timeAgo(ev.time) : ""}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value, valueColor, bold }: { label: string; value: string; valueColor?: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span style={{ color: "#64748d" }}>{label}</span>
      <span style={{ fontWeight: bold ? 600 : 500, color: valueColor || "#061b31", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function InvoiceCard({ invoice, jobs, onPay }: { invoice: CustomerInvoice; jobs: CustomerJob[]; onPay: (id: string) => void }) {
  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";
  const linkedJob = invoice.jobId ? jobs.find(j => j.id === invoice.jobId) : null;

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e5edf5", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#061b31" }}>{invoice.invoiceNumber}</div>
          <div style={{ fontSize: 12, color: "#64748d", marginTop: 2 }}>
            {formatDate(invoice.createdAt)}{linkedJob ? ` · ${linkedJob.pickupAddress?.slice(0, 40)}` : ""}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
          backgroundColor: isPaid ? "#dcfce7" : isOverdue ? "#fee2e2" : "#fef9c3",
          color: isPaid ? "#166534" : isOverdue ? "#dc2626" : "#a16207",
        }}>
          {isPaid ? "Paid" : isOverdue ? "Overdue" : invoice.status === "sent" ? "Due" : "Draft"}
        </span>
      </div>

      <div style={{ marginBottom: 16, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "#64748d" }}>Subtotal</span>
          <span style={{ color: "#061b31" }}>${invoice.subtotal.toFixed(2)}</span>
        </div>
        {invoice.tax != null && invoice.tax > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#64748d" }}>Tax</span>
            <span style={{ color: "#061b31" }}>${invoice.tax.toFixed(2)}</span>
          </div>
        )}
        {invoice.discount != null && invoice.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#64748d" }}>Discount</span>
            <span style={{ color: "#22c55e" }}>-${invoice.discount.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid #e5edf5", marginTop: 8 }}>
          <span style={{ fontWeight: 600, color: "#061b31" }}>Total</span>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#061b31" }}>${invoice.total.toFixed(2)}</span>
        </div>
      </div>

      {!isPaid && (
        <button
          onClick={() => onPay(invoice.id)}
          style={{ width: "100%", padding: "12px 0", borderRadius: 8, backgroundColor: "#533afd", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
        >
          Pay Now — ${invoice.total.toFixed(2)}
        </button>
      )}
    </div>
  );
}
