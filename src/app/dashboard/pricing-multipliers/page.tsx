"use client";

import { useState, useEffect } from "react";

interface PricingRule {
  id: string;
  name: string;
  type: "time_range" | "day_of_week" | "date_range" | "holiday";
  multiplier: number;
  enabled: boolean;
  // Time range
  startTime?: string;
  endTime?: string;
  // Days of week (0=Sun, 6=Sat)
  days?: number[];
  // Date range (for holidays)
  startDate?: string;
  endDate?: string;
}

const DEFAULT_RULES: PricingRule[] = [
  { id: "after_hours", name: "After Hours (6PM - 6AM)", type: "time_range", startTime: "18:00", endTime: "06:00", multiplier: 1.5, enabled: true },
  { id: "weekend", name: "Weekend (Sat-Sun)", type: "day_of_week", days: [0, 6], multiplier: 1.25, enabled: true },
  { id: "holiday", name: "Holiday Premium", type: "date_range", startDate: "", endDate: "", multiplier: 2.0, enabled: false },
  { id: "peak_morning", name: "Morning Rush (7-9 AM)", type: "time_range", startTime: "07:00", endTime: "09:00", multiplier: 1.15, enabled: false },
  { id: "peak_evening", name: "Evening Rush (5-7 PM)", type: "time_range", startTime: "17:00", endTime: "19:00", multiplier: 1.15, enabled: false },
  { id: "late_night", name: "Late Night (10PM - 2AM)", type: "time_range", startTime: "22:00", endTime: "02:00", multiplier: 1.75, enabled: false },
  { id: "severe_weather", name: "Severe Weather Surge", type: "date_range", startDate: "", endDate: "", multiplier: 1.5, enabled: false },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function PricingMultipliersPage() {
  const [rules, setRules] = useState<PricingRule[]>(DEFAULT_RULES);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customRule, setCustomRule] = useState({ name: "", type: "time_range" as const, startTime: "00:00", endTime: "23:59", multiplier: 1.5, days: [] as number[] });

  useEffect(() => {
    // Load saved rules from org settings
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      const savedRules = data.org?.settings?.pricingRules;
      if (savedRules && Array.isArray(savedRules)) setRules(savedRules);
    }).catch(() => {});
  }, []);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const updateMultiplier = (id: string, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, multiplier: num } : r));
    }
  };

  const updateTime = (id: string, field: "startTime" | "endTime", value: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleDay = (id: string, day: number) => {
    setRules(prev => prev.map(r => {
      if (r.id !== id) return r;
      const days = r.days || [];
      return { ...r, days: days.includes(day) ? days.filter(d => d !== day) : [...days, day] };
    }));
  };

  const addCustomRule = () => {
    if (!customRule.name) return;
    const newRule: PricingRule = {
      id: `custom_${Date.now()}`,
      name: customRule.name,
      type: customRule.type,
      startTime: customRule.startTime,
      endTime: customRule.endTime,
      multiplier: customRule.multiplier,
      days: customRule.days,
      enabled: true,
    };
    setRules(prev => [...prev, newRule]);
    setCustomRule({ name: "", type: "time_range", startTime: "00:00", endTime: "23:59", multiplier: 1.5, days: [] });
    setEditing(null);
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { pricingRules: rules } }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } finally { setSaving(false); }
  };

  // Preview: calculate current effective multiplier
  const getEffectiveMultiplier = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const timeStr = `${String(hour).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    let maxMult = 1;

    for (const rule of rules) {
      if (!rule.enabled) continue;
      let applies = false;

      if (rule.type === "time_range" && rule.startTime && rule.endTime) {
        if (rule.startTime <= rule.endTime) {
          applies = timeStr >= rule.startTime && timeStr <= rule.endTime;
        } else {
          applies = timeStr >= rule.startTime || timeStr <= rule.endTime;
        }
      }
      if (rule.type === "day_of_week" && rule.days) {
        applies = rule.days.includes(day);
      }

      if (applies && rule.multiplier > maxMult) maxMult = rule.multiplier;
    }
    return maxMult;
  };

  const effectiveMult = getEffectiveMultiplier();

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Pricing Multipliers</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Configure time-based pricing rules for your company</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-[12px] text-[#15be53] font-medium">✓ Saved</span>}
          <button onClick={save} disabled={saving}
            className="bg-[#533afd] text-white px-5 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Current effective multiplier */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider">Current Effective Multiplier</div>
            <div className="text-[32px] font-light tracking-[-1px] mt-1" style={{ color: effectiveMult > 1 ? "#f97316" : "#15be53" }}>
              {effectiveMult.toFixed(2)}x
            </div>
            <div className="text-[12px] text-[#94a3b8] mt-1">
              {effectiveMult === 1 ? "Standard rate — no surcharge" : `+${Math.round((effectiveMult - 1) * 100)}% surcharge active now`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-[#94a3b8]">Example: $100 base rate</div>
            <div className="text-[18px] font-medium">${(100 * effectiveMult).toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        {rules.map(rule => (
          <div key={rule.id} className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
            <div className="p-4 flex items-center gap-4">
              {/* Toggle */}
              <button onClick={() => toggleRule(rule.id)}
                className="relative w-10 h-5 rounded-full transition-colors shrink-0"
                style={{ backgroundColor: rule.enabled ? "#15be53" : "#e5edf5" }}>
                <div className="absolute w-4 h-4 bg-white rounded-full shadow-sm transition-transform"
                  style={{ transform: rule.enabled ? "translateX(22px)" : "translateX(2px)", top: "2px" }} />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-[#061b31]">{rule.name}</div>
                <div className="text-[11px] text-[#94a3b8] mt-0.5">
                  {rule.type === "time_range" && `${rule.startTime} — ${rule.endTime}`}
                  {rule.type === "day_of_week" && (rule.days || []).map(d => DAY_NAMES[d]).join(", ")}
                  {rule.type === "date_range" && (rule.startDate ? `${rule.startDate} — ${rule.endDate}` : "Set dates")}
                </div>
              </div>

              {/* Multiplier */}
              <div className="flex items-center gap-2">
                <input type="number" step="0.05" min="1" max="5" value={rule.multiplier}
                  onChange={e => updateMultiplier(rule.id, e.target.value)}
                  className="w-16 px-2 py-1 border border-[#e5edf5] rounded text-[14px] text-center font-medium outline-none focus:border-[#533afd]" />
                <span className="text-[13px] text-[#64748d]">x</span>
              </div>

              {/* Edit / Delete */}
              <button onClick={() => setEditing(editing === rule.id ? null : rule.id)}
                className="text-[#64748d] hover:text-[#061b31] p-1.5">✏️</button>
              {!["after_hours", "weekend"].includes(rule.id) && (
                <button onClick={() => deleteRule(rule.id)}
                  className="text-[#64748d] hover:text-[#dc2626] p-1.5">🗑️</button>
              )}
            </div>

            {/* Edit panel */}
            {editing === rule.id && (
              <div className="px-4 pb-4 pt-0 border-t border-[#f6f9fc]">
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {rule.type === "time_range" && (
                    <>
                      <div>
                        <label className="block text-[11px] font-medium text-[#64748d] mb-1">Start Time</label>
                        <input type="time" value={rule.startTime || ""} onChange={e => updateTime(rule.id, "startTime", e.target.value)}
                          className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#64748d] mb-1">End Time</label>
                        <input type="time" value={rule.endTime || ""} onChange={e => updateTime(rule.id, "endTime", e.target.value)}
                          className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" />
                      </div>
                    </>
                  )}
                  {rule.type === "day_of_week" && (
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium text-[#64748d] mb-1">Days</label>
                      <div className="flex gap-2">
                        {DAY_NAMES.map((d, i) => (
                          <button key={i} onClick={() => toggleDay(rule.id, i)}
                            className={`w-10 h-10 rounded text-[12px] font-medium border ${(rule.days || []).includes(i) ? "bg-[#533afd] text-white border-[#533afd]" : "bg-white text-[#64748d] border-[#e5edf5] hover:border-[#b9b9f9]"}`}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {rule.type === "date_range" && (
                    <>
                      <div>
                        <label className="block text-[11px] font-medium text-[#64748d] mb-1">Start Date</label>
                        <input type="date" value={rule.startDate || ""} onChange={e => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, startDate: e.target.value } : r))}
                          className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[#64748d] mb-1">End Date</label>
                        <input type="date" value={rule.endDate || ""} onChange={e => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, endDate: e.target.value } : r))}
                          className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-[11px] font-medium text-[#64748d] mb-1">Multiplier</label>
                    <input type="number" step="0.05" min="1" max="5" value={rule.multiplier}
                      onChange={e => updateMultiplier(rule.id, e.target.value)}
                      className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add custom rule */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-4">
        <div className="text-[13px] font-semibold mb-3">+ Add Custom Rule</div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#64748d] mb-1">Name</label>
            <input value={customRule.name} onChange={e => setCustomRule(c => ({ ...c, name: e.target.value }))}
              placeholder="e.g. Christmas Week" className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#64748d] mb-1">Type</label>
            <select value={customRule.type} onChange={e => setCustomRule(c => ({ ...c, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none bg-white">
              <option value="time_range">Time Range</option>
              <option value="day_of_week">Day of Week</option>
              <option value="date_range">Date Range</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#64748d] mb-1">Multiplier</label>
            <input type="number" step="0.05" min="1" max="5" value={customRule.multiplier}
              onChange={e => setCustomRule(c => ({ ...c, multiplier: parseFloat(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]" />
          </div>
          <div className="flex items-end">
            <button onClick={addCustomRule} disabled={!customRule.name}
              className="w-full py-2 bg-[#533afd] text-white rounded text-[13px] font-medium hover:bg-[#4434d4] disabled:opacity-50">
              Add Rule
            </button>
          </div>
        </div>
      </div>

      {/* Quick presets */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-4">
        <div className="text-[13px] font-semibold mb-3">Quick Holiday Presets</div>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "Christmas Week", start: "12-20", end: "12-27", mult: 2.0 },
            { name: "New Year", start: "12-30", end: "01-02", mult: 2.0 },
            { name: "July 4th", start: "07-03", end: "07-05", mult: 1.75 },
            { name: "Thanksgiving", start: "11-24", end: "11-28", mult: 1.75 },
            { name: "Labor Day", start: "09-01", end: "09-03", mult: 1.5 },
            { name: "Memorial Day", start: "05-25", end: "05-28", mult: 1.5 },
          ].map(preset => (
            <button key={preset.name} onClick={() => {
              const newRule: PricingRule = {
                id: `holiday_${Date.now()}`,
                name: preset.name,
                type: "date_range",
                startDate: preset.start,
                endDate: preset.end,
                multiplier: preset.mult,
                enabled: true,
              };
              setRules(prev => [...prev, newRule]);
            }}
              className="px-3 py-1.5 border border-[#e5edf5] rounded text-[12px] text-[#64748d] hover:bg-[#f6f9fc] hover:border-[#b9b9f9] transition-colors">
              {preset.name} ({preset.mult}x)
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
