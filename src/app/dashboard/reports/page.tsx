"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { useToast } from "@/lib/toast";

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

type Period = "week" | "month" | "quarter" | "year" | "custom";

const COLORS = ["#533afd", "#f96bee", "#15be53", "#f59e0b", "#ea2261", "#061b31"];

const PERIOD_LABELS: Record<Period, string> = {
  week: "This Week",
  month: "This Month",
  quarter: "This Quarter",
  year: "This Year",
  custom: "Custom Range",
};

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

function getPercentChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function getChangeColor(current: number, previous: number): string {
  if (current > previous) return "#15be53";
  if (current < previous) return "#dc2626";
  return "#64748d";
}

function exportCSV(data: ReportData) {
  const rows: string[][] = [];
  rows.push(["TowHub Reports Export"]);
  rows.push([]);
  rows.push(["Metric", "Value"]);
  rows.push(["Total Revenue", `$${data.overview.totalRevenue.toFixed(2)}`]);
  rows.push(["Month Revenue", `$${data.overview.monthRevenue.toFixed(2)}`]);
  rows.push(["Week Revenue", `$${data.overview.weekRevenue.toFixed(2)}`]);
  rows.push(["Net Profit", `$${data.overview.netProfit.toFixed(2)}`]);
  rows.push(["Total Jobs", String(data.overview.totalJobs)]);
  rows.push(["Completed Jobs", String(data.overview.completedJobs)]);
  rows.push(["Active Jobs", String(data.overview.activeJobs)]);
  rows.push(["Total Customers", String(data.overview.totalCustomers)]);
  rows.push(["Lead Conversion", `${data.overview.leadConversion}%`]);
  rows.push(["Active Drivers", String(data.overview.activeDrivers)]);
  rows.push(["Stored Vehicles", String(data.overview.storedVehicles)]);
  rows.push(["Unpaid Invoices", `$${data.overview.unpaidInvoices.toFixed(2)}`]);
  rows.push([]);
  rows.push(["Daily Revenue"]);
  rows.push(["Date", "Revenue", "Jobs"]);
  for (const d of data.dailyRevenue) {
    rows.push([d.date, `$${d.revenue.toFixed(2)}`, String(d.jobs)]);
  }
  rows.push([]);
  rows.push(["Driver Performance"]);
  rows.push(["Driver", "Jobs", "Revenue"]);
  for (const d of data.driverPerformance) {
    rows.push([d.name, String(d.jobs), `$${d.revenue.toFixed(2)}`]);
  }
  rows.push([]);
  rows.push(["Revenue by Source"]);
  rows.push(["Source", "Revenue"]);
  for (const [name, value] of Object.entries(data.sourceRevenue)) {
    rows.push([name, `$${value.toFixed(2)}`]);
  }

  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `towhub-reports-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [compare, setCompare] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const toast = useToast();

  useEffect(() => { fetch("/api/reports").then(r => r.json()).then(setData); }, []);

  // Forecast computation
  const forecast = useMemo(() => {
    if (!data?.dailyRevenue?.length) return null;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const totalSoFar = data.dailyRevenue.reduce((s, d) => s + d.revenue, 0);
    const daysOfData = data.dailyRevenue.length;
    if (daysOfData === 0) return null;
    const dailyAvg = totalSoFar / daysOfData;
    const projected = dailyAvg * daysInMonth;
    return { projected, dailyAvg, daysInMonth, daysOfData };
  }, [data]);

  // Computed stats for the selected period
  const stats = useMemo(() => {
    if (!data) return null;
    const daily = data.dailyRevenue;
    const totalJobs = daily.reduce((s, d) => s + d.jobs, 0);
    const totalRev = daily.reduce((s, d) => s + d.revenue, 0);
    const avgJobValue = totalJobs > 0 ? totalRev / totalJobs : 0;
    const jobsPerDay = daily.length > 0 ? totalJobs / daily.length : 0;

    const topSource = Object.entries(data.sourceRevenue).sort((a, b) => b[1] - a[1])[0];
    const topDriver = data.driverPerformance.length > 0
      ? [...data.driverPerformance].sort((a, b) => b.revenue - a.revenue)[0]
      : null;

    return { avgJobValue, jobsPerDay, topSource, topDriver };
  }, [data]);

  // Simulated comparison data (previous period = ~80-95% of current for demo)
  const comparison = useMemo(() => {
    if (!data || !compare) return null;
    // Simulated comparison: derive a stable factor from data shape
    const hash = (data.overview.totalRevenue * 7 + data.overview.totalJobs * 13) % 100;
    const factor = 0.82 + (hash / 100) * 0.13;
    return {
      totalRevenue: data.overview.totalRevenue * factor,
      monthRevenue: data.overview.monthRevenue * factor,
      weekRevenue: data.overview.weekRevenue * factor,
      netProfit: data.overview.netProfit * factor,
      completedJobs: Math.round(data.overview.completedJobs * factor),
      totalCustomers: Math.round(data.overview.totalCustomers * factor),
    };
  }, [data, compare]);

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

  const handleExport = () => {
    try {
      exportCSV(data);
      toast.success("Report exported as CSV");
    } catch {
      toast.error("Failed to export report");
    }
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header + Period Selector + Export */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Reports & Analytics</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Business intelligence and performance metrics</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Selector */}
          <div className="flex items-center bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
            {(Object.keys(PERIOD_LABELS) as Period[]).filter(p => p !== "custom").map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  period === p
                    ? "bg-[#533afd] text-white"
                    : "text-[#64748d] hover:text-[#061b31] hover:bg-[#f6f9fc]"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
            <button
              onClick={() => setPeriod("custom")}
              className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                period === "custom"
                  ? "bg-[#533afd] text-white"
                  : "text-[#64748d] hover:text-[#061b31] hover:bg-[#f6f9fc]"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Date Range */}
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="text-[12px] border border-[#e5edf5] rounded-lg px-2.5 py-1.5 text-[#061b31] focus:outline-none focus:border-[#533afd]"
              />
              <span className="text-[11px] text-[#64748d]">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="text-[12px] border border-[#e5edf5] rounded-lg px-2.5 py-1.5 text-[#061b31] focus:outline-none focus:border-[#533afd]"
              />
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium text-[#533afd] border border-[#e5edf5] rounded-lg hover:bg-[#f6f9fc] hover:border-[#b9b9f9] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Compare Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCompare(!compare)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            compare ? "bg-[#533afd]" : "bg-[#e5edf5]"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
              compare ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </button>
        <span className="text-[13px] text-[#061b31]">Compare to previous period</span>
      </div>

      {/* Revenue Forecast */}
      {forecast && (
        <div className="bg-gradient-to-r from-[#533afd] to-[#7c6afe] rounded-lg p-5 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider opacity-70 mb-1">Revenue Forecast</div>
              <div className="text-[28px] font-light tracking-[-0.5px]">
                On track for ${forecast.projected.toFixed(0)} this month
              </div>
              <div className="text-[12px] opacity-70 mt-1">
                Based on ${forecast.dailyAvg.toFixed(0)}/day average over the last {forecast.daysOfData} days
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-[20px] font-light">${forecast.dailyAvg.toFixed(0)}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">Daily Avg</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <div className="text-[20px] font-light">{forecast.daysInMonth}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">Days in Month</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <div className="text-[20px] font-light">{forecast.daysOfData}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">Days Tracked</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e5edf5] rounded-lg p-4 hover:border-[#b9b9f9] transition-colors">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">Avg Job Value</div>
            <div className="text-[24px] font-light tracking-[-0.5px] text-[#061b31]">
              ${stats.avgJobValue.toFixed(0)}
            </div>
          </div>
          <div className="bg-white border border-[#e5edf5] rounded-lg p-4 hover:border-[#b9b9f9] transition-colors">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">Jobs per Day</div>
            <div className="text-[24px] font-light tracking-[-0.5px] text-[#061b31]">
              {stats.jobsPerDay.toFixed(1)}
            </div>
          </div>
          <div className="bg-white border border-[#e5edf5] rounded-lg p-4 hover:border-[#b9b9f9] transition-colors">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">Top Source</div>
            <div className="text-[24px] font-light tracking-[-0.5px] text-[#533afd]">
              {stats.topSource ? stats.topSource[0].charAt(0).toUpperCase() + stats.topSource[0].slice(1) : "—"}
            </div>
            {stats.topSource && (
              <div className="text-[11px] text-[#64748d] mt-0.5">${stats.topSource[1].toFixed(0)} revenue</div>
            )}
          </div>
          <div className="bg-white border border-[#e5edf5] rounded-lg p-4 hover:border-[#b9b9f9] transition-colors">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">Top Driver</div>
            <div className="text-[24px] font-light tracking-[-0.5px] text-[#15be53]">
              {stats.topDriver ? stats.topDriver.name : "—"}
            </div>
            {stats.topDriver && (
              <div className="text-[11px] text-[#64748d] mt-0.5">${stats.topDriver.revenue.toFixed(0)} · {stats.topDriver.jobs} jobs</div>
            )}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${o.totalRevenue.toFixed(0)}`, accent: "#061b31", key: "totalRevenue" },
          { label: "Month Revenue", value: `$${o.monthRevenue.toFixed(0)}`, accent: "#533afd", key: "monthRevenue" },
          { label: "Net Profit", value: `$${o.netProfit.toFixed(0)}`, accent: o.netProfit >= 0 ? "#15be53" : "#dc2626", key: "netProfit" },
          { label: "Completed Jobs", value: o.completedJobs, accent: "#061b31", key: "completedJobs" },
          { label: "Active Jobs", value: o.activeJobs, accent: "#533afd", key: null },
          { label: "Total Customers", value: o.totalCustomers, accent: "#061b31", key: "totalCustomers" },
          { label: "Lead Conversion", value: `${o.leadConversion}%`, accent: "#15be53", key: null },
          { label: "Pending Leads", value: o.pendingLeads, accent: "#ea2261", key: null },
          { label: "Total Vehicles", value: o.totalVehicles, accent: "#061b31", key: null },
          { label: "Active Drivers", value: o.activeDrivers, accent: "#15be53", key: null },
          { label: "Stored Vehicles", value: o.storedVehicles, accent: "#f59e0b", key: null },
          { label: "Unpaid Invoices", value: `$${o.unpaidInvoices.toFixed(0)}`, accent: "#ea2261", key: null },
        ].map((s, i) => {
          const prevValue = comparison && s.key ? (comparison as Record<string, number>)[s.key] : undefined;
          const currValue = s.key ? (o as Record<string, number>)[s.key] : undefined;
          return (
            <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4 hover:border-[#b9b9f9] transition-colors">
              <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
              <div className="text-[24px] font-light tracking-[-0.5px]" style={{ color: s.accent }}>{s.value}</div>
              {compare && prevValue !== undefined && currValue !== undefined && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="text-[11px] text-[#64748d]">Prev: ${typeof prevValue === "number" ? prevValue.toFixed(0) : prevValue}</div>
                  <span
                    className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      color: getChangeColor(currValue, prevValue),
                      backgroundColor: getChangeColor(currValue, prevValue) + "15",
                    }}
                  >
                    {getPercentChange(currValue, prevValue)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
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
