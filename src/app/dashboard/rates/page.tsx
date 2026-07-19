"use client";

import { useState, useEffect } from "react";

interface RateSheet { id: string; name: string; isActive: boolean; rates: { service: string; label: string; base: number; perMile: number; minCharge: number }[]; afterHoursMultiplier: number; weekendMultiplier: number; holidayMultiplier: number; }

export default function RatesPage() {
  const [sheets, setSheets] = useState<RateSheet[]>([]);

  const load = () => fetch("/api/rates").then(r => r.json()).then(d => setSheets(d.rateSheets || []));
  useEffect(() => { load(); }, []);

  const createDefault = async () => {
    await fetch("/api/rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Standard Rates" }) });
    load();
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
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
        sheets.map(sheet => (
          <div key={sheet.id} className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center justify-between">
              <div>
                <span className="text-[15px] font-medium">{sheet.name}</span>
                {sheet.isActive && <span className="ml-2 text-[10px] bg-[#dcfce7] text-[#166534] px-2 py-0.5 rounded font-medium">Active</span>}
              </div>
              <div className="text-[12px] text-[#64748d]">
                After hours: {sheet.afterHoursMultiplier}x • Weekend: {sheet.weekendMultiplier}x • Holiday: {sheet.holidayMultiplier}x
              </div>
            </div>
            <table className="w-full">
              <thead className="bg-[#f6f9fc]">
                <tr>{["Service", "Base Rate", "Per Mile", "Minimum"].map(h => <th key={h} className="text-left px-5 py-2 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>)}</tr>
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
          </div>
        ))
      )}
    </div>
  );
}
