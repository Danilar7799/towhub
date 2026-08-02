"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

/*
 * Admin Panel Visibility Settings
 * Owner/Super Admin can choose which pages/features are visible in the sidebar
 * This controls what all users see — not just their own view
 */

interface VisibilitySettings {
  [key: string]: boolean;
}

// All available sidebar items with their labels
const ALL_PAGES = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "dispatch", label: "Dispatch", icon: "🗺️" },
  { id: "live_calls", label: "Live Calls", icon: "📞" },
  { id: "jobs", label: "Jobs", icon: "📋" },
  { id: "calendar", label: "Calendar", icon: "📅" },
  { id: "driver_kpi", label: "Driver KPI", icon: "🏆" },
  { id: "customers", label: "Customers", icon: "👥" },
  { id: "fleet", label: "Fleet", icon: "🚛" },
  { id: "maintenance", label: "Maintenance", icon: "🔧" },
  { id: "team", label: "Team", icon: "👤" },
  { id: "compliance", label: "Compliance", icon: "🛡️" },
  { id: "subcontractors", label: "Subcontractors", icon: "🏢" },
  { id: "contracts", label: "Contracts", icon: "📄" },
  { id: "leads", label: "Leads", icon: "🔗" },
  { id: "invoices", label: "Invoices", icon: "💰" },
  { id: "expenses", label: "Expenses", icon: "💸" },
  { id: "earnings", label: "Earnings", icon: "📈" },
  { id: "reports", label: "Reports", icon: "📊" },
  { id: "impound", label: "Impound", icon: "🅿️" },
  { id: "auctions", label: "Auctions", icon: "🔨" },
  { id: "rates", label: "Rates", icon: "💲" },
  { id: "billing", label: "Billing", icon: "💳" },
  { id: "locations", label: "Locations", icon: "📍" },
  { id: "settings", label: "Settings", icon: "⚙️" },
  { id: "bland_config", label: "Bland.ai", icon: "🤖" },
  { id: "retell_config", label: "Retell AI", icon: "🎙️" },
  { id: "automation", label: "Automation", icon: "⚡" },
  { id: "quickbooks", label: "QuickBooks", icon: "📊" },
  { id: "import_export", label: "Import/Export", icon: "📥" },
  { id: "sms", label: "SMS", icon: "💬" },
  { id: "messages", label: "Messages", icon: "✉️" },
  { id: "motor_clubs", label: "Motor Clubs", icon: "🏍️" },
  { id: "calls", label: "Call History", icon: "📞" },
];

// Role presets
const ROLE_PRESETS: Record<string, string[]> = {
  owner: ALL_PAGES.map(p => p.id),
  super_admin: ALL_PAGES.map(p => p.id),
  admin: ALL_PAGES.filter(p => !["billing", "import_export", "quickbooks"].includes(p.id)).map(p => p.id),
  dispatcher: ["overview", "dispatch", "live_calls", "jobs", "calendar", "customers", "fleet", "team", "leads", "invoices", "impound", "calls", "messages"],
  driver: ["overview", "jobs", "earnings", "messages"],
};

export default function AdminVisibilityPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<VisibilitySettings>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings/visibility").then(r => r.json()).then(d => {
      if (d.settings) setSettings(d.settings);
    });
  }, []);

  const togglePage = (pageId: string) => {
    setSettings(prev => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const applyPreset = (role: string) => {
    const preset: VisibilitySettings = {};
    ALL_PAGES.forEach(p => { preset[p.id] = ROLE_PRESETS[role]?.includes(p.id) || false; });
    setSettings(preset);
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings/visibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const enabledCount = Object.values(settings).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-[800px]" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">🎛️ Admin Panel Visibility</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Control which pages and features are visible in the sidebar for all users</p>
      </div>

      {/* Quick presets */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
        <div className="text-[14px] font-semibold mb-3">Quick Presets</div>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(ROLE_PRESETS).map(role => (
            <button
              key={role}
              onClick={() => applyPreset(role)}
              className="px-3 py-1.5 border border-[#e5edf5] rounded text-[12px] font-medium capitalize hover:border-[#533afd] hover:text-[#533afd] transition-colors"
            >
              {role.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-[#e5edf5] rounded-lg p-3 text-center">
          <div className="text-[22px] font-light text-[#533afd]">{enabledCount}</div>
          <div className="text-[10px] text-[#64748d]">Enabled</div>
        </div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-3 text-center">
          <div className="text-[22px] font-light text-[#64748d]">{ALL_PAGES.length - enabledCount}</div>
          <div className="text-[10px] text-[#64748d]">Hidden</div>
        </div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-3 text-center">
          <div className="text-[22px] font-light text-[#061b31]">{ALL_PAGES.length}</div>
          <div className="text-[10px] text-[#64748d]">Total</div>
        </div>
      </div>

      {/* Page toggles */}
      <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
          <div className="text-[13px] font-semibold">Sidebar Pages</div>
          <div className="flex gap-2">
            <button onClick={() => { const all: VisibilitySettings = {}; ALL_PAGES.forEach(p => all[p.id] = true); setSettings(all); }} className="text-[11px] text-[#533afd] hover:underline">Enable All</button>
            <button onClick={() => { const none: VisibilitySettings = {}; ALL_PAGES.forEach(p => none[p.id] = false); setSettings(none); }} className="text-[11px] text-[#991b1b] hover:underline">Disable All</button>
          </div>
        </div>
        <div className="divide-y divide-[#e5edf5]">
          {ALL_PAGES.map(page => (
            <div key={page.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#f6f9fc] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-[16px]">{page.icon}</span>
                <div>
                  <div className="text-[13px] font-medium">{page.label}</div>
                  <div className="text-[11px] text-[#64748d]">/dashboard/{page.id.replace("_", "-")}</div>
                </div>
              </div>
              <button
                onClick={() => togglePage(page.id)}
                className={`w-10 h-5 rounded-full transition-colors ${settings[page.id] !== false ? "bg-[#533afd]" : "bg-[#e5edf5]"}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[page.id] !== false ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-[#533afd] text-white py-3 rounded text-[14px] font-medium hover:bg-[#4434d4] disabled:opacity-50"
      >
        {saving ? "Saving..." : saved ? "✅ Saved!" : "Save Visibility Settings"}
      </button>
    </div>
  );
}