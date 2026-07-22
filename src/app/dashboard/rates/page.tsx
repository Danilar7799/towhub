"use client";

import { useState, useEffect } from "react";

interface RateSheet {
  id: string;
  name: string;
  isActive: boolean;
  rates: { service: string; label: string; base: number; perMile: number; minCharge: number }[];
  afterHoursMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
}

const SERVICE_TYPES = [
  { value: "light_duty", label: "Light Duty Tow", base: 75, perMile: 3.5 },
  { value: "heavy_duty", label: "Heavy Duty Tow", base: 150, perMile: 6.0 },
  { value: "flatbed", label: "Flatbed Tow", base: 95, perMile: 4.25 },
  { value: "motorcycle", label: "Motorcycle Tow", base: 60, perMile: 2.75 },
  { value: "roadside", label: "Roadside Assistance", base: 50, perMile: 2.0 },
];

const TAX_RATE = 0.0875;

export default function RatesPage() {
  // Calculator state
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0].value);
  const [pickupAddress, setPickupAddress] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [miles, setMiles] = useState<number>(0);
  const [afterHours, setAfterHours] = useState(false);
  const [weekend, setWeekend] = useState(false);
  const [holiday, setHoliday] = useState(false);
  const [copied, setCopied] = useState(false);

  // Rate sheets state
  const [sheets, setSheets] = useState<RateSheet[]>([]);

  const load = () => fetch("/api/rates").then((r) => r.json()).then((d) => setSheets(d.rateSheets || []));
  useEffect(() => { load(); }, []);

  const createDefault = async () => {
    await fetch("/api/rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Standard Rates" }) });
    load();
  };

  // Calculator computations
  const selectedService = SERVICE_TYPES.find((s) => s.value === serviceType)!;
  const baseRate = selectedService.base;
  const mileageCharge = miles * selectedService.perMile;

  let multiplier = 1;
  let multiplierLabel = "Standard";
  if (holiday) { multiplier = 2; multiplierLabel = "Holiday (2×)"; }
  else if (afterHours) { multiplier = 1.5; multiplierLabel = "After Hours (1.5×)"; }
  else if (weekend) { multiplier = 1.25; multiplierLabel = "Weekend (1.25×)"; }

  const subtotal = (baseRate + mileageCharge) * multiplier;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const formatUsd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  const quoteSummary = [
    `Quick Quote — ${selectedService.label}`,
    pickupAddress ? `Pickup: ${pickupAddress}` : null,
    destAddress ? `Destination: ${destAddress}` : null,
    `Estimated Miles: ${miles}`,
    `Base Rate: ${formatUsd(baseRate)}`,
    `Mileage Charge: ${formatUsd(mileageCharge)} (${miles} mi × $${selectedService.perMile}/mi)`,
    `Multiplier: ${multiplierLabel}`,
    `Subtotal: ${formatUsd(subtotal)}`,
    `Tax (8.75%): ${formatUsd(tax)}`,
    `Total: ${formatUsd(total)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(quoteSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateJob = () => {
    const params = new URLSearchParams({
      service: serviceType,
      pickup: pickupAddress,
      destination: destAddress,
      miles: String(miles),
      total: total.toFixed(2),
    });
    window.location.href = `/dashboard/jobs/new?${params.toString()}`;
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* ── Quick Quote Calculator ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Quick Quote Calculator</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Estimate a tow or roadside job in seconds</p>
        </div>

        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          {/* Input section */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Service Type */}
            <div className="md:col-span-2">
              <label className="block text-[12px] font-medium text-[#64748d] uppercase tracking-wider mb-1.5">Service Type</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full border border-[#e5edf5] rounded px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 transition-colors"
              >
                {SERVICE_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Pickup Address */}
            <div>
              <label className="block text-[12px] font-medium text-[#64748d] uppercase tracking-wider mb-1.5">Pickup Address</label>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                className="w-full border border-[#e5edf5] rounded px-3 py-2 text-[13px] placeholder:text-[#b0bdd0] focus:outline-none focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 transition-colors"
              />
            </div>

            {/* Destination Address */}
            <div>
              <label className="block text-[12px] font-medium text-[#64748d] uppercase tracking-wider mb-1.5">Destination Address</label>
              <input
                type="text"
                value={destAddress}
                onChange={(e) => setDestAddress(e.target.value)}
                placeholder="456 Oak Ave, City, State"
                className="w-full border border-[#e5edf5] rounded px-3 py-2 text-[13px] placeholder:text-[#b0bdd0] focus:outline-none focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 transition-colors"
              />
            </div>

            {/* Estimated Miles */}
            <div>
              <label className="block text-[12px] font-medium text-[#64748d] uppercase tracking-wider mb-1.5">Estimated Miles</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={miles || ""}
                onChange={(e) => setMiles(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full border border-[#e5edf5] rounded px-3 py-2 text-[13px] placeholder:text-[#b0bdd0] focus:outline-none focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 transition-colors"
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-2 justify-end">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={afterHours}
                  onChange={(e) => setAfterHours(e.target.checked)}
                  className="w-4 h-4 rounded border-[#e5edf5] accent-[#533afd]"
                />
                <span className="text-[#334155]">After Hours</span>
                <span className="text-[11px] text-[#94a3b8]">(1.5×)</span>
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={weekend}
                  onChange={(e) => setWeekend(e.target.checked)}
                  className="w-4 h-4 rounded border-[#e5edf5] accent-[#533afd]"
                />
                <span className="text-[#334155]">Weekend</span>
                <span className="text-[11px] text-[#94a3b8]">(1.25×)</span>
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={holiday}
                  onChange={(e) => setHoliday(e.target.checked)}
                  className="w-4 h-4 rounded border-[#e5edf5] accent-[#533afd]"
                />
                <span className="text-[#334155]">Holiday</span>
                <span className="text-[11px] text-[#94a3b8]">(2×)</span>
              </label>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#e5edf5]" />

          {/* Price Breakdown */}
          <div className="p-5">
            <h3 className="text-[13px] font-semibold text-[#334155] uppercase tracking-wider mb-3">Price Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748d]">Base Rate</span>
                <span className="font-medium">{formatUsd(baseRate)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748d]">Mileage ({miles} mi × ${selectedService.perMile}/mi)</span>
                <span className="font-medium">{formatUsd(mileageCharge)}</span>
              </div>
              {multiplier > 1 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#64748d]">Surcharge — {multiplierLabel}</span>
                  <span className="font-medium text-[#b45309]">+{formatUsd(subtotal / multiplier * (multiplier - 1))}</span>
                </div>
              )}
              <div className="border-t border-[#e5edf5] my-2" />
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748d]">Subtotal</span>
                <span className="font-medium">{formatUsd(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748d]">Tax (8.75%)</span>
                <span className="font-medium">{formatUsd(tax)}</span>
              </div>
              <div className="border-t border-[#0f1729] my-2" />
              <div className="flex justify-between text-[16px] font-semibold">
                <span>Total</span>
                <span className="text-[#533afd]">{formatUsd(total)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-[#e5edf5] px-5 py-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCreateJob}
              className="bg-[#533afd] text-white px-5 py-2 rounded text-[13px] font-medium hover:bg-[#4329e0] active:scale-[0.98] transition-all"
            >
              Create Job with This Quote
            </button>
            <button
              onClick={handleCopy}
              className="border border-[#e5edf5] text-[#334155] px-5 py-2 rounded text-[13px] font-medium hover:bg-[#f6f9fc] active:scale-[0.98] transition-all"
            >
              {copied ? "✓ Copied!" : "Copy Quote"}
            </button>
            <span className="ml-auto text-[11px] text-[#94a3b8]">Tax rate: 8.75% &middot; Prices are estimates</span>
          </div>
        </div>
      </div>

      {/* ── Rate Sheets (existing) ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Rate Sheets</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Configure pricing for your services</p>
        </div>
        <button onClick={createDefault} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">+ Create Rate Sheet</button>
      </div>

      {sheets.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">💲</div>
          <div className="text-[14px] text-[#64748d] mb-4">No rate sheets configured.</div>
          <button onClick={createDefault} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">Create Default Rates</button>
        </div>
      ) : (
        sheets.map((sheet) => (
          <div key={sheet.id} className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center justify-between">
              <div>
                <span className="text-[15px] font-medium">{sheet.name}</span>
                {sheet.isActive && (
                  <span className="ml-2 text-[10px] bg-[#dcfce7] text-[#166534] px-2 py-0.5 rounded font-medium">Active</span>
                )}
              </div>
              <div className="text-[12px] text-[#64748d]">
                After hours: {sheet.afterHoursMultiplier}x &bull; Weekend: {sheet.weekendMultiplier}x &bull; Holiday: {sheet.holidayMultiplier}x
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-[#f6f9fc]">
                <tr>
                  {["Service", "Base Rate", "Per Mile", "Minimum"].map((h) => (
                    <th key={h} className="text-left px-5 py-2 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5edf5]">
                {(sheet.rates || []).map((r, i) => (
                  <tr key={i}>
                    <td className="px-5 py-2.5 text-[13px] font-medium">{r.label}</td>
                    <td className="px-5 py-2.5 text-[14px]">${r.base}</td>
                    <td className="px-5 py-2.5 text-[14px]">{r.perMile > 0 ? `$${r.perMile}/mi` : "—"}</td>
                    <td className="px-5 py-2.5 text-[14px]">${r.minCharge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Multiplier editing */}
            <div className="px-5 py-4 border-t border-[#e5edf5] bg-[#f6f9fc]">
              <div className="text-[12px] font-medium text-[#273951] mb-3">Time-based Multipliers</div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] text-[#64748d] mb-1">🌅 Evening (6PM-10PM)</label>
                  <div className="text-[14px] font-medium">1.25x</div>
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748d] mb-1">🌙 Night (10PM-6AM)</label>
                  <div className="text-[14px] font-medium">{sheet.afterHoursMultiplier}x</div>
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748d] mb-1">📅 Weekend</label>
                  <div className="text-[14px] font-medium">{sheet.weekendMultiplier}x</div>
                </div>
                <div>
                  <label className="block text-[11px] text-[#64748d] mb-1">🎄 Holiday</label>
                  <div className="text-[14px] font-medium">{sheet.holidayMultiplier}x</div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[#64748d]">
                Multipliers are applied automatically based on time of call. Edit in Rate Sheet settings.
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
