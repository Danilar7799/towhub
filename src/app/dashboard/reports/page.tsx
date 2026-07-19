"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

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

const COLORS = ["#533afd", "#f96bee", "#15be53", "#f59e0b", "#ea2261", "#061b31"];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e5edf5] rounded-lg px-3 py-2 shadow-[0_8px_24px_rgba(50,50,93,0.1)]">
      <div className="text-[11px] text-[#64748d] mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-[13px] font-medium text-[#061b31]">
          {p.name === "revenue" ? `$${p.value.toFixed(0)}` : p.value} {p.name === "revenue" ? "revenue" : "jobs"}
        </div>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => { fetch("/api/reports").then(r => r.json()).then(setData); }, []);

  if (!data) return (
    <div className="flex items-center justify-center p-12">
      <div className="w-6 h-6 border-2 border-[#533afd] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { overview: o, driverPerformance, sourceRevenue, dailyRevenue } = data;

  const sourceData = Object.entries(sourceRevenue).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  })).sort((a, b) => b.value - a.value);

  const totalSourceRevenue = sourceData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Reports & Analytics</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Business intelligence and performance metrics</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${o.totalRevenue.toFixed(0)}`, accent: "#061b31" },
          { label: "Month Revenue", value: `$${o.monthRevenue.toFixed(0)}`, accent: "#533afd" },
          { label: "Net Profit", value: `$${o.netProfit.toFixed(0)}`, accent: o.netProfit >= 0 ? "#15be53" : "#dc2626" },
          { label: "Completed Jobs", value: o.completedJobs, accent: "#061b31" },
          { label: "Active Jobs", value: o.activeJobs, accent: "#533afd" },
          { label: "Total Customers", value: o.totalCustomers, accent: "#061b31" },
          { label: "Lead Conversion", value: `${o.leadConversion}%`, accent: "#15be53" },
          { label: "Pending Leads", value: o.pendingLeads, accent: "#ea2261" },
          { label: "Total Vehicles", value: o.totalVehicles, accent: "#061b31" },
          { label: "Active Drivers", value: o.activeDrivers, accent: "#15be53" },
          { label: "Stored Vehicles", value: o.storedVehicles, accent: "#f59e0b" },
          { label: "Unpaid Invoices", value: `$${o.unpaidInvoices.toFixed(0)}`, accent: "#ea2261" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4 hover:border-[#b9b9f9] transition-colors">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-[24px] font-light tracking-[-0.5px]" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart — Area */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-5">Revenue (Last 7 Days)</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dailyRevenue} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#533afd" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#533afd" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5edf5" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748d" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748d" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#533afd" strokeWidth={2} fill="url(#revenueGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Revenue by Source — Pie */}
        <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
          <div className="text-[14px] font-medium text-[#061b31] mb-5">Revenue by Source</div>
          {sourceData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-[13px] text-[#64748d]">No revenue data yet.</div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => active && payload?.[0] ? (
                    <div className="bg-white border border-[#e5edf5] rounded-lg px-3 py-2 shadow-[0_8px_24px_rgba(50,50,93,0.1)]">
                      <div className="text-[13px] font-medium text-[#061b31]">${Number(payload[0].value).toFixed(0)}</div>
                    </div>
                  ) : null} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {sourceData.map((s, i) => {
                  const pct = totalSourceRevenue > 0 ? (s.value / totalSourceRevenue * 100) : 0;
                  return (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="flex-1 text-[12px] text-[#061b31]">{s.name}</div>
                      <div className="text-[12px] text-[#64748d]">${s.value.toFixed(0)} ({pct.toFixed(0)}%)</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Driver Performance — Bar Chart */}
        <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
          <div className="text-[14px] font-medium text-[#061b31] mb-5">Driver Performance</div>
          {driverPerformance.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-[13px] text-[#64748d]">No driver data yet.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={driverPerformance} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5edf5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748d" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748d" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#533afd" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 border-t border-[#e5edf5] pt-3">
                <table className="w-full">
                  <thead>
                    <tr>
                      {["Driver", "Jobs", "Revenue"].map(h => <th key={h} className="text-left text-[11px] font-medium text-[#64748d] uppercase tracking-wider pb-2">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5edf5]">
                    {driverPerformance.map((d, i) => (
                      <tr key={d.id}>
                        <td className="py-2 text-[13px]"><span className="text-[#94a3b8] mr-2">{i + 1}.</span>{d.name}</td>
                        <td className="py-2 text-[13px]">{d.jobs}</td>
                        <td className="py-2 text-[13px] font-medium">${d.revenue.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Jobs per day bar chart */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-5">Jobs per Day</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dailyRevenue} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5edf5" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748d" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#64748d" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="jobs" fill="#f96bee" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
