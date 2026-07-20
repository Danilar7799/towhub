"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

/* ─── types ─── */
interface SurveyConfig { autoSendDelay: "1h" | "24h" | "48h"; enabled: boolean }
interface SurveyResponse {
  id: string; customerName: string; jobId: string; rating: number;
  comment: string; npsScore: number; date: string; flagged: boolean; followedUp: boolean;
}
interface MonthlyTrend { month: string; avgRating: number; responses: number }

/* ─── mock data ─── */
const MOCK_CONFIG: SurveyConfig = { autoSendDelay: "24h", enabled: true };

const MOCK_RESPONSES: SurveyResponse[] = [
  { id: "1", customerName: "John Martinez", jobId: "JOB-1042", rating: 5, comment: "Fast and professional! The driver arrived within 20 minutes.", npsScore: 10, date: "2026-07-18", flagged: false, followedUp: false },
  { id: "2", customerName: "Sarah Chen", jobId: "JOB-1038", rating: 4, comment: "Good service overall, but the ETA was a bit off.", npsScore: 8, date: "2026-07-17", flagged: false, followedUp: false },
  { id: "3", customerName: "Mike Thompson", jobId: "JOB-1035", rating: 2, comment: "Waited over an hour. Driver was rude and unprofessional.", npsScore: 3, date: "2026-07-16", flagged: true, followedUp: false },
  { id: "4", customerName: "Lisa Park", jobId: "JOB-1031", rating: 5, comment: "Excellent communication. Car was handled with care.", npsScore: 9, date: "2026-07-15", flagged: false, followedUp: false },
  { id: "5", customerName: "David Wilson", jobId: "JOB-1028", rating: 1, comment: "Terrible experience. Damaged my bumper and refused to take responsibility.", npsScore: 0, date: "2026-07-14", flagged: true, followedUp: true },
  { id: "6", customerName: "Amy Rodriguez", jobId: "JOB-1025", rating: 5, comment: "Best towing service I've ever used. Will call again!", npsScore: 10, date: "2026-07-13", flagged: false, followedUp: false },
  { id: "7", customerName: "James Lee", jobId: "JOB-1020", rating: 3, comment: "Average experience. Nothing special but got the job done.", npsScore: 6, date: "2026-07-12", flagged: false, followedUp: false },
  { id: "8", customerName: "Karen White", jobId: "JOB-1018", rating: 4, comment: "Quick response time. Friendly driver.", npsScore: 8, date: "2026-07-11", flagged: false, followedUp: false },
  { id: "9", customerName: "Robert Harris", jobId: "JOB-1015", rating: 5, comment: "Incredible service at 2am. Lifesaver!", npsScore: 10, date: "2026-07-10", flagged: false, followedUp: false },
  { id: "10", customerName: "Nancy Clark", jobId: "JOB-1012", rating: 2, comment: "Hidden fees not mentioned upfront. Very disappointed.", npsScore: 2, date: "2026-07-09", flagged: true, followedUp: true },
  { id: "11", customerName: "Tom Baker", jobId: "JOB-1009", rating: 4, comment: "Solid work. The flatbed truck was clean and well-maintained.", npsScore: 7, date: "2026-07-08", flagged: false, followedUp: false },
  { id: "12", customerName: "Emily Davis", jobId: "JOB-1005", rating: 5, comment: "Perfect from start to finish. Highly recommend.", npsScore: 10, date: "2026-07-07", flagged: false, followedUp: false },
  { id: "13", customerName: "Chris Young", jobId: "JOB-1001", rating: 3, comment: "Took a while to arrive but driver was nice.", npsScore: 7, date: "2026-07-06", flagged: false, followedUp: false },
  { id: "14", customerName: "Patricia Moore", jobId: "JOB-0998", rating: 4, comment: "Good price and fast service.", npsScore: 9, date: "2026-07-05", flagged: false, followedUp: false },
  { id: "15", customerName: "Kevin Taylor", jobId: "JOB-0995", rating: 1, comment: "Never showed up. Had to call another company. Worst experience ever.", npsScore: 0, date: "2026-07-04", flagged: true, followedUp: false },
];

const MOCK_TRENDS: MonthlyTrend[] = [
  { month: "Jan", avgRating: 3.8, responses: 24 },
  { month: "Feb", avgRating: 4.0, responses: 28 },
  { month: "Mar", avgRating: 3.9, responses: 35 },
  { month: "Apr", avgRating: 4.2, responses: 31 },
  { month: "May", avgRating: 4.1, responses: 42 },
  { month: "Jun", avgRating: 4.3, responses: 38 },
  { month: "Jul", avgRating: 4.0, responses: 15 },
];

