"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Org {
  id: string; name: string; slug: string; email: string; phone?: string;
  city?: string; state?: string; status: string; commissionPercent?: number;
  apiKey?: string; createdAt: string; settings?: Record<string, unknown>;
}

export default function CompaniesPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selected, setSelected] = useState<Org | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin");
    const data = await res.json();
    setOrgs(data.organizations || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orgId: string, status: string) => {
    await fetch("/api/admin/approve", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, status }) });
    load();
  };

  const impersonate = async (orgId: string) => {
    if (!confirm("Login as this company? You'll be redirected to their dashboard.")) return;
    setImpersonating(true);
    const res = await fetch("/api/admin/impersonate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId }) });
    const data = await res.json();
    if (res.ok) {
      router.push("/dashboard");
    } else {
      alert(data.error);
      setImpersonating(false);
    }
  };

  return (
    <div className="flex gap-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Company list */}
      <div className="flex-1 space-y-4">
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Companies ({orgs.length})</h2>

        {orgs.length === 0 ? (
          <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
            <div className="text-[32px] mb-3 opacity-30">🏢</div>
            <div className="text-[14px] text-[#64748d]">No companies yet. Approve waitlist entries to add them.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {orgs.map(org => (
              <div key={org.id} onClick={() => setSelected(org)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(50,50,93,0.06)] ${selected?.id === org.id ? "border-[#533afd] shadow-[0_4px_12px_rgba(83,58,253,0.1)]" : "border-[#e5edf5]"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold">{org.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        org.status === "approved" ? "bg-[#dcfce7] text-[#166534]" :
                        org.status === "pending" ? "bg-[#fef3c7] text-[#92400e]" :
                        "bg-[#fef2f2] text-[#991b1b]"
                      }`}>{org.status}</span>
                    </div>
                    <div className="text-[12px] text-[#64748d] mt-0.5">{org.email} • {org.city}, {org.state} • {org.commissionPercent || 15}% commission</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {org.status !== "approved" && <button onClick={(e) => { e.stopPropagation(); updateStatus(org.id, "approved"); }} className="text-[11px] bg-[#dcfce7] text-[#166534] px-2 py-1 rounded font-medium">Approve</button>}
                    {org.status !== "suspended" && <button onClick={(e) => { e.stopPropagation(); updateStatus(org.id, "suspended"); }} className="text-[11px] bg-[#fef2f2] text-[#991b1b] px-2 py-1 rounded font-medium">Suspend</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-[400px] bg-white border border-[#e5edf5] rounded-lg overflow-hidden shrink-0">
          <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center justify-between">
            <div className="text-[15px] font-semibold">{selected.name}</div>
            <button onClick={() => setSelected(null)} className="text-[#64748d] hover:text-[#061b31] text-lg">×</button>
          </div>
          <div className="p-5 space-y-5">
            {/* Company Info */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Company</div>
              <div className="space-y-1 text-[13px]">
                <div>📧 {selected.email}</div>
                {selected.phone && <div>📞 {selected.phone}</div>}
                {selected.city && <div>📍 {selected.city}, {selected.state}</div>}
                <div>💰 {selected.commissionPercent || 15}% commission</div>
                <div>🔑 API Key: {selected.apiKey ? "Yes" : "Not set"}</div>
                <div>📅 Joined: {new Date(selected.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Onboarding data */}
            {selected.settings && typeof selected.settings === 'object' && 'onboarding' in selected.settings && selected.settings.onboarding && (
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Onboarding</div>
                <div className="space-y-1 text-[13px]">
                  {(() => {
                    const ob = selected.settings.onboarding as Record<string, string | boolean | number>;
                    return <>
                      {ob.fleetSize && <div>🚛 Fleet: {String(ob.fleetSize)} vehicles</div>}
                      {ob.driverCount && <div>👥 Drivers: {String(ob.driverCount)}</div>}
                      {ob.scheduleType && <div>⏰ Schedule: {ob.scheduleType === "24_7" ? "24/7" : ob.scheduleType === "day_only" ? "Day only" : "Custom"}</div>}
                      <div>📜 Police Rotation: {ob.hasPoliceRotation ? "Yes" : "No"}</div>
                      <div>🅿️ Impound Lot: {ob.hasImpoundLot ? "Yes" : "No"}</div>
                      <div>🤖 AI Dispatcher: {ob.needsAiDispatcher ? "Yes" : "No"}</div>
                      <div>🔗 Lead Capture: {ob.needsLeadCapture ? "Yes" : "No"}</div>
                      <div>📄 AI Docs: {ob.needsAiDocuments ? "Yes" : "No"}</div>
                      {ob.ownerName && <div>👤 Owner: {String(ob.ownerName)}</div>}
                    </>;
                  })()}
                </div>
              </div>
            )}

            {/* Upsell recommendations */}
            {selected.settings && typeof selected.settings === 'object' && 'upsellRecommendations' in selected.settings && selected.settings.upsellRecommendations && (
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Upsell Opportunities</div>
                <div className="space-y-2">
                  {(selected.settings.upsellRecommendations as Array<{ feature: string; title: string; desc: string; priority: string; price: string }>).map((u, i) => (
                    <div key={i} className="p-3 bg-[#f6f9fc] border border-[#e5edf5] rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="text-[12px] font-medium">{u.title}</div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${u.priority === "high" ? "bg-[#ea2261]/10 text-[#ea2261]" : u.priority === "medium" ? "bg-[#f59e0b]/10 text-[#f59e0b]" : "bg-[#64748d]/10 text-[#64748d]"}`}>{u.priority}</span>
                      </div>
                      <div className="text-[11px] text-[#64748d]">{u.desc} • {u.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-[#e5edf5]">
              <button onClick={() => impersonate(selected.id)} disabled={impersonating}
                className="w-full bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4] disabled:opacity-50">
                {impersonating ? "Logging in..." : "🔑 Login as this Company"}
              </button>
              <div className="text-[10px] text-[#94a3b8] text-center">You&apos;ll be redirected to their dashboard</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
