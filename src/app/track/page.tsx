"use client";

import { useState } from "react";

/*
 * Customer Portal — track your tow in real-time
 * 
 * Customer enters phone number or job ID to see:
 * - Job status (pending → assigned → en route → on scene → towing → completed)
 * - Estimated arrival time
 * - Driver info
 * - Vehicle being towed
 * - Payment status
 */

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Waiting for driver", color: "#eab308", icon: "⏳" },
  assigned: { label: "Driver assigned", color: "#3b82f6", icon: "👤" },
  en_route: { label: "Driver is on the way", color: "#6366f1", icon: "🚗" },
  on_scene: { label: "Driver has arrived", color: "#a855f7", icon: "📍" },
  towing: { label: "Vehicle is being towed", color: "#f97316", icon: "🚛" },
  completed: { label: "Completed", color: "#22c55e", icon: "✅" },
  cancelled: { label: "Cancelled", color: "#ef4444", icon: "❌" },
};

export default function TrackPage() {
  const [query, setQuery] = useState("");
  const [job, setJob] = useState<{ id: string; status: string; pickupAddress: string; destinationAddress?: string; totalAmount?: number; isPaid: boolean; towVehicleMake?: string; towVehicleModel?: string; towVehicleYear?: number; towVehicleColor?: string; towVehiclePlate?: string; createdAt: string; estimatedArrival?: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setJob(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/track?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.job) {
        setJob(data.job);
      } else {
        setError("No job found. Check your phone number or job ID.");
      }
    } catch {
      setError("Error looking up your job.");
    } finally {
      setLoading(false);
    }
  };

  const status = job ? STATUS_LABELS[job.status] || STATUS_LABELS.pending : null;
  const steps = ["pending", "assigned", "en_route", "on_scene", "towing", "completed"];
  const currentStep = job ? steps.indexOf(job.status) : -1;

  return (
    <div className="min-h-screen bg-[#f6f9fc]" style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Header */}
      <nav className="bg-white border-b border-[#e5edf5]">
        <div className="max-w-[600px] mx-auto px-6 h-14 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#533afd] rounded flex items-center justify-center text-white text-[11px] font-semibold">T</div>
            <span className="text-[15px] font-semibold tracking-tight">TowHub — Track Your Tow</span>
          </div>
        </div>
      </nav>

      <div className="max-w-[600px] mx-auto px-6 py-12">
        {/* Search */}
        <div className="bg-white border border-[#e5edf5] rounded-lg p-6 mb-6">
          <h1 className="text-[24px] font-semibold tracking-[-0.5px] mb-2">Track Your Tow</h1>
          <p className="text-[14px] text-[#64748d] mb-4">Enter your phone number or job ID to see the status of your tow.</p>
          <form onSubmit={search} className="flex gap-3">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Phone number or Job ID"
              className="flex-1 px-4 py-3 border border-[#e5edf5] rounded-lg text-[14px] focus:border-[#533afd] outline-none" />
            <button type="submit" disabled={loading} className="bg-[#533afd] text-white px-6 py-3 rounded-lg text-[14px] font-medium disabled:opacity-50">
              {loading ? "..." : "Track"}
            </button>
          </form>
          {error && <div className="mt-3 text-[13px] text-[#dc2626]">{error}</div>}
        </div>

        {/* Job Status */}
        {job && status && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[32px]">{status.icon}</span>
                <div>
                  <div className="text-[18px] font-semibold" style={{ color: status.color }}>{status.label}</div>
                  <div className="text-[13px] text-[#64748d]">Job #{(job.id).slice(0, 8)}</div>
                </div>
              </div>

              {/* Progress steps */}
              <div className="flex items-center gap-1 mb-4">
                {steps.map((s, i) => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${i <= currentStep ? "bg-[#533afd] text-white" : "bg-[#e5edf5] text-[#94a3b8]"}`}>
                      {i < currentStep ? "✓" : i + 1}
                    </div>
                    {i < steps.length - 1 && <div className={`w-6 h-0.5 ${i < currentStep ? "bg-[#533afd]" : "bg-[#e5edf5]"}`} />}
                  </div>
                ))}
              </div>

              {/* Details */}
              <div className="space-y-2 text-[14px]">
                <div className="flex justify-between"><span className="text-[#64748d]">From:</span><span className="font-medium">{job.pickupAddress}</span></div>
                {job.destinationAddress && <div className="flex justify-between"><span className="text-[#64748d]">To:</span><span className="font-medium">{job.destinationAddress}</span></div>}
                {job.totalAmount && <div className="flex justify-between"><span className="text-[#64748d]">Total:</span><span className="font-semibold">${(job.totalAmount).toFixed(2)}</span></div>}
                <div className="flex justify-between"><span className="text-[#64748d]">Payment:</span><span className={job.isPaid ? "text-[#22c55e] font-medium" : "text-[#f59e0b] font-medium"}>{job.isPaid ? "Paid" : "Due on delivery"}</span></div>
              </div>
            </div>

            {/* Vehicle info */}
            {(job.towVehicleMake || job.towVehicleModel) && (
              <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
                <div className="text-[12px] text-[#64748d] uppercase tracking-wider mb-2">Your Vehicle</div>
                <div className="text-[15px] font-medium">{job.towVehicleYear} {job.towVehicleMake} {job.towVehicleModel}</div>
                {job.towVehicleColor && <div className="text-[13px] text-[#64748d]">{job.towVehicleColor} {job.towVehiclePlate && `• ${job.towVehiclePlate}`}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