const COMPLAINTS = [
  { word: "wait time", count: 12 },
  { word: "rude driver", count: 8 },
  { word: "hidden fees", count: 7 },
  { word: "damaged vehicle", count: 5 },
  { word: "late arrival", count: 9 },
  { word: "no-show", count: 3 },
  { word: "poor communication", count: 6 },
  { word: "overpriced", count: 4 },
  { word: "unprofessional", count: 5 },
  { word: "billing error", count: 3 },
];

const NPS_COLORS = { promoters: "#22c55e", passives: "#f59e0b", detractors: "#ef4444" };
const RATING_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];

/* ─── helpers ─── */
function calcNPS(responses: SurveyResponse[]): number {
  if (!responses.length) return 0;
  const promoters = responses.filter(r => r.npsScore >= 9).length;
  const detractors = responses.filter(r => r.npsScore <= 6).length;
  return Math.round(((promoters - detractors) / responses.length) * 100);
}

function calcAvgRating(responses: SurveyResponse[]): number {
  if (!responses.length) return 0;
  return +(responses.reduce((s, r) => s + r.rating, 0) / responses.length).toFixed(1);
}

function getRatingDistribution(responses: SurveyResponse[]) {
  const dist = [0, 0, 0, 0, 0];
  responses.forEach(r => dist[r.rating - 1]++);
  return ["1★", "2★", "3★", "4★", "5★"].map((label, i) => ({ rating: label, count: dist[i] }));
}

function getNPSBreakdown(responses: SurveyResponse[]) {
  const promoters = responses.filter(r => r.npsScore >= 9).length;
  const passives = responses.filter(r => r.npsScore >= 7 && r.npsScore <= 8).length;
  const detractors = responses.filter(r => r.npsScore <= 6).length;
  return [
    { name: `Promoters (9-10)`, value: promoters, color: NPS_COLORS.promoters },
    { name: `Passives (7-8)`, value: passives, color: NPS_COLORS.passives },
    { name: `Detractors (0-6)`, value: detractors, color: NPS_COLORS.detractors },
  ];
}

function Stars({ n }: { n: number }) {
  return <span className="text-[14px] tracking-tight">{[1, 2, 3, 4, 5].map(i => <span key={i} className={i <= n ? "text-amber-400" : "text-[#d0d5dd]"}>★</span>)}</span>;
}

