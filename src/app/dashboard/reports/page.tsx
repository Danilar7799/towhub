"use client";

import { useState, useEffect } from "react";

interface ReportData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  jobsCompleted: number;
  avgJobValue: number;
  topDrivers: Array<{ name: string; jobs: number; revenue: number; rating: number }>;
  expenseBreakdown: Array<{ category: string; amount: number; percent: number }>;
  revenueByDay: Array<{ date: string; amount: number }>;
  reminders: Array<{ id: string; title: string; dueDate: string; type: string; priority: string }>;
}

const TABS = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "income", label: "Income", icon: "💰" },
  { id: "expenses", label: "Expenses", icon: "💸" },
  { id: "drivers", label: "Drivers", icon: "👥" },
  { id: "reminders", label: "Reminders", icon: "🔔" },
  { id: "settings", label: "Report Settings", icon: "⚙️" },
];

const PERIODS = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "This Week" },
  { id: "monthly", label: "This Month" },
  { id: "yearly", label: "This Year" },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [period, setPeriod] = useState("monthly");
  const [report, setReport] = useState<ReportData | null>(null);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [reportFrequency, setReportFrequency] = useState<string[]>(["daily"]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load report data
    fetch(`/api/reports?period=${period}`)
      .then(r => r.json())
      .then(d => setReport(d.report || generateMockReport()))
      .catch(() => setReport(generateMockReport()));

    // Load Telegram settings
    fetch("/api/notifications/settings")
      .then(r => r.json())
      .then(d => {
        if (d.settings) {
          setTelegramChatId(d.settings.telegramChatId || "");
          setTelegramEnabled(d.settings.telegramEnabled || false);
          setReportFrequency(d.settings.reportFrequency || ["daily"]);
        }
      })
      .catch(() => {});
  }, [period]);

  const saveTelegramSettings = async () => {
    setSaving(true);
    await fetch("/api/notifications/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramChatId,
        telegramEnabled,
        reportFrequency,
      }),
    });
    setSaving(false);
  };

  const fmtMoney = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  if (!report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#533afd] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Reports & Analytics</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Detailed business insights and automated reporting</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${
                period === p.id
                  ? "bg-[#533afd] text-white"
                  : "bg-white border border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f6f9fc] p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-white text-[#061b31] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                : "text-[#64748d] hover:text-[#061b31]"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Revenue", value: fmtMoney(report.revenue), color: "#15be53", change: "+12%" },
              { label: "Expenses", value: fmtMoney(report.expenses), color: "#ef4444", change: "-5%" },
              { label: "Profit", value: fmtMoney(report.profit), color: "#533afd", change: "+18%" },
              { label: "Jobs Completed", value: report.jobsCompleted.toString(), color: "#061b31", change: "+8%" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white border border-[#e5edf5] rounded-lg p-5">
                <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{kpi.label}</div>
                <div className="text-[28px] font-light tracking-[-0.5px]" style={{ color: kpi.color }}>{kpi.value}</div>
                <div className="text-[11px] text-[#15be53] mt-1">{kpi.change} vs last period</div>
              </div>
            ))}
          </div>

          {/* Revenue Chart Placeholder */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
            <div className="text-[14px] font-semibold mb-4">Revenue Trend</div>
            <div className="flex items-end gap-1 h-[200px]">
              {report.revenueByDay.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-[#533afd]/20 rounded-t"
                    style={{ height: `${Math.max(10, (day.amount / Math.max(...report.revenueByDay.map(d => d.amount))) * 180)}px` }}
                  />
                  <div className="text-[9px] text-[#94a3b8]">{day.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
              <div className="text-[14px] font-semibold mb-3">Average Job Value</div>
              <div className="text-[32px] font-light text-[#533afd]">{fmtMoney(report.avgJobValue)}</div>
            </div>
            <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
              <div className="text-[14px] font-semibold mb-3">Profit Margin</div>
              <div className="text-[32px] font-light text-[#15be53]">
                {report.revenue > 0 ? Math.round((report.profit / report.revenue) * 100) : 0}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Income Tab */}
      {activeTab === "income" && (
        <div className="space-y-5">
          <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
            <div className="text-[14px] font-semibold mb-4">Income Breakdown</div>
            <div className="space-y-3">
              {[
                { source: "Towing Services", amount: report.revenue * 0.65, percent: 65 },
                { source: "Roadside Assistance", amount: report.revenue * 0.2, percent: 20 },
                { source: "Impound Fees", amount: report.revenue * 0.1, percent: 10 },
                { source: "Long Distance", amount: report.revenue * 0.05, percent: 5 },
              ].map(item => (
                <div key={item.source} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[13px] font-medium">{item.source}</span>
                      <span className="text-[13px] text-[#64748d]">{fmtMoney(item.amount)}</span>
                    </div>
                    <div className="h-2 bg-[#f6f9fc] rounded-full overflow-hidden">
                      <div className="h-full bg-[#533afd] rounded-full" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                  <span className="text-[12px] text-[#64748d] w-10 text-right">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
            <div className="text-[14px] font-semibold mb-4">Payment Methods</div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { method: "Credit Card", amount: report.revenue * 0.5, icon: "💳" },
                { method: "Cash", amount: report.revenue * 0.3, icon: "💵" },
                { method: "Invoice", amount: report.revenue * 0.2, icon: "📄" },
              ].map(pm => (
                <div key={pm.method} className="bg-[#f6f9fc] rounded-lg p-4 text-center">
                  <div className="text-[24px] mb-2">{pm.icon}</div>
                  <div className="text-[12px] text-[#64748d]">{pm.method}</div>
                  <div className="text-[18px] font-semibold mt-1">{fmtMoney(pm.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <div className="space-y-5">
          <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
            <div className="text-[14px] font-semibold mb-4">Expense Categories</div>
            <div className="space-y-3">
              {report.expenseBreakdown.map(item => (
                <div key={item.category} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[13px] font-medium">{item.category}</span>
                      <span className="text-[13px] text-[#64748d]">{fmtMoney(item.amount)}</span>
                    </div>
                    <div className="h-2 bg-[#f6f9fc] rounded-full overflow-hidden">
                      <div className="h-full bg-[#ef4444] rounded-full" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                  <span className="text-[12px] text-[#64748d] w-10 text-right">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
            <div className="text-[14px] font-semibold mb-4">Expense Summary</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#fef2f2] rounded-lg p-4">
                <div className="text-[11px] text-[#991b1b] uppercase tracking-wider">Total Expenses</div>
                <div className="text-[28px] font-light text-[#991b1b]">{fmtMoney(report.expenses)}</div>
              </div>
              <div className="bg-[#f6f9fc] rounded-lg p-4">
                <div className="text-[11px] text-[#64748d] uppercase tracking-wider">Expense/Revenue Ratio</div>
                <div className="text-[28px] font-light text-[#061b31]">
                  {report.revenue > 0 ? Math.round((report.expenses / report.revenue) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drivers Tab */}
      {activeTab === "drivers" && (
        <div className="space-y-5">
          <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e5edf5]">
              <div className="text-[14px] font-semibold">Driver Performance</div>
            </div>
            <table className="w-full">
              <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
                <tr>
                  {["Rank", "Driver", "Jobs", "Revenue", "Avg/Job", "Rating"].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5edf5]">
                {report.topDrivers.map((driver, i) => (
                  <tr key={driver.name} className="hover:bg-[#f6f9fc]">
                    <td className="px-6 py-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium ${
                        i === 0 ? "bg-[#fef3c7] text-[#92400e]" :
                        i === 1 ? "bg-[#f3f4f6] text-[#4b5563]" :
                        i === 2 ? "bg-[#ffedd5] text-[#9a3412]" :
                        "bg-[#f6f9fc] text-[#64748d]"
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[13px] font-medium">{driver.name}</td>
                    <td className="px-6 py-3 text-[13px]">{driver.jobs}</td>
                    <td className="px-6 py-3 text-[13px] font-medium">{fmtMoney(driver.revenue)}</td>
                    <td className="px-6 py-3 text-[13px]">{fmtMoney(driver.jobs > 0 ? driver.revenue / driver.jobs : 0)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-medium">{driver.rating}</span>
                        <span className="text-[#f59e0b]">★</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reminders Tab */}
      {activeTab === "reminders" && (
        <div className="space-y-5">
          <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[14px] font-semibold">Upcoming Reminders</div>
              <button className="bg-[#533afd] text-white px-3 py-1.5 rounded text-[12px] font-medium hover:bg-[#4434d4]">
                + Add Reminder
              </button>
            </div>
            <div className="space-y-3">
              {report.reminders.map(reminder => (
                <div key={reminder.id} className={`flex items-center gap-4 p-3 rounded-lg border ${
                  reminder.priority === "high" ? "border-[#fecaca] bg-[#fef2f2]" :
                  reminder.priority === "medium" ? "border-[#fde68a] bg-[#fef3c7]" :
                  "border-[#e5edf5] bg-white"
                }`}>
                  <span className="text-[20px]">
                    {reminder.type === "maintenance" ? "🔧" :
                     reminder.type === "document" ? "📋" :
                     reminder.type === "payment" ? "💰" : "🔔"}
                  </span>
                  <div className="flex-1">
                    <div className="text-[13px] font-medium">{reminder.title}</div>
                    <div className="text-[11px] text-[#64748d]">Due: {reminder.dueDate}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                    reminder.priority === "high" ? "bg-[#fef2f2] text-[#991b1b]" :
                    reminder.priority === "medium" ? "bg-[#fef3c7] text-[#92400e]" :
                    "bg-[#f6f9fc] text-[#64748d]"
                  }`}>
                    {reminder.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-5 max-w-[600px]">
          <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
            <div className="text-[14px] font-semibold mb-4">📱 Telegram Report Notifications</div>
            <p className="text-[13px] text-[#64748d] mb-4">Receive automated reports directly in Telegram</p>

            <div className="space-y-4">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium">Enable Telegram Reports</div>
                  <div className="text-[11px] text-[#64748d]">Get reports delivered to your Telegram chat</div>
                </div>
                <button
                  onClick={() => setTelegramEnabled(!telegramEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${telegramEnabled ? "bg-[#533afd]" : "bg-[#e5edf5]"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${telegramEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Chat ID */}
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Telegram Chat ID</label>
                <input
                  value={telegramChatId}
                  onChange={e => setTelegramChatId(e.target.value)}
                  placeholder="e.g. 7373968482"
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                />
                <div className="text-[11px] text-[#94a3b8] mt-1">
                  Send /start to your bot, then copy the chat ID from the bot response
                </div>
              </div>

              {/* Report Frequency */}
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-2">Report Frequency</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: "daily", label: "Daily" },
                    { id: "weekly", label: "Weekly" },
                    { id: "monthly", label: "Monthly" },
                    { id: "yearly", label: "Yearly" },
                  ].map(freq => (
                    <button
                      key={freq.id}
                      onClick={() => setReportFrequency(prev =>
                        prev.includes(freq.id)
                          ? prev.filter(f => f !== freq.id)
                          : [...prev, freq.id]
                      )}
                      className={`px-3 py-1.5 rounded text-[12px] font-medium border transition-colors ${
                        reportFrequency.includes(freq.id)
                          ? "bg-[#533afd] text-white border-[#533afd]"
                          : "bg-white border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                onClick={saveTelegramSettings}
                disabled={saving}
                className="w-full bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4] disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          {/* In-App Notifications */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
            <div className="text-[14px] font-semibold mb-4">🔔 In-App Notifications</div>
            <div className="space-y-3">
              {[
                { label: "New lead notifications", desc: "Get notified when new leads come in" },
                { label: "Job status updates", desc: "When jobs change status (assigned, completed, etc.)" },
                { label: "Payment received", desc: "When customers pay invoices" },
                { label: "Document expiry alerts", desc: "CDL, insurance, medical card reminders" },
                { label: "Daily summary", desc: "End-of-day summary of all activity" },
              ].map(notif => (
                <div key={notif.label} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-[13px] font-medium">{notif.label}</div>
                    <div className="text-[11px] text-[#64748d]">{notif.desc}</div>
                  </div>
                  <button className="w-10 h-5 bg-[#533afd] rounded-full">
                    <div className="w-4 h-4 bg-white rounded-full shadow translate-x-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data for demo
function generateMockReport(): ReportData {
  return {
    period: "monthly",
    revenue: 28450,
    expenses: 12380,
    profit: 16070,
    jobsCompleted: 47,
    avgJobValue: 605,
    topDrivers: [
      { name: "Marcus Johnson", jobs: 18, revenue: 11200, rating: 4.9 },
      { name: "David Chen", jobs: 15, revenue: 9800, rating: 4.8 },
      { name: "Carlos Rivera", jobs: 14, revenue: 7450, rating: 4.7 },
    ],
    expenseBreakdown: [
      { category: "Fuel", amount: 4200, percent: 34 },
      { category: "Insurance", amount: 2800, percent: 23 },
      { category: "Maintenance", amount: 2100, percent: 17 },
      { category: "Phone/Internet", amount: 1200, percent: 10 },
      { category: "Marketing", amount: 1080, percent: 9 },
      { category: "Other", amount: 1000, percent: 7 },
    ],
    revenueByDay: Array.from({ length: 30 }, (_, i) => ({
      date: `${i + 1}`,
      amount: Math.floor(300 + Math.random() * 1500),
    })),
    reminders: [
      { id: "1", title: "Marcus Johnson CDL expires in 7 days", dueDate: "Aug 7, 2026", type: "document", priority: "high" },
      { id: "2", title: "Truck #3 oil change overdue", dueDate: "Aug 2, 2026", type: "maintenance", priority: "high" },
      { id: "3", title: "Insurance renewal - Fleet policy", dueDate: "Aug 15, 2026", type: "document", priority: "medium" },
      { id: "4", title: "David Chen medical card renewal", dueDate: "Aug 20, 2026", type: "document", priority: "medium" },
      { id: "5", title: "Quarterly tax payment", dueDate: "Sep 15, 2026", type: "payment", priority: "low" },
    ],
  };
}