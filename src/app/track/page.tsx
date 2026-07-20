"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/lib/toast";

/*
 * Customer Portal — /track
 *
 * Two-phase experience:
 *   1. Login via phone number + last 4 chars of any job ID (no password)
 *   2. Dashboard: all jobs with status timeline, unpaid invoices, reorder
 *
 * Design tokens: primary #533afd, text #061b31, muted #64748d, border #e5edf5
 * Mobile-first, Stripe-style clean layout
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

export default function TrackPage() {
  const toast = useToast();

  // Login state
  const [phone, setPhone] = useState("");
  const [jobIdLast4, setJobIdLast4] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Portal state
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [allJobs, setAllJobs] = useState<CustomerJob[]>([]);
  const [allInvoices, setAllInvoices] = useState<CustomerInvoice[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "history" | "invoices">("active");

  // Reorder modal
  const [showReorder, setShowReorder] = useState(false);
  const [reorderPickup, setReorderPickup] = useState("");
  const [reorderDest, setReorderDest] = useState("");
  const [reorderSubmitting, setReorderSubmitting] = useState(false);

  // Quick track (non-logged-in)
  const [quickQuery, setQuickQuery] = useState("");
  const [quickJob, setQuickJob] = useState<CustomerJob | null>(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [showQuickTrack, setShowQuickTrack] = useState(false);

  const isLoggedIn = customer !== null && allJobs.length > 0;

  /* ── Login ── */
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast.error("Enter your phone number"); return; }
    if (jobIdLast4.trim().length < 4) { toast.error("Enter at least 4 characters of your job ID"); return; }

    setLoggingIn(true);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), jobIdLast4: jobIdLast4.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }
      setCustomer(data.customer);
      setAllJobs(data.jobs || []);
      setAllInvoices(data.invoices || []);
      setActiveTab("active");
      toast.success(`Welcome back${data.customer?.name ? ", " + data.customer.name : ""}!`);
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  }, [phone, jobIdLast4, toast]);

  const handleLogout = useCallback(() => {
    setCustomer(null);
    setAllJobs([]);
    setAllInvoices([]);
    setPhone("");
    setJobIdLast4("");
    setActiveTab("active");
  }, []);

  /* ── Quick Track ── */
  const handleQuickTrack = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    setQuickLoading(true);
    setQuickError("");
    setQuickJob(null);
    try {
      const res = await fetch(`/api/track?q=${encodeURIComponent(quickQuery.trim())}`);
      const data = await res.json();
      if (data.job) {
        setQuickJob(data.job);
      } else {
        setQuickError("No job found. Check your phone number or job ID.");
      }
    } catch {
      setQuickError("Error looking up your job.");
    } finally {
      setQuickLoading(false);
    }
  }, [quickQuery]);

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
        toast.info("Redirecting to payment...");
      } else if (data.message) {
        toast.info(data.message);
      } else {
        toast.error(data.error || "Could not start payment");
      }
    } catch {
      toast.error("Payment service unavailable");
    }
  }, [toast]);

  /* ── Reorder ── */
  const handleReorder = useCallback(() => {
    const lastJob = allJobs[0];
    if (lastJob) {
      setReorderPickup(lastJob.pickupAddress || "");
    }
    setShowReorder(true);
  }, [allJobs]);

  const submitReorder = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reorderPickup.trim()) { toast.error("Pickup address is required"); return; }
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
        toast.success("New tow request submitted!");
        setShowReorder(false);
        setReorderPickup("");
        setReorderDest("");
        // Add the new job to the list
        setAllJobs(prev => [data.job, ...prev]);
        setActiveTab("active");
      } else {
        toast.error(data.error || "Could not create request");
      }
    } catch {
      toast.error("Could not submit request. Please call us.");
    } finally {
      setReorderSubmitting(false);
    }
  }, [reorderPickup, reorderDest, customer, toast]);

  /* ── Derived ── */
  const activeJobs = allJobs.filter(j => !["completed", "cancelled"].includes(j.status));
  const completedJobs = allJobs.filter(j => ["completed", "cancelled"].includes(j.status));
  const unpaidInvoices = allInvoices.filter(i => i.status !== "paid" && i.status !== "cancelled");

  /* ── Render ── */
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f6f9fc", fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Header */}
      <nav style={{ backgroundColor: "#fff", borderBottom: "1px solid #e5edf5" }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: "#533afd" }}>T</div>
            <span className="text-sm font-semibold tracking-tight" style={{ color: "#061b31" }}>TowHub</span>
          </div>
          {isLoggedIn && (
            <button onClick={handleLogout} className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors" style={{ color: "#64748d" }}>
              Sign out
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ─── NOT LOGGED IN: Login + Quick Track ─── */}
        {!isLoggedIn && (
          <>
            {/* Portal Login */}
            <div className="rounded-xl p-5 sm:p-6 mb-5" style={{ backgroundColor: "#fff", border: "1px solid #e5edf5" }}>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1" style={{ color: "#061b31" }}>Customer Portal</h1>
              <p className="text-sm mb-5" style={{ color: "#64748d" }}>
                Sign in with your phone number and the last 4 characters of any job ID to view your history, invoices, and track active tows.
              </p>
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748d" }}>Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow"
                    style={{ border: "1px solid #e5edf5", color: "#061b31" }}
                    onFocus={e => (e.target.style.borderColor = "#533afd", e.target.style.boxShadow = "0 0 0 3px rgba(83,58,253,0.1)")}
                    onBlur={e => (e.target.style.borderColor = "#e5edf5", e.target.style.boxShadow = "none")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748d" }}>Last 4 Characters of Job ID</label>
                  <input
                    type="text"
                    value={jobIdLast4}
                    onChange={e => setJobIdLast4(e.target.value.slice(0, 8))}
                    placeholder="e.g. a1b2"
                    maxLength={8}
                    className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow font-mono"
                    style={{ border: "1px solid #e5edf5", color: "#061b31", letterSpacing: "0.05em" }}
                    onFocus={e => (e.target.style.borderColor = "#533afd", e.target.style.boxShadow = "0 0 0 3px rgba(83,58,253,0.1)")}
                    onBlur={e => (e.target.style.borderColor = "#e5edf5", e.target.style.boxShadow = "none")}
                  />
                  <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                    Find this in your confirmation email or SMS
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full py-3 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "#533afd" }}
                >
                  {loggingIn ? "Signing in…" : "Sign In"}
                </button>
              </form>
            </div>

            {/* Quick Track (no login needed) */}
            <div className="text-center mb-4">
              <button
                onClick={() => setShowQuickTrack(!showQuickTrack)}
                className="text-xs font-medium underline"
                style={{ color: "#533afd" }}
              >
                {showQuickTrack ? "Hide quick track" : "Just track a single job →"}
              </button>
            </div>

            {showQuickTrack && (
              <div className="rounded-xl p-5 sm:p-6" style={{ backgroundColor: "#fff", border: "1px solid #e5edf5" }}>
                <h2 className="text-base font-semibold mb-1" style={{ color: "#061b31" }}>Quick Track</h2>
                <p className="text-xs mb-4" style={{ color: "#64748d" }}>Enter your phone number or job ID for a quick status check.</p>
                <form onSubmit={handleQuickTrack} className="flex gap-2">
                  <input
                    value={quickQuery}
                    onChange={e => setQuickQuery(e.target.value)}
                    placeholder="Phone or Job ID"
                    className="flex-1 px-4 py-3 rounded-lg text-sm outline-none"
                    style={{ border: "1px solid #e5edf5", color: "#061b31" }}
                  />
                  <button
                    type="submit"
                    disabled={quickLoading}
                    className="px-5 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: "#533afd" }}
                  >
                    {quickLoading ? "…" : "Track"}
                  </button>
                </form>
                {quickError && <p className="mt-3 text-xs" style={{ color: "#dc2626" }}>{quickError}</p>}

                {quickJob && <QuickJobCard job={quickJob} />}
              </div>
            )}
          </>
        )}

        {/* ─── LOGGED IN: Dashboard ─── */}
        {isLoggedIn && (
          <>
            {/* Welcome banner */}
            <div className="mb-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: "#061b31" }}>
                    {customer?.name ? `Hi, ${customer.name.split(" ")[0]}` : "Your Dashboard"}
                  </h1>
                  <p className="text-sm" style={{ color: "#64748d" }}>
                    {customer?.isVip && <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#fef9c3", color: "#a16207" }}>⭐ VIP</span>}
                    {allJobs.length} job{allJobs.length !== 1 ? "s" : ""} on record
                  </p>
                </div>
                <button
                  onClick={handleReorder}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#533afd" }}
                >
                  + Request New Tow
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <SummaryCard label="Active Jobs" value={activeJobs.length} color="#533afd" />
              <SummaryCard label="Completed" value={completedJobs.length} color="#22c55e" />
              <SummaryCard label="Unpaid" value={unpaidInvoices.length} color={unpaidInvoices.length > 0 ? "#f59e0b" : "#64748d"} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg mb-5" style={{ backgroundColor: "#e5edf5" }}>
              {([
                { key: "active", label: "Active", count: activeJobs.length },
                { key: "history", label: "History", count: completedJobs.length },
                { key: "invoices", label: "Invoices", count: unpaidInvoices.length },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex-1 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === tab.key ? "#fff" : "transparent",
                    color: activeTab === tab.key ? "#061b31" : "#64748d",
                    boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold" style={{
                      backgroundColor: activeTab === tab.key ? "#533afd" : "#cbd5e1",
                      color: "#fff",
                      fontSize: "10px",
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Active Jobs Tab */}
            {activeTab === "active" && (
              <div className="space-y-4">
                {activeJobs.length === 0 && (
                  <EmptyState
                    icon="🚛"
                    title="No active tows"
                    description="Need a tow? Hit the button above to request one."
                  />
                )}
                {activeJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {/* History Tab */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {completedJobs.length === 0 && (
                  <EmptyState
                    icon="📋"
                    title="No completed jobs yet"
                    description="Your past tow jobs will appear here."
                  />
                )}
                {completedJobs.map(job => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {/* Invoices Tab */}
            {activeTab === "invoices" && (
              <div className="space-y-3">
                {unpaidInvoices.length === 0 && allInvoices.length === 0 && (
                  <EmptyState
                    icon="📄"
                    title="No invoices"
                    description="Invoices will appear here after your tow is completed."
                  />
                )}
                {unpaidInvoices.length === 0 && allInvoices.length > 0 && (
                  <EmptyState
                    icon="✅"
                    title="All paid up!"
                    description="You have no outstanding invoices."
                  />
                )}
                {allInvoices.map(inv => (
                  <InvoiceCard key={inv.id} invoice={inv} jobs={allJobs} onPay={handlePayNow} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Reorder Modal ─── */}
      {showReorder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(6,27,49,0.5)" }}>
          <div className="w-full max-w-md rounded-xl p-6" style={{ backgroundColor: "#fff" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "#061b31" }}>Request a Tow</h2>
              <button onClick={() => setShowReorder(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-lg" style={{ color: "#64748d" }}>×</button>
            </div>
            <form onSubmit={submitReorder} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748d" }}>Pickup Address *</label>
                <input
                  value={reorderPickup}
                  onChange={e => setReorderPickup(e.target.value)}
                  placeholder="Where should we pick up?"
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{ border: "1px solid #e5edf5", color: "#061b31" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#64748d" }}>Destination (optional)</label>
                <input
                  value={reorderDest}
                  onChange={e => setReorderDest(e.target.value)}
                  placeholder="Where to?"
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{ border: "1px solid #e5edf5", color: "#061b31" }}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReorder(false)}
                  className="flex-1 py-3 rounded-lg text-sm font-medium"
                  style={{ border: "1px solid #e5edf5", color: "#64748d" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reorderSubmitting}
                  className="flex-1 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: "#533afd" }}
                >
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
    <div className="rounded-xl p-4" style={{ backgroundColor: "#fff", border: "1px solid #e5edf5" }}>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: "#64748d" }}>{label}</div>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "#fff", border: "1px solid #e5edf5" }}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-sm font-medium mb-1" style={{ color: "#061b31" }}>{title}</div>
      <div className="text-xs" style={{ color: "#64748d" }}>{description}</div>
    </div>
  );
}

function JobCard({ job }: { job: CustomerJob }) {
  const meta = STATUS_META[job.status] || STATUS_META.pending;
  const currentStepIdx = STATUS_STEPS.indexOf(job.status as typeof STATUS_STEPS[number]);
  const isActive = !["completed", "cancelled"].includes(job.status);

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #e5edf5" }}>
      {/* Status banner */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: meta.bg }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <span className="text-xs font-mono" style={{ color: "#64748d" }}>#{job.id.slice(0, 8)}</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Progress bar */}
        {!["cancelled"].includes(job.status) && (
          <div>
            <div className="flex items-center gap-1">
              {STATUS_STEPS.map((step, i) => {
                const reached = i <= currentStepIdx;
                const isCurrent = i === currentStepIdx;
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                        style={{
                          backgroundColor: reached ? "#533afd" : "#e5edf5",
                          color: reached ? "#fff" : "#94a3b8",
                          boxShadow: isCurrent ? "0 0 0 3px rgba(83,58,253,0.2)" : "none",
                        }}
                      >
                        {i < currentStepIdx ? "✓" : i + 1}
                      </div>
                      <span className="text-center mt-1 hidden sm:block" style={{ fontSize: "9px", color: reached ? "#533afd" : "#94a3b8" }}>
                        {STATUS_META[step]?.label.split(" ").slice(0, 2).join(" ")}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className="h-0.5 flex-1 mx-1 rounded" style={{ backgroundColor: i < currentStepIdx ? "#533afd" : "#e5edf5" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ETA */}
        {isActive && job.estimatedArrival && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <span>⏱</span>
            <span className="text-sm font-medium" style={{ color: "#166534" }}>
              ETA: {formatDateTime(job.estimatedArrival)}
            </span>
          </div>
        )}

        {/* Details grid */}
        <div className="space-y-2.5 text-sm">
          <DetailRow label="From" value={job.pickupAddress} />
          {job.destinationAddress && <DetailRow label="To" value={job.destinationAddress} />}
          {job.totalAmount != null && (
            <DetailRow label="Total" value={`$${job.totalAmount.toFixed(2)}`} highlight />
          )}
          <DetailRow
            label="Payment"
            value={job.isPaid ? "Paid ✓" : "Due on delivery"}
            valueColor={job.isPaid ? "#22c55e" : "#f59e0b"}
          />
          <DetailRow label="Booked" value={formatDate(job.createdAt)} />
        </div>

        {/* Vehicle info */}
        {(job.towVehicleMake || job.towVehicleModel) && (
          <div className="p-3 rounded-lg" style={{ backgroundColor: "#f8fafc", border: "1px solid #e5edf5" }}>
            <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "#64748d" }}>Vehicle Being Towed</div>
            <div className="text-sm font-medium" style={{ color: "#061b31" }}>
              {job.towVehicleYear ? `${job.towVehicleYear} ` : ""}
              {job.towVehicleMake || ""} {job.towVehicleModel || ""}
            </div>
            {(job.towVehicleColor || job.towVehiclePlate) && (
              <div className="text-xs mt-0.5" style={{ color: "#64748d" }}>
                {job.towVehicleColor || ""}{job.towVehicleColor && job.towVehiclePlate ? " · " : ""}{job.towVehiclePlate || ""}
              </div>
            )}
          </div>
        )}

        {/* Status timestamps */}
        {job.status !== "cancelled" && (
          <StatusTimeline job={job} />
        )}
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
    <div className="pt-2">
      <div className="text-xs font-medium mb-2" style={{ color: "#64748d" }}>Timeline</div>
      <div className="space-y-0">
        {events.map((ev, i) => (
          <div key={ev.label} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{
                backgroundColor: i === events.length - 1 ? "#533afd" : "#cbd5e1",
              }} />
              {i < events.length - 1 && <div className="w-px h-5" style={{ backgroundColor: "#e5edf5" }} />}
            </div>
            <div className="flex-1 flex items-center justify-between pb-2">
              <span className="text-xs" style={{ color: "#061b31" }}>{ev.label}</span>
              <span className="text-xs" style={{ color: "#94a3b8" }}>{ev.time ? timeAgo(ev.time) : ""}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight, valueColor }: { label: string; value: string; highlight?: boolean; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ color: "#64748d" }}>{label}</span>
      <span className="font-medium text-right" style={{ color: valueColor || "#061b31", fontWeight: highlight ? 600 : 500 }}>
        {value}
      </span>
    </div>
  );
}

function InvoiceCard({ invoice, jobs, onPay }: { invoice: CustomerInvoice; jobs: CustomerJob[]; onPay: (id: string) => void }) {
  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";
  const linkedJob = invoice.jobId ? jobs.find(j => j.id === invoice.jobId) : null;

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: "#fff", border: "1px solid #e5edf5" }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-semibold" style={{ color: "#061b31" }}>{invoice.invoiceNumber}</div>
          <div className="text-xs" style={{ color: "#64748d" }}>
            {formatDate(invoice.createdAt)}
            {linkedJob && ` · ${linkedJob.pickupAddress?.slice(0, 40)}`}
          </div>
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: isPaid ? "#dcfce7" : isOverdue ? "#fee2e2" : "#fef9c3",
            color: isPaid ? "#166534" : isOverdue ? "#dc2626" : "#a16207",
          }}
        >
          {isPaid ? "Paid" : isOverdue ? "Overdue" : invoice.status === "sent" ? "Due" : "Draft"}
        </span>
      </div>

      <div className="space-y-1.5 text-sm mb-4">
        <div className="flex justify-between">
          <span style={{ color: "#64748d" }}>Subtotal</span>
          <span style={{ color: "#061b31" }}>${invoice.subtotal.toFixed(2)}</span>
        </div>
        {invoice.tax != null && invoice.tax > 0 && (
          <div className="flex justify-between">
            <span style={{ color: "#64748d" }}>Tax</span>
            <span style={{ color: "#061b31" }}>${invoice.tax.toFixed(2)}</span>
          </div>
        )}
        {invoice.discount != null && invoice.discount > 0 && (
          <div className="flex justify-between">
            <span style={{ color: "#64748d" }}>Discount</span>
            <span style={{ color: "#22c55e" }}>-${invoice.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1.5" style={{ borderTop: "1px solid #e5edf5" }}>
          <span className="font-semibold" style={{ color: "#061b31" }}>Total</span>
          <span className="font-semibold text-base" style={{ color: "#061b31" }}>${invoice.total.toFixed(2)}</span>
        </div>
      </div>

      {!isPaid && (
        <button
          onClick={() => onPay(invoice.id)}
          className="w-full py-3 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#533afd" }}
        >
          Pay Now — ${invoice.total.toFixed(2)}
        </button>
      )}
    </div>
  );
}

function QuickJobCard({ job }: { job: CustomerJob }) {
  const meta = STATUS_META[job.status] || STATUS_META.pending;
  const currentStepIdx = STATUS_STEPS.indexOf(job.status as typeof STATUS_STEPS[number]);

  return (
    <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid #e5edf5" }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{meta.icon}</span>
        <span className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</span>
        <span className="ml-auto text-xs font-mono" style={{ color: "#64748d" }}>#{job.id.slice(0, 8)}</span>
      </div>

      {/* Mini progress bar */}
      {!["cancelled"].includes(job.status) && (
        <div className="flex items-center gap-1">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0"
                style={{
                  backgroundColor: i <= currentStepIdx ? "#533afd" : "#e5edf5",
                  color: i <= currentStepIdx ? "#fff" : "#94a3b8",
                  fontSize: "9px",
                }}
              >
                {i < currentStepIdx ? "✓" : i + 1}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div className="h-0.5 flex-1 mx-0.5 rounded" style={{ backgroundColor: i < currentStepIdx ? "#533afd" : "#e5edf5" }} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5 text-sm">
        <DetailRow label="From" value={job.pickupAddress} />
        {job.destinationAddress && <DetailRow label="To" value={job.destinationAddress} />}
        {job.totalAmount != null && <DetailRow label="Total" value={`$${job.totalAmount.toFixed(2)}`} highlight />}
        {job.estimatedArrival && <DetailRow label="ETA" value={formatDateTime(job.estimatedArrival)} />}
      </div>
    </div>
  );
}
