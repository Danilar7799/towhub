"use client";

import { useState, useEffect } from "react";

interface Ad {
  id: string; placement: string; title: string; subtitle: string;
  cta: string; ctaLink: string; bgColor: string; textColor: string;
  targetRoles: string[]; targetPlans: string[]; active: boolean;
  priority: number; startDate: string; endDate: string;
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    placement: "top_banner", title: "", subtitle: "", cta: "", ctaLink: "",
    bgColor: "#533afd", textColor: "#ffffff",
    targetRoles: ["owner", "admin"], targetPlans: [] as string[],
    startDate: "", endDate: "", priority: "1",
  });

  useEffect(() => {
    fetch("/api/ads").then(r => r.json()).then(d => setAds(d.ads || []));
  }, []);

  return (
    <div className="space-y-6" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">📢 Ad Management</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Configure promotional banners across the platform</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">+ Create Ad</button>
      </div>

      {/* Current ads */}
      <div className="space-y-3">
        {ads.map(ad => (
          <div key={ad.id} className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${ad.active ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fef2f2] text-[#991b1b]"}`}>
                    {ad.active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-[10px] bg-[#f6f9fc] text-[#64748d] px-1.5 py-0.5 rounded">{ad.placement.replace("_", " ")}</span>
                  <span className="text-[10px] text-[#94a3b8]">Priority: {ad.priority}</span>
                </div>
                <div className="text-[14px] font-medium text-[#061b31]">{ad.title}</div>
                <div className="text-[12px] text-[#64748d]">{ad.subtitle}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-[#94a3b8]">Roles: {ad.targetRoles.join(", ")}</span>
                  <span className="text-[10px] text-[#94a3b8]">•</span>
                  <span className="text-[10px] text-[#94a3b8]">{ad.startDate} → {ad.endDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-6 rounded" style={{ backgroundColor: ad.bgColor }} />
                <button className="text-[12px] text-[#dc2626] font-medium hover:underline">Disable</button>
              </div>
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 rounded" style={{ backgroundColor: ad.bgColor, color: ad.textColor }}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium">{ad.title}</span>
                <span className="opacity-80">{ad.subtitle}</span>
                <span className="px-2 py-0.5 rounded bg-white/20 text-[11px] font-medium">{ad.cta}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placement guide */}
      <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-lg p-5">
        <div className="text-[13px] font-medium text-[#061b31] mb-3">📋 Ad Placements</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "top_banner", name: "Top Banner", desc: "Full-width bar at top of app. Visible to all users.", icon: "📱" },
            { id: "sidebar", name: "Sidebar Card", desc: "Appears on Overview page sidebar. Owner/admin only.", icon: "📰" },
            { id: "inline", name: "Inline Banner", desc: "Between content sections. Driver-friendly.", icon: "📋" },
            { id: "modal", name: "Popup Modal", desc: "Shows once per session. High impact.", icon: "🔲" },
          ].map(p => (
            <div key={p.id} className="p-3 border border-[#e5edf5] rounded-lg bg-white">
              <div className="text-[16px] mb-1">{p.icon}</div>
              <div className="text-[12px] font-medium text-[#061b31]">{p.name}</div>
              <div className="text-[11px] text-[#64748d]">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Targeting rules */}
      <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-lg p-5">
        <div className="text-[13px] font-medium text-[#061b31] mb-2">🎯 Targeting</div>
        <div className="text-[12px] text-[#64748d] space-y-1">
          <p>• <strong>By Role:</strong> Show ads only to specific user roles (owner, admin, dispatcher, driver)</p>
          <p>• <strong>By Plan:</strong> Show upgrade prompts only to starter plan users</p>
          <p>• <strong>By Date:</strong> Set start/end dates for time-limited promotions</p>
          <p>• <strong>Driver Protection:</strong> Drivers see minimal/no ads — only the inline placement is available for drivers</p>
        </div>
      </div>
    </div>
  );
}
