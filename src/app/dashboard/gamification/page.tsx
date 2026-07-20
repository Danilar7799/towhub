"use client";

import { useState, useEffect } from "react";

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "jobs" | "revenue" | "rating" | "safety" | "special";
  requirement: string;
  progress: number; // 0-100
  unlocked: boolean;
  unlockedAt?: string;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  prize: string;
  startDate: string;
  endDate: string;
  status: "active" | "upcoming" | "completed";
  leaderboard: { name: string; avatar: string; value: number; rank: number }[];
  metric: string;
}

const BADGES: Badge[] = [
  { id: "first-tow", name: "First Tow", icon: "🚛", description: "Complete your first tow", category: "jobs", requirement: "1 job completed", progress: 100, unlocked: true, unlockedAt: "2026-01-15" },
  { id: "century-club", name: "Century Club", icon: "💯", description: "Complete 100 tows", category: "jobs", requirement: "100 jobs completed", progress: 82, unlocked: false },
  { id: "night-owl", name: "Night Owl", icon: "🦉", description: "Complete 25 after-hours tows", category: "jobs", requirement: "25 after-hours jobs", progress: 68, unlocked: false },
  { id: "speed-demon", name: "Speed Demon", icon: "⚡", description: "Average response time under 10 min", category: "jobs", requirement: "Avg < 10 min response", progress: 100, unlocked: true, unlockedAt: "2026-03-22" },
  { id: "five-star", name: "Five Star", icon: "⭐", description: "Get 50 five-star ratings", category: "rating", requirement: "50 five-star reviews", progress: 74, unlocked: false },
  { id: "people-person", name: "People Person", icon: "🤝", description: "Maintain 4.8+ rating for 3 months", category: "rating", requirement: "4.8+ rating, 3 months", progress: 100, unlocked: true, unlockedAt: "2026-05-01" },
  { id: "rain-maker", name: "Rain Maker", icon: "🌧️", description: "Earn $10,000 in a single month", category: "revenue", requirement: "$10K in one month", progress: 92, unlocked: false },
  { id: "big-haul", name: "Big Haul", icon: "🏗️", description: "Complete a heavy-duty tow worth $500+", category: "revenue", requirement: "Single job $500+", progress: 100, unlocked: true, unlockedAt: "2026-04-10" },
  { id: "safe-driver", name: "Safe Driver", icon: "🛡️", description: "Zero incidents for 6 months", category: "safety", requirement: "6 months, no incidents", progress: 83, unlocked: false },
  { id: "road-warrior", name: "Road Warrior", icon: "⚔️", description: "Drive 10,000 miles on the job", category: "safety", requirement: "10,000 miles driven", progress: 67, unlocked: false },
  { id: "early-bird", name: "Early Bird", icon: "🐦", description: "Start 50 shifts before 7am", category: "special", requirement: "50 early shifts", progress: 44, unlocked: false },
  { id: "team-player", name: "Team Player", icon: "👥", description: "Help 10 other drivers complete jobs", category: "special", requirement: "10 assists", progress: 30, unlocked: false },
];

const CONTESTS: Contest[] = [
  {
    id: "july-most-tows", title: "🏆 July Tow King", description: "Complete the most tows in July",
    prize: "$500 bonus + Trophy", startDate: "2026-07-01", endDate: "2026-07-31", status: "active", metric: "Tows Completed",
    leaderboard: [
      { name: "Carlos R.", avatar: "CR", value: 34, rank: 1 },
      { name: "James T.", avatar: "JT", value: 28, rank: 2 },
      { name: "Mike W.", avatar: "MW", value: 25, rank: 3 },
      { name: "David P.", avatar: "DP", value: 19, rank: 4 },
      { name: "Sarah C.", avatar: "SC", value: 15, rank: 5 },
    ],
  },
  {
    id: "july-best-rating", title: "⭐ Customer Champion", description: "Highest average rating (min 20 jobs)",
    prize: "$300 bonus", startDate: "2026-07-01", endDate: "2026-07-31", status: "active", metric: "Avg Rating",
    leaderboard: [
      { name: "Carlos R.", avatar: "CR", value: 4.9, rank: 1 },
      { name: "Mike W.", avatar: "MW", value: 4.8, rank: 2 },
      { name: "James T.", avatar: "JT", value: 4.7, rank: 3 },
      { name: "David P.", avatar: "DP", value: 4.5, rank: 4 },
    ],
  },
  {
    id: "august-speed", title: "⚡ Speed Week", description: "Fastest average response time in Week 1 of August",
    prize: "$200 + Priority scheduling", startDate: "2026-08-01", endDate: "2026-08-07", status: "upcoming", metric: "Avg Response (min)",
    leaderboard: [],
  },
];

