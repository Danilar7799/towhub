"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface DriverScore {
  id: string;
  name: string;
  avatar: string; // initials
  role: string;
  // Metrics
  totalJobs: number;
  completedJobs: number;
  completionRate: number; // %
  avgResponseTime: number; // minutes
  avgJobDuration: number; // hours
  totalRevenue: number;
  avgRevenuePerJob: number;
  totalMiles: number;
  revenuePerMile: number;
  customerRating: number; // 1-5
  reviewsReceived: number;
  onTimeRate: number; // %
  // Derived
  overallScore: number; // 0-100
  rank: number;
  trend: "up" | "down" | "stable";
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e5edf5] rounded-lg px-3 py-2 shadow-[0_8px_24px_rgba(50,50,93,0.1)]">
      <div className="text-[11px] text-[#64748d] mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="text-[13px] font-medium text-[#061b31]">{p.value}</div>
      ))}
    </div>
  );
};

export default function DriverScoresPage() {
  const [drivers, setDrivers] = useState<DriverScore[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverScore | null>(null);
  const [period, setPeriod] = useState("month");
  const [sortBy, setSortBy] = useState("score");

  useEffect(() => {
    // Generate mock data — in production, fetch from /api/reports with driver breakdown
    const mockDrivers: DriverScore[] = [
      { id: "d1", name: "Carlos Rodriguez", avatar: "CR", role: "driver", totalJobs: 87, completedJobs: 82, completionRate: 94, avgResponseTime: 8, avgJobDuration: 1.2, totalRevenue: 12400, avgRevenuePerJob: 151, totalMiles: 3200, revenuePerMile: 3.88, customerRating: 4.8, reviewsReceived: 45, onTimeRate: 96, overallScore: 92, rank: 1, trend: "up" },
      { id: "d2", name: "James Thompson", avatar: "JT", role: "driver", totalJobs: 74, completedJobs: 68, completionRate: 92, avgResponseTime: 12, avgJobDuration: 1.5, totalRevenue: 10800, avgRevenuePerJob: 159, totalMiles: 2800, revenuePerMile: 3.86, customerRating: 4.6, reviewsReceived: 38, onTimeRate: 89, overallScore: 85, rank: 2, trend: "stable" },
      { id: "d3", name: "Mike Williams", avatar: "MW", role: "driver", totalJobs: 65, completedJobs: 60, completionRate: 92, avgResponseTime: 10, avgJobDuration: 1.3, totalRevenue: 9200, avgRevenuePerJob: 153, totalMiles: 2400, revenuePerMile: 3.83, customerRating: 4.5, reviewsReceived: 32, onTimeRate: 91, overallScore: 83, rank: 3, trend: "up" },
      { id: "d4", name: "Sarah Chen", avatar: "SC", role: "dispatcher", totalJobs: 0, completedJobs: 0, completionRate: 0, avgResponseTime: 3, avgJobDuration: 0, totalRevenue: 0, avgRevenuePerJob: 0, totalMiles: 0, revenuePerMile: 0, customerRating: 0, reviewsReceived: 0, onTimeRate: 0, overallScore: 78, rank: 4, trend: "stable" },
      { id: "d5", name: "David Park", avatar: "DP", role: "driver", totalJobs: 55, completedJobs: 48, completionRate: 87, avgResponseTime: 15, avgJobDuration: 1.8, totalRevenue: 7600, avgRevenuePerJob: 158, totalMiles: 2100, revenuePerMile: 3.62, customerRating: 4.2, reviewsReceived: 28, onTimeRate: 82, overallScore: 72, rank: 5, trend: "down" },
    ];
    setDrivers(mockDrivers);
  }, []);

  const sorted = [...drivers].sort((a, b) => {
    if (sortBy === "score") return b.overallScore - a.overallScore;
    if (sortBy === "revenue") return b.totalRevenue - a.totalRevenue;
    if (sortBy === "jobs") return b.completedJobs - a.completedJobs;
    if (sortBy === "rating") return b.customerRating - a.customerRating;
    return 0;
  });

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#15be53";
    if (score >= 80) return "#533afd";
    if (score >= 70) return "#f59e0b";
    return "#dc2626";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return "📈";
    if (trend === "down") return "📉";
    return "➡️";
  };

  // Radar chart data for selected driver
  const getRadarData = (d: DriverScore) => [
    { metric: "Completion", value: d.completionRate },
    { metric: "Response", value: Math.max(0, 100 - d.avgResponseTime * 3) },
    { metric: "Rating", value: d.customerRating * 20 },
    { metric: "On-Time", value: d.onTimeRate },
    { metric: "Revenue/Mile", value: Math.min(100, d.revenuePerMile * 25) },
    { metric: "Volume", value: Math.min(100, d.completedJobs * 1.2) },
  ];

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Driver Performance</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Scoring, rankings, and performance analytics</p>
        </div>
        <div className="flex gap-1.5">
          {["week", "month", "quarter", "all"].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium capitalize ${period === p ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#e5edf5] flex items-center justify-between">
          <div className="text-[13px] font-medium text-[#061b31]">🏆 Leaderboard</div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-[12px] border border-[#e5edf5] rounded px-2 py-1 outline-none">
            <option value="score">Overall Score</option>
            <option value="revenue">Revenue</option>
            <option value="jobs">Jobs Completed</option>
            <option value="rating">Customer Rating</option>
          </select>
        </div>
        <div className="divide-y divide-[#e5edf5]">
          {sorted.map((d, i) => (
            <div key={d.id} onClick={() => setSelectedDriver(d)}
              className={`px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-[#f6f9fc] transition-colors ${selectedDriver?.id === d.id ? "bg-[#533afd]/[0.04]" : ""}`}>
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold ${
                i === 0 ? "bg-[#fef3c7] text-[#92400e]" :
                i === 1 ? "bg-[#f6f9fc] text-[#64748d]" :
                i === 2 ? "bg-[#ffedd5] text-[#9a3412]" :
                "bg-[#f6f9fc] text-[#94a3b8]"
              }`}>
                {i + 1}
              </div>
              {/* Avatar */}
              <div className="w-10 h-10 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[#533afd] text-[13px] font-semibold">
                {d.avatar}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-[#061b31]">{d.name}</span>
                  <span className="text-[10px] text-[#94a3b8] capitalize">{d.role}</span>
                  <span>{getTrendIcon(d.trend)}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] text-[#64748d]">{d.completedJobs} jobs</span>
                  <span className="text-[11px] text-[#64748d]">${d.totalRevenue.toLocaleString()}</span>
                  {d.customerRating > 0 && <span className="text-[11px] text-[#64748d]">⭐ {d.customerRating}</span>}
                  <span className="text-[11px] text-[#64748d]">{d.onTimeRate}% on-time</span>
                </div>
              </div>
              {/* Score */}
              <div className="text-right">
                <div className="text-[24px] font-semibold" style={{ color: getScoreColor(d.overallScore) }}>{d.overallScore}</div>
                <div className="text-[10px] text-[#94a3b8]">/ 100</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Driver Detail */}
      {selectedDriver && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Radar chart */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[14px] font-medium text-[#061b31] mb-4">{selectedDriver.name} — Performance Profile</div>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={getRadarData(selectedDriver)}>
                <PolarGrid stroke="#e5edf5" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748d" }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Radar name="Score" dataKey="value" stroke="#533afd" fill="#533afd" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed metrics */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[14px] font-medium text-[#061b31] mb-4">Detailed Metrics</div>
            <div className="space-y-3">
              {[
                { label: "Completion Rate", value: `${selectedDriver.completionRate}%`, bar: selectedDriver.completionRate, color: "#15be53" },
                { label: "On-Time Rate", value: `${selectedDriver.onTimeRate}%`, bar: selectedDriver.onTimeRate, color: "#533afd" },
                { label: "Avg Response Time", value: `${selectedDriver.avgResponseTime} min`, bar: Math.max(0, 100 - selectedDriver.avgResponseTime * 5), color: "#f59e0b" },
                { label: "Customer Rating", value: `${selectedDriver.customerRating}/5.0`, bar: selectedDriver.customerRating * 20, color: "#533afd" },
                { label: "Revenue per Mile", value: `$${selectedDriver.revenuePerMile.toFixed(2)}`, bar: Math.min(100, selectedDriver.revenuePerMile * 25), color: "#15be53" },
                { label: "Avg Job Duration", value: `${selectedDriver.avgJobDuration}h`, bar: Math.max(0, 100 - selectedDriver.avgJobDuration * 30), color: "#f97316" },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-[#64748d]">{m.label}</span>
                    <span className="font-medium">{m.value}</span>
                  </div>
                  <div className="h-2 bg-[#f6f9fc] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, m.bar)}%`, backgroundColor: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