/* ─── page ─── */
export default function CustomerSurveysPage() {
  const [config, setConfig] = useState<SurveyConfig>(MOCK_CONFIG);
  const [responses, setResponses] = useState<SurveyResponse[]>(MOCK_RESPONSES);
  const [tab, setTab] = useState<"overview" | "responses" | "config">("overview");
  const [sentTotal] = useState(187);
  const [followUpFilter, setFollowUpFilter] = useState(false);

  const displayedResponses = followUpFilter ? responses.filter(r => r.flagged && !r.followedUp) : responses;

  const nps = calcNPS(responses);
  const avgRating = calcAvgRating(responses);
  const responseRate = Math.round((responses.length / sentTotal) * 100);
  const distData = getRatingDistribution(responses);
  const npsData = getNPSBreakdown(responses);
  const flaggedCount = responses.filter(r => r.flagged && !r.followedUp).length;

  function toggleFollowUp(id: string) {
    setResponses(prev => prev.map(r => r.id === id ? { ...r, followedUp: !r.followedUp } : r));
  }

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Customer Surveys</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Auto-send satisfaction surveys after job completion</p>
        </div>
        <div className="flex gap-2">
          {(["overview", "responses", "config"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded text-[12px] font-medium capitalize ${tab === t ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-[#e5edf5] rounded-lg p-4">
              <div className="text-[11px] text-[#64748d] uppercase tracking-wider">Avg Rating</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[28px] font-light">{avgRating}</span>
                <span className="text-[13px] text-amber-400">/ 5</span>
              </div>
            </div>
            <div className="bg-white border border-[#e5edf5] rounded-lg p-4">
              <div className="text-[11px] text-[#64748d] uppercase tracking-wider">NPS Score</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-[28px] font-light ${nps >= 50 ? "text-emerald-600" : nps >= 0 ? "text-amber-500" : "text-red-500"}`}>{nps > 0 ? `+${nps}` : nps}</span>
                <span className="text-[13px] text-[#64748d]">/ ±100</span>
              </div>
            </div>
            <div className="bg-white border border-[#e5edf5] rounded-lg p-4">
              <div className="text-[11px] text-[#64748d] uppercase tracking-wider">Response Rate</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[28px] font-light">{responseRate}%</span>
                <span className="text-[13px] text-[#64748d]">of {sentTotal} sent</span>
              </div>
            </div>
            <div className="bg-white border border-[#e5edf5] rounded-lg p-4">
              <div className="text-[11px] text-[#64748d] uppercase tracking-wider">Needs Follow-up</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className={`text-[28px] font-light ${flaggedCount > 0 ? "text-red-500" : ""}`}>{flaggedCount}</span>
                {flaggedCount > 0 && <span className="text-[13px] text-red-400">flagged</span>}
              </div>
            </div>
          </div>

          {/* charts row */}
          <div className="grid grid-cols-3 gap-4">
            {/* rating distribution */}
            <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
              <div className="text-[13px] font-medium mb-4">Rating Distribution</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="rating" tick={{ fontSize: 12, fill: "#64748d" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748d" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf5" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distData.map((_, i) => <Cell key={i} fill={RATING_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* NPS breakdown */}
            <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
              <div className="text-[13px] font-medium mb-4">NPS Breakdown</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={npsData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" label={({ value }) => `${value}`}>
                    {npsData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf5" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* rating trend */}
            <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
              <div className="text-[13px] font-medium mb-4">Rating Trend (2026)</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={MOCK_TRENDS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748d" }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: "#64748d" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5edf5" }} />
                  <Line type="monotone" dataKey="avgRating" stroke="#533afd" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* complaints + flagged */}
          <div className="grid grid-cols-2 gap-4">
            {/* word cloud placeholder */}
            <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
              <div className="text-[13px] font-medium mb-4">Top Complaints</div>
              <div className="flex flex-wrap gap-2 items-center justify-center min-h-[140px]">
                {COMPLAINTS.sort((a, b) => b.count - a.count).map((c, i) => (
                  <span key={c.word} className="inline-block px-2.5 py-1 rounded-full text-[12px] font-medium" style={{
                    fontSize: `${Math.max(11, Math.min(18, 10 + c.count))}px`,
                    background: i < 3 ? "#fef2f2" : "#f8fafc",
                    color: i < 3 ? "#ef4444" : "#64748d",
                    border: i < 3 ? "1px solid #fecaca" : "1px solid #e5edf5",
                  }}>
                    {c.word} ({c.count})
                  </span>
                ))}
              </div>
            </div>

            {/* flagged for follow-up */}
            <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[13px] font-medium">Flagged for Follow-up</div>
                <span className="bg-red-50 text-red-600 text-[11px] font-medium px-2 py-0.5 rounded-full">{flaggedCount} pending</span>
              </div>
              <div className="space-y-3">
                {responses.filter(r => r.flagged).map(r => (
                  <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg border ${r.followedUp ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium">{r.customerName}</span>
                        <Stars n={r.rating} />
                      </div>
                      <p className="text-[12px] text-[#64748d] truncate mt-0.5">{r.comment}</p>
                    </div>
                    <button onClick={() => toggleFollowUp(r.id)} className={`ml-3 text-[11px] font-medium px-2.5 py-1 rounded ${r.followedUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                      {r.followedUp ? "✓ Resolved" : "Follow Up"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── RESPONSES ── */}
      {tab === "responses" && (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => setFollowUpFilter(false)} className={`px-3 py-1.5 rounded text-[12px] font-medium ${!followUpFilter ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>
              All Responses ({responses.length})
            </button>
            <button onClick={() => setFollowUpFilter(true)} className={`px-3 py-1.5 rounded text-[12px] font-medium ${followUpFilter ? "bg-red-500 text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>
              Needs Follow-up ({flaggedCount})
            </button>
          </div>

          <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
                <tr>
                  {["Customer", "Job", "Rating", "NPS", "Comment", "Date", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedResponses.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-[13px] text-[#64748d]">No responses match this filter.</td></tr>
                ) : displayedResponses.map(r => (
                  <tr key={r.id} className={`border-b border-[#f0f0f5] hover:bg-[#fafbfd] ${r.flagged && !r.followedUp ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3 text-[13px] font-medium">{r.customerName}</td>
                    <td className="px-4 py-3 text-[13px] text-[#533afd] font-mono">{r.jobId}</td>
                    <td className="px-4 py-3"><Stars n={r.rating} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-[13px] font-semibold ${r.npsScore >= 9 ? "text-emerald-600" : r.npsScore >= 7 ? "text-amber-500" : "text-red-500"}`}>{r.npsScore}</span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#64748d] max-w-[300px] truncate">{r.comment}</td>
                    <td className="px-4 py-3 text-[12px] text-[#64748d]">{r.date}</td>
                    <td className="px-4 py-3">
                      {r.followedUp ? (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Resolved</span>
                      ) : r.flagged ? (
                        <button onClick={() => toggleFollowUp(r.id)} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100">Needs Follow-up</button>
                      ) : (
                        <span className="text-[11px] text-[#64748d]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── CONFIG ── */}
      {tab === "config" && (
        <div className="grid grid-cols-2 gap-4">
          {/* survey config */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5 space-y-5">
            <div className="text-[14px] font-medium">Survey Settings</div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#64748d] uppercase tracking-wider">Auto-Send Delay</label>
              <p className="text-[12px] text-[#94a3b8] mb-2">Time after job completion before sending survey</p>
              <div className="flex gap-2">
                {(["1h", "24h", "48h"] as const).map(d => (
                  <button key={d} onClick={() => setConfig(c => ({ ...c, autoSendDelay: d }))} className={`px-4 py-2 rounded-lg text-[13px] font-medium ${config.autoSendDelay === d ? "bg-[#533afd] text-white" : "bg-[#f6f9fc] border border-[#e5edf5] text-[#64748d] hover:border-[#533afd]"}`}>
                    {d === "1h" ? "1 Hour" : d === "24h" ? "24 Hours" : "48 Hours"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#f6f9fc] rounded-lg">
              <div>
                <div className="text-[13px] font-medium">Auto-send surveys</div>
                <div className="text-[12px] text-[#64748d]">Automatically send after each completed job</div>
              </div>
              <button onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))} className={`relative w-10 h-[22px] rounded-full transition-colors ${config.enabled ? "bg-[#533afd]" : "bg-[#d0d5dd]"}`}>
                <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${config.enabled ? "translate-x-[18px]" : ""}`} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-[12px] font-medium text-amber-800">Auto-Flagging Rules</div>
              <ul className="text-[12px] text-amber-700 mt-1 space-y-0.5 list-disc list-inside">
                <li>Rating ≤ 2 stars → flagged for follow-up</li>
                <li>NPS score ≤ 6 (Detractor) → flagged for follow-up</li>
                <li>Keywords: &quot;damage&quot;, &quot;rude&quot;, &quot;terrible&quot;, &quot;worst&quot; → flagged</li>
              </ul>
            </div>
          </div>

          {/* survey template preview */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5 space-y-4">
            <div className="text-[14px] font-medium">Survey Template Preview</div>

            <div className="border border-[#e5edf5] rounded-lg p-5 bg-[#fafbfd]">
              <div className="text-center space-y-4">
                <div className="text-[16px] font-semibold">How was your tow?</div>
                <p className="text-[13px] text-[#64748d]">Your feedback helps us improve our service.</p>

                <div className="space-y-2">
                  <div className="text-[12px] text-[#64748d] font-medium">Rate your experience</div>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <button key={i} className="w-10 h-10 rounded-lg border border-[#e5edf5] bg-white hover:bg-amber-50 hover:border-amber-300 text-[18px] transition-colors">★</button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[12px] text-[#64748d] font-medium">Comments (optional)</label>
                  <div className="w-full h-16 rounded-lg border border-[#e5edf5] bg-white p-2 text-[12px] text-[#94a3b8]">Tell us about your experience...</div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[12px] text-[#64748d] font-medium">Would you recommend TowHub to a friend?</label>
                  <div className="flex gap-2 justify-center">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <button key={n} className={`w-7 h-7 rounded text-[11px] font-medium border ${n <= 6 ? "border-red-200 text-red-500 bg-red-50" : n <= 8 ? "border-amber-200 text-amber-600 bg-amber-50" : "border-emerald-200 text-emerald-600 bg-emerald-50"}`}>{n}</button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-[#94a3b8] px-1">
                    <span>Not likely</span>
                    <span>Very likely</span>
                  </div>
                </div>

                <button className="w-full py-2 rounded-lg bg-[#533afd] text-white text-[13px] font-medium">Submit Feedback</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
