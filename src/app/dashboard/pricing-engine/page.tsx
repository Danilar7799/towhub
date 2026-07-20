"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

/* ──────────────────────────────────── types ──────────────────────────────────── */

interface ServiceRate {
  id: string;
  label: string;
  icon: string;
  base: number;
  perMile: number;
  minCharge: number;
}

interface PricingRule {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  multiplier: number;
}

interface DemandTier {
  threshold: number;   // calls/hour
  multiplier: number;
}

interface DistanceTier {
  upTo: number;        // miles
  perMile: number;
}

interface WeatherCondition {
  id: string;
  label: string;
  icon: string;
  surcharge: number;   // percentage
  enabled: boolean;
}

interface RateSheet {
  id: string;
  name: string;
  icon: string;
  services: ServiceRate[];
  timeRules: PricingRule[];
  demandTiers: DemandTier[];
  distanceTiers: DistanceTier[];
  weatherConditions: WeatherCondition[];
  isDefault: boolean;
}

/* ──────────────────────────────── initial data ───────────────────────────────── */

const defaultServices: ServiceRate[] = [
  { id: "light", label: "Light Duty", icon: "🚛", base: 75, perMile: 3.5, minCharge: 75 },
  { id: "heavy", label: "Heavy Duty", icon: "🏗️", base: 250, perMile: 6.0, minCharge: 250 },
  { id: "flatbed", label: "Flatbed", icon: "🛏️", base: 125, perMile: 4.5, minCharge: 125 },
  { id: "motorcycle", label: "Motorcycle", icon: "🏍️", base: 55, perMile: 2.5, minCharge: 55 },
  { id: "roadside", label: "Roadside Assist", icon: "🔧", base: 65, perMile: 2.0, minCharge: 65 },
];

const defaultTimeRules: PricingRule[] = [
  { id: "afterhours", label: "After-Hours", description: "6 PM – 6 AM surcharge", enabled: true, multiplier: 1.5 },
  { id: "weekend", label: "Weekend", description: "Saturday & Sunday", enabled: true, multiplier: 1.25 },
  { id: "holiday", label: "Holiday", description: "Federal holidays & special events", enabled: true, multiplier: 2.0 },
];

const defaultDemandTiers: DemandTier[] = [
  { threshold: 10, multiplier: 1.2 },
  { threshold: 20, multiplier: 1.4 },
  { threshold: 30, multiplier: 1.6 },
  { threshold: 50, multiplier: 2.0 },
];

const defaultDistanceTiers: DistanceTier[] = [
  { upTo: 10, perMile: 0 },
  { upTo: 50, perMile: 3.5 },
  { upTo: 999, perMile: 2.5 },
];

const defaultWeather: WeatherCondition[] = [
  { id: "rain", label: "Rain", icon: "🌧️", surcharge: 10, enabled: true },
  { id: "snow", label: "Snow", icon: "❄️", surcharge: 25, enabled: true },
  { id: "ice", label: "Ice", icon: "🧊", surcharge: 50, enabled: true },
];

const createSheet = (id: string, name: string, icon: string, svcMul: number, isDefault: boolean): RateSheet => ({
  id,
  name,
  icon,
  isDefault,
  services: defaultServices.map(s => ({ ...s, base: Math.round(s.base * svcMul), minCharge: Math.round(s.minCharge * svcMul) })),
  timeRules: defaultTimeRules.map(r => ({ ...r })),
  demandTiers: [...defaultDemandTiers],
  distanceTiers: [...defaultDistanceTiers],
  weatherConditions: defaultWeather.map(w => ({ ...w })),
});

const initialSheets: RateSheet[] = [
  createSheet("standard", "Standard", "📋", 1, true),
  createSheet("premium", "Premium", "⭐", 1.3, false),
  createSheet("emergency", "Emergency", "🚨", 1.6, false),
];

/* ─────────────────────── market averages (for comparison chart) ───────────────── */

const marketAvg: Record<string, number> = {
  light: 85,
  heavy: 275,
  flatbed: 140,
  motorcycle: 60,
  roadside: 70,
};

/* ═══════════════════════════════════ PAGE ═══════════════════════════════════════ */

