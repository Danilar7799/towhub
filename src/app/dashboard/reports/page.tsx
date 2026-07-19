"use client";

import { useState, useEffect } from "react";

interface ReportData {
  overview: {
    totalJobs: number; completedJobs: number; activeJobs: number;
    totalRevenue: number; monthRevenue: number; weekRevenue: number;
    totalExpenses: number; netProfit: number;
    totalVehicles: number; activeDrivers: number; totalCustomers: number;
    pendingLeads: number; leadConversion: number;
    storedVehicles: number; unpaidInvoices: number;
  };
  driverPerformance: { id: string; name: string; jobs: number; revenue: number }[];
  sourceRevenue: Record<string, number>;
  dailyRevenue: { date: string; revenue: number; jobs: number }[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => { fetch("/api/reports").then(r => r.json()).then(setData); }, []);

  if (!data) return <div className="flex items-center justify-center p-12"><div className="w-6 h-6 border-2 border-[#533afd] border-t-transparent rounded-full animate-spin" /></div>;

  const { overview: o, driverPerformance, sourceRevenue, dailyRevenue } = data;
  const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);

  return (
    <div className="space-y-6" style={{ fontFeatureSettings: "'ss01'" }}>
      <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Reports & Analytics</h2>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${o.totalRevenue.toFixed(0)}`, color: "#061b31" },
          { label: "Month Revenue", value: `$${o.monthRevenue.toFixed(0)}`, color: "#533afd" },
          { label: "Net Profit", value: `$${o.netProfit.toFixed(0)}`, color: o.netProfit >= 0 ? "#15be53" : "#dc2626" },
          { label: "Completed Jobs", value: o.completedJobs, color: "#061b31" },
          { label: "Active Jobs", value: o.activeJobs, color: "#533afd" },
          { label: "Total Customers", value: o.totalCustomers, color: "#061b31" },
          { label: "Lead Conversion", value: `${o.leadConversion}%`, color: "#15be53" },
          { label: "Pending Leads", value: o.pendingLeads, color: "#ea2261" },
          { label: "Total Vehicles", value: o.totalVehicles, color: "#061b31" },
          { label: "Active Drivers", value: o.activeDrivers, color: "#061b31" },
          { label: "Stored Vehicles", value: o.storedVehicles, color: "#f59e0b" },
          { label: "Unpaid Invoices", value: `$${o.unpaidInvoices.toFixed(0)}`, color: "#ea2261" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-[24px] font-light tracking-[-0.5px]" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium mb-4">Revenue (Last 7 Days)</div>
        <div className="flex items-end gap-3 h-[200px]">
          {dailyRevenue.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="text-[11px] text-[#64748d] font-medium">${d.revenue.toFixed(0)}</div>
              <div className="w-full bg-[#533afd]/10 rounded-t" style={{ height: `${Math.max((d.revenue / maxRevenue) * 160, 4)}px` }}>
                <div className="w-full bg-[#533afd] rounded-t h-full" style={{ opacity: 0.8 + (d.revenue / maxRevenue) * 0.2 }} />
              </div>
              <div className="text-[11px] text-[#64748d]">{d.date}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Driver Performance */}
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e5edf5] text-[14px] font-medium">Driver Performance</div>
          {driverPerformance.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#64748d]">No driver data yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#f6f9fc]"><tr>{["Driver", "Jobs", "Revenue"].map(h => <th key={h} className="text-left px-5 py-2 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#e5edf5]">
                {driverPerformance.map((d, i) => (
                  <tr key={d.id}>
                    <td className="px-5 py-2.5 text-[13px]"><span className="text-[#94a3b8] mr-2">{i + 1}.</span>{d.name}</td>
                    <td className="px-5 py-2.5 text-[13px]">{d.jobs}</td>
                    <td className="px-5 py-2.5 text-[13px] font-medium">${d.revenue.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Revenue by Source */}
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e5edf5] text-[14px] font-medium">Revenue by Source</div>
          <div className="p-5 space-y-3">
            {Object.entries(sourceRevenue).length === 0 ? (
              <div className="text-center text-[13px] text-[#64748d]">No revenue data yet.</div>
            ) : (
              Object.entries(sourceRevenue).sort(([, a], [, b]) => b - a).map(([source, rev]) => {
                const total = Object.values(sourceRevenue).reduce((s, v) => s + v, 0);
                const pct = total > 0 ? (rev / total * 100) : 0;
                return (
                  <div key={source}>
                    <div className="flex justify-between text-[13px] mb-1">
                      <span className="capitalize font-medium">{source}</span>
                      <span className="text-[#64748d]">${rev.toFixed(0)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-[#f6f9fc] rounded-full overflow-hidden">
                      <div className="h-full bg-[#533afd] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