export default function GamificationPage() {
  const [tab, setTab] = useState<"badges" | "contests" | "leaderboard">("badges");
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const unlockedCount = BADGES.filter(b => b.unlocked).length;
  const activeContests = CONTESTS.filter(c => c.status === "active");

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">🏆 Gamification</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Badges, contests, and leaderboards to motivate your team</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f6f9fc] p-1 rounded-lg w-fit">
        {[
          { v: "badges" as const, l: "🎖️ Badges", count: `${unlockedCount}/${BADGES.length}` },
          { v: "contests" as const, l: "🏆 Contests", count: `${activeContests.length} active` },
          { v: "leaderboard" as const, l: "📊 Leaderboard", count: "" },
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all flex items-center gap-2 ${
              tab === t.v ? "bg-white text-[#061b31] shadow-sm" : "text-[#64748d] hover:text-[#061b31]"
            }`}>
            {t.l}
            {t.count && <span className={`px-1.5 py-0.5 rounded text-[10px] ${tab === t.v ? "bg-[#533afd] text-white" : "bg-[#e5edf5] text-[#64748d]"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Badges Grid */}
      {tab === "badges" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BADGES.map(b => (
            <div key={b.id} onClick={() => setSelectedBadge(b)}
              className={`bg-white border rounded-lg p-5 cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(50,50,93,0.06)] ${
                b.unlocked ? "border-[#15be53]/30" : "border-[#e5edf5]"
              }`}>
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-[24px] ${b.unlocked ? "bg-[#dcfce7]" : "bg-[#f6f9fc] grayscale opacity-50"}`}>
                  {b.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[#061b31]">{b.name}</span>
                    {b.unlocked && <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-1.5 py-0.5 rounded font-medium">Unlocked</span>}
                  </div>
                  <div className="text-[12px] text-[#64748d] mt-0.5">{b.description}</div>
                  {!b.unlocked && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-[#94a3b8] mb-1">
                        <span>{b.requirement}</span>
                        <span>{b.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-[#f6f9fc] rounded-full overflow-hidden">
                        <div className="h-full bg-[#533afd] rounded-full transition-all" style={{ width: `${b.progress}%` }} />
                      </div>
                    </div>
                  )}
                  {b.unlocked && b.unlockedAt && (
                    <div className="text-[10px] text-[#94a3b8] mt-1">Unlocked {new Date(b.unlockedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contests */}
      {tab === "contests" && (
        <div className="space-y-5">
          {CONTESTS.map(c => (
            <div key={c.id} className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
              <div className="p-5 border-b border-[#e5edf5]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-semibold text-[#061b31]">{c.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      c.status === "active" ? "bg-[#dcfce7] text-[#166534]" :
                      c.status === "upcoming" ? "bg-[#dbeafe] text-[#1e40af]" :
                      "bg-[#f6f9fc] text-[#64748d]"
                    }`}>{c.status}</span>
                  </div>
                  <span className="text-[13px] font-medium text-[#15be53]">🏆 {c.prize}</span>
                </div>
                <div className="text-[13px] text-[#64748d]">{c.description}</div>
                <div className="text-[11px] text-[#94a3b8] mt-1">{new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}</div>
              </div>

              {/* Leaderboard */}
              {c.leaderboard.length > 0 && (
                <div className="divide-y divide-[#e5edf5]">
                  {c.leaderboard.map((entry, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold ${
                        i === 0 ? "bg-[#fef3c7] text-[#92400e]" :
                        i === 1 ? "bg-[#f6f9fc] text-[#64748d]" :
                        i === 2 ? "bg-[#ffedd5] text-[#9a3412]" :
                        "bg-[#f6f9fc] text-[#94a3b8]"
                      }`}>{entry.rank}</div>
                      <div className="w-8 h-8 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[#533afd] text-[11px] font-semibold">{entry.avatar}</div>
                      <div className="flex-1 text-[13px] font-medium">{entry.name}</div>
                      <div className="text-[14px] font-semibold">{entry.value} {c.metric.includes("Rating") ? "⭐" : ""}</div>
                    </div>
                  ))}
                </div>
              )}

              {c.leaderboard.length === 0 && (
                <div className="p-6 text-center text-[13px] text-[#64748d]">Contest hasn't started yet</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Overall Leaderboard */}
      {tab === "leaderboard" && (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-[#e5edf5]">
            <div className="text-[13px] font-medium text-[#061b31]">🏅 All-Time Leaderboard</div>
          </div>
          <div className="divide-y divide-[#e5edf5]">
            {[
              { name: "Carlos Rodriguez", avatar: "CR", score: 2450, badges: 5, tows: 87, rating: 4.8 },
              { name: "James Thompson", avatar: "JT", score: 1890, badges: 4, tows: 74, rating: 4.6 },
              { name: "Mike Williams", avatar: "MW", score: 1650, badges: 3, tows: 65, rating: 4.5 },
              { name: "David Park", avatar: "DP", score: 1200, badges: 2, tows: 55, rating: 4.2 },
              { name: "Sarah Chen", avatar: "SC", score: 980, badges: 2, tows: 0, rating: 0 },
            ].map((d, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold ${
                  i === 0 ? "bg-[#fef3c7] text-[#92400e]" : i === 1 ? "bg-[#f6f9fc] text-[#64748d]" : i === 2 ? "bg-[#ffedd5] text-[#9a3412]" : "bg-[#f6f9fc] text-[#94a3b8]"
                }`}>{i + 1}</div>
                <div className="w-10 h-10 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[#533afd] text-[13px] font-semibold">{d.avatar}</div>
                <div className="flex-1">
                  <div className="text-[14px] font-medium text-[#061b31]">{d.name}</div>
                  <div className="text-[11px] text-[#64748d]">{d.badges} badges • {d.tows} tows • {d.rating > 0 ? `⭐ ${d.rating}` : "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-semibold text-[#533afd]">{d.score}</div>
                  <div className="text-[10px] text-[#94a3b8]">points</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