export default function PricingEnginePage() {
  const [sheets, setSheets] = useState<RateSheet[]>(initialSheets);
  const [activeSheetId, setActiveSheetId] = useState("standard");

  /* preview calculator state */
  const [previewService, setPreviewService] = useState("light");
  const [previewDistance, setPreviewDistance] = useState(25);
  const [previewHour, setPreviewHour] = useState(14);
  const [previewDay, setPreviewDay] = useState<"weekday" | "weekend" | "holiday">("weekday");
  const [previewWeather, setPreviewWeather] = useState<string>("none");
  const [previewDemand, setPreviewDemand] = useState(5);

  const activeSheet = useMemo(() => sheets.find(s => s.id === activeSheetId)!, [sheets, activeSheetId]);

  /* ─── helpers ─── */
  const updateSheet = (patch: Partial<RateSheet>) =>
    setSheets(prev => prev.map(s => s.id === activeSheetId ? { ...s, ...patch } : s));

  const updateService = (svcId: string, field: keyof ServiceRate, value: number) =>
    updateSheet({ services: activeSheet.services.map(s => s.id === svcId ? { ...s, [field]: value } : s) });

  const toggleTimeRule = (ruleId: string) =>
    updateSheet({ timeRules: activeSheet.timeRules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r) });

  const updateDemandTier = (idx: number, field: "threshold" | "multiplier", value: number) =>
    updateSheet({ demandTiers: activeSheet.demandTiers.map((t, i) => i === idx ? { ...t, [field]: value } : t) });

  const updateDistanceTier = (idx: number, value: number) =>
    updateSheet({ distanceTiers: activeSheet.distanceTiers.map((t, i) => i === idx ? { ...t, perMile: value } : t) });

  const toggleWeather = (wId: string) =>
    updateSheet({ weatherConditions: activeSheet.weatherConditions.map(w => w.id === wId ? { ...w, enabled: !w.enabled } : w) });

  const updateWeatherSurcharge = (wId: string, value: number) =>
    updateSheet({ weatherConditions: activeSheet.weatherConditions.map(w => w.id === wId ? { ...w, surcharge: value } : w) });

  /* ─── price calculation engine ─── */
  const calculatePrice = (sheet: RateSheet, svcId: string, distance: number, hour: number, day: string, weather: string, demand: number): number => {
    const svc = sheet.services.find(s => s.id === svcId);
    if (!svc) return 0;

    // base
    let price = svc.base;

    // distance
    let remaining = distance;
    for (const tier of sheet.distanceTiers) {
      const miles = Math.min(remaining, tier.upTo);
      price += miles * tier.perMile;
      remaining -= miles;
      if (remaining <= 0) break;
    }

    // time multipliers (stack highest)
    let timeMul = 1;
    const isAfterHours = hour >= 18 || hour < 6;
    for (const rule of sheet.timeRules) {
      if (!rule.enabled) continue;
      if (rule.id === "afterhours" && isAfterHours) timeMul = Math.max(timeMul, rule.multiplier);
      if (rule.id === "weekend" && day === "weekend") timeMul = Math.max(timeMul, rule.multiplier);
      if (rule.id === "holiday" && day === "holiday") timeMul = Math.max(timeMul, rule.multiplier);
    }
    price *= timeMul;

    // weather
    const w = sheet.weatherConditions.find(wc => wc.id === weather && wc.enabled);
    if (w) price *= (1 + w.surcharge / 100);

    // demand surge
    const tier = [...sheet.demandTiers].reverse().find(t => demand >= t.threshold);
    if (tier) price *= tier.multiplier;

    return Math.max(price, svc.minCharge);
  };

  const estimatedPrice = useMemo(
    () => calculatePrice(activeSheet, previewService, previewDistance, previewHour, previewDay, previewWeather, previewDemand),
    [activeSheet, previewService, previewDistance, previewHour, previewDay, previewWeather, previewDemand],
  );

  /* comparison chart data */
  const comparisonData = useMemo(() =>
    activeSheet.services.map(svc => ({
      name: svc.label,
      yours: calculatePrice(activeSheet, svc.id, 25, 14, "weekday", "none", 5),
      market: marketAvg[svc.id] ?? svc.base,
    })),
  [activeSheet]);

  /* ─── breakdown items for preview ─── */
  const breakdown = useMemo(() => {
    const svc = activeSheet.services.find(s => s.id === previewService)!;
    const isAfterHours = previewHour >= 18 || previewHour < 6;
    const items: { label: string; value: string }[] = [];

    items.push({ label: "Base rate", value: `$${svc.base.toFixed(2)}` });

    // distance calc
    let distCost = 0;
    let remaining = previewDistance;
    for (const tier of activeSheet.distanceTiers) {
      const miles = Math.min(remaining, tier.upTo);
      distCost += miles * tier.perMile;
      remaining -= miles;
      if (remaining <= 0) break;
    }
    if (distCost > 0) items.push({ label: `Distance (${previewDistance} mi)`, value: `+$${distCost.toFixed(2)}` });

    // time
    let timeMul = 1;
    let timeLabel = "Standard hours";
    for (const rule of activeSheet.timeRules) {
      if (!rule.enabled) continue;
      if (rule.id === "afterhours" && isAfterHours) { timeMul = Math.max(timeMul, rule.multiplier); timeLabel = "After-hours"; }
      if (rule.id === "weekend" && previewDay === "weekend") { timeMul = Math.max(timeMul, rule.multiplier); timeLabel = "Weekend"; }
      if (rule.id === "holiday" && previewDay === "holiday") { timeMul = Math.max(timeMul, rule.multiplier); timeLabel = "Holiday"; }
    }
    if (timeMul > 1) items.push({ label: timeLabel, value: `×${timeMul}` });

    // weather
    const w = activeSheet.weatherConditions.find(wc => wc.id === previewWeather && wc.enabled);
    if (w) items.push({ label: `${w.label} surcharge`, value: `+${w.surcharge}%` });

    // demand
    const tier = [...activeSheet.demandTiers].reverse().find(t => previewDemand >= t.threshold);
    if (tier) items.push({ label: "Demand surge", value: `×${tier.multiplier}` });

    items.push({ label: "Estimated total", value: `$${estimatedPrice.toFixed(2)}` });
    return items;
  }, [activeSheet, previewService, previewDistance, previewHour, previewDay, previewWeather, previewDemand, estimatedPrice]);

  /* ═══════════════════════════════ RENDER ════════════════════════════════════ */
  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px] text-[#061b31]">Dynamic Pricing Engine</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Configure pricing rules, surcharges, and multipliers</p>
        </div>
        <button
          onClick={() => alert("Rate sheets saved!")}
          className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:opacity-90 transition"
        >
          Save All Sheets
        </button>
      </div>

      {/* ── rate sheet tabs ── */}
      <div className="flex gap-2">
        {sheets.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSheetId(s.id)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition border ${
              s.id === activeSheetId
                ? "bg-[#533afd] text-white border-[#533afd]"
                : "bg-white text-[#061b31] border-[#e5edf5] hover:border-[#533afd]"
            }`}
          >
            {s.icon} {s.name}
          </button>
        ))}
      </div>

      {/* ── base rates ── */}
      <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center justify-between">
          <div>
            <span className="text-[15px] font-medium text-[#061b31]">Base Rates</span>
            <span className="ml-2 text-[10px] bg-[#f6f9fc] text-[#64748d] px-2 py-0.5 rounded font-medium">
              {activeSheet.name}
            </span>
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-[#f6f9fc]">
            <tr>
              {["Service", "Base Rate ($)", "Per Mile ($)", "Min Charge ($)"].map(h => (
                <th key={h} className="text-left px-5 py-2 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5edf5]">
            {activeSheet.services.map(svc => (
              <tr key={svc.id} className="hover:bg-[#f6f9fc]/50 transition">
                <td className="px-5 py-3 text-[13px] font-medium text-[#061b31]">{svc.icon} {svc.label}</td>
                <td className="px-5 py-3">
                  <input type="number" value={svc.base} onChange={e => updateService(svc.id, "base", +e.target.value)}
                    className="w-24 border border-[#e5edf5] rounded px-2 py-1.5 text-[13px] text-[#061b31] focus:outline-none focus:border-[#533afd]" />
                </td>
                <td className="px-5 py-3">
                  <input type="number" step="0.5" value={svc.perMile} onChange={e => updateService(svc.id, "perMile", +e.target.value)}
                    className="w-24 border border-[#e5edf5] rounded px-2 py-1.5 text-[13px] text-[#061b31] focus:outline-none focus:border-[#533afd]" />
                </td>
                <td className="px-5 py-3">
                  <input type="number" value={svc.minCharge} onChange={e => updateService(svc.id, "minCharge", +e.target.value)}
                    className="w-24 border border-[#e5edf5] rounded px-2 py-1.5 text-[13px] text-[#061b31] focus:outline-none focus:border-[#533afd]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── time-based rules & weather surcharge side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* time rules */}
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e5edf5]">
            <span className="text-[15px] font-medium text-[#061b31]">⏰ Time-Based Multipliers</span>
          </div>
          <div className="divide-y divide-[#e5edf5]">
            {activeSheet.timeRules.map(rule => (
              <div key={rule.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-[#061b31]">{rule.label}</div>
                  <div className="text-[12px] text-[#64748d]">{rule.description}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold text-[#061b31]">{rule.multiplier}×</span>
                  <button
                    onClick={() => toggleTimeRule(rule.id)}
                    className={`relative w-10 h-[22px] rounded-full transition-colors ${
                      rule.enabled ? "bg-[#533afd]" : "bg-[#e5edf5]"
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
                      rule.enabled ? "translate-x-[18px]" : ""
                    }`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* weather */}
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e5edf5]">
            <span className="text-[15px] font-medium text-[#061b31]">🌦️ Weather Surcharges</span>
          </div>
          <div className="divide-y divide-[#e5edf5]">
            {activeSheet.weatherConditions.map(w => (
              <div key={w.id} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[18px]">{w.icon}</span>
                  <span className="text-[13px] font-medium text-[#061b31]">{w.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] text-[#64748d]">+</span>
                    <input
                      type="number"
                      value={w.surcharge}
                      onChange={e => updateWeatherSurcharge(w.id, +e.target.value)}
                      className="w-14 border border-[#e5edf5] rounded px-2 py-1.5 text-[13px] text-[#061b31] text-center focus:outline-none focus:border-[#533afd]"
                    />
                    <span className="text-[12px] text-[#64748d]">%</span>
                  </div>
                  <button
                    onClick={() => toggleWeather(w.id)}
                    className={`relative w-10 h-[22px] rounded-full transition-colors ${
                      w.enabled ? "bg-[#533afd]" : "bg-[#e5edf5]"
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
                      w.enabled ? "translate-x-[18px]" : ""
                    }`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── demand surge ── */}
      <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e5edf5]">
          <span className="text-[15px] font-medium text-[#061b31]">📈 Demand Surge Pricing</span>
          <p className="text-[12px] text-[#64748d] mt-0.5">Auto-increase rates when call volume exceeds thresholds</p>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-4 gap-4">
            {activeSheet.demandTiers.map((tier, idx) => (
              <div key={idx} className="bg-[#f6f9fc] rounded-lg p-3 text-center">
                <div className="text-[11px] text-[#64748d] mb-2">Calls/hr ≥</div>
                <input
                  type="number"
                  value={tier.threshold}
                  onChange={e => updateDemandTier(idx, "threshold", +e.target.value)}
                  className="w-full border border-[#e5edf5] rounded px-2 py-1.5 text-[14px] text-center font-semibold text-[#061b31] focus:outline-none focus:border-[#533afd] mb-2"
                />
                <div className="text-[11px] text-[#64748d] mb-1">Multiplier</div>
                <input
                  type="number"
                  step="0.1"
                  value={tier.multiplier}
                  onChange={e => updateDemandTier(idx, "multiplier", +e.target.value)}
                  className="w-full border border-[#e5edf5] rounded px-2 py-1.5 text-[14px] text-center font-semibold text-[#533afd] focus:outline-none focus:border-[#533afd]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── distance tiers ── */}
      <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#e5edf5]">
          <span className="text-[15px] font-medium text-[#061b31]">🗺️ Distance Tiers</span>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-4">
            {activeSheet.distanceTiers.map((tier, idx) => (
              <div key={idx} className="flex-1 bg-[#f6f9fc] rounded-lg p-3 text-center">
                <div className="text-[12px] text-[#64748d] mb-1">
                  {idx === 0 ? `First ${tier.upTo} mi` : idx === 1 ? `11 – ${tier.upTo} mi` : `${activeSheet.distanceTiers[idx - 1].upTo + 1}+ mi`}
                </div>
                {idx === 0 ? (
                  <div className="text-[16px] font-semibold text-[#166534]">Included</div>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[12px] text-[#64748d]">$</span>
                    <input
                      type="number"
                      step="0.5"
                      value={tier.perMile}
                      onChange={e => updateDistanceTier(idx, +e.target.value)}
                      className="w-16 border border-[#e5edf5] rounded px-2 py-1.5 text-[14px] text-center font-semibold text-[#061b31] focus:outline-none focus:border-[#533afd]"
                    />
                    <span className="text-[12px] text-[#64748d]">/mi</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── preview calculator & rate comparison ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* preview calculator */}
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e5edf5]">
            <span className="text-[15px] font-medium text-[#061b31]">🧮 Price Preview Calculator</span>
            <p className="text-[12px] text-[#64748d] mt-0.5">Input conditions to estimate the final price</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider">Service</label>
                <select
                  value={previewService}
                  onChange={e => setPreviewService(e.target.value)}
                  className="w-full mt-1 border border-[#e5edf5] rounded px-3 py-2 text-[13px] text-[#061b31] focus:outline-none focus:border-[#533afd] bg-white"
                >
                  {activeSheet.services.map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider">Distance (mi)</label>
                <input
                  type="number"
                  min={1}
                  value={previewDistance}
                  onChange={e => setPreviewDistance(+e.target.value)}
                  className="w-full mt-1 border border-[#e5edf5] rounded px-3 py-2 text-[13px] text-[#061b31] focus:outline-none focus:border-[#533afd]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider">Hour (0–23)</label>
                <input
                  type="range"
                  min={0}
                  max={23}
                  value={previewHour}
                  onChange={e => setPreviewHour(+e.target.value)}
                  className="w-full mt-2 accent-[#533afd]"
                />
                <div className="text-[12px] text-[#061b31] text-center mt-1">
                  {previewHour.toString().padStart(2, "0")}:00
                  {previewHour >= 18 || previewHour < 6 ? " 🌙" : " ☀️"}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider">Day Type</label>
                <div className="flex gap-1.5 mt-1.5">
                  {(["weekday", "weekend", "holiday"] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setPreviewDay(d)}
                      className={`flex-1 py-1.5 rounded text-[12px] font-medium transition border ${
                        previewDay === d
                          ? "bg-[#533afd] text-white border-[#533afd]"
                          : "bg-white text-[#061b31] border-[#e5edf5]"
                      }`}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider">Weather</label>
                <select
                  value={previewWeather}
                  onChange={e => setPreviewWeather(e.target.value)}
                  className="w-full mt-1 border border-[#e5edf5] rounded px-3 py-2 text-[13px] text-[#061b31] focus:outline-none focus:border-[#533afd] bg-white"
                >
                  <option value="none">☀️ Clear</option>
                  {activeSheet.weatherConditions.filter(w => w.enabled).map(w => (
                    <option key={w.id} value={w.id}>{w.icon} {w.label} (+{w.surcharge}%)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider">Demand (calls/hr)</label>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={previewDemand}
                  onChange={e => setPreviewDemand(+e.target.value)}
                  className="w-full mt-2 accent-[#533afd]"
                />
                <div className="text-[12px] text-[#061b31] text-center mt-1">{previewDemand} calls/hr</div>
              </div>
            </div>

            {/* breakdown */}
            <div className="border-t border-[#e5edf5] pt-4">
              <div className="space-y-2">
                {breakdown.map((item, i) => (
                  <div key={i} className={`flex items-center justify-between ${i === breakdown.length - 1 ? "pt-2 border-t border-[#e5edf5]" : ""}`}>
                    <span className={`text-[13px] ${i === breakdown.length - 1 ? "font-semibold text-[#061b31]" : "text-[#64748d]"}`}>
                      {item.label}
                    </span>
                    <span className={`text-[14px] ${
                      i === breakdown.length - 1
                        ? "font-bold text-[#533afd] text-[18px]"
                        : item.value.startsWith("+") || item.value.startsWith("×")
                          ? "font-medium text-[#061b31]"
                          : "text-[#061b31]"
                    }`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* rate comparison chart */}
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e5edf5]">
            <span className="text-[15px] font-medium text-[#061b31]">📊 Your Rate vs. Market Average</span>
            <p className="text-[12px] text-[#64748d] mt-0.5">Standard conditions (25 mi, weekday, no weather)</p>
          </div>
          <div className="p-5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5edf5" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748d" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748d" }} tickFormatter={v => `$${v}`} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((value: any) => [`$${Number(value).toFixed(2)}`, ""]) as any}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5edf5", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="yours" name="Your Rate" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((_, idx) => (
                    <Cell key={idx} fill="#533afd" />
                  ))}
                </Bar>
                <Bar dataKey="market" name="Market Avg" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((_, idx) => (
                    <Cell key={idx} fill="#c4b5fd" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
