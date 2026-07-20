"use client";

import { useState, useEffect } from "react";

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: "draft" | "scheduled" | "sent" | "paused";
  audience: string;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  clickedCount: number;
  scheduledAt?: string;
  sentAt?: string;
}

const TEMPLATES = [
  { name: "🌧️ Storm Special", message: "Storm coming! Book your tow now and save 10%. Call {phone} or visit {website}. Reply STOP to opt out." },
  { name: "🎉 Loyalty Discount", message: "Thanks for being a valued customer! Here's 15% off your next tow. Use code LOYAL15. Reply STOP to opt out." },
  { name: "🔧 Maintenance Reminder", message: "Hi {name}! Time for your vehicle's annual inspection. We offer convenient scheduling. Call {phone}. Reply STOP to opt out." },
  { name: "📱 App Download", message: "Download the TowHub app for faster service! Track your tow in real-time. Download: {website}. Reply STOP to opt out." },
  { name: "⭐ Review Request", message: "Hi {name}! How was your recent tow experience? We'd love your feedback: {review_link}. Reply STOP to opt out." },
];

export default function SmsMarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [audience, setAudience] = useState("all");
  const [message, setMessage] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    // Mock campaigns
    setCampaigns([
      { id: "c1", name: "🌧️ Storm Alert - Dallas", message: "Storm coming to Dallas!...", status: "sent", audience: "Dallas customers", recipientCount: 234, sentCount: 234, deliveredCount: 228, clickedCount: 45, sentAt: "2026-07-18T10:00:00" },
      { id: "c2", name: "🎉 Summer Loyalty", message: "Thanks for being a valued...", status: "sent", audience: "Repeat customers", recipientCount: 156, sentCount: 156, deliveredCount: 152, clickedCount: 31, sentAt: "2026-07-15T09:00:00" },
      { id: "c3", name: "⭐ Review Request", message: "How was your recent tow...", status: "scheduled", audience: "Completed jobs (7d)", recipientCount: 89, sentCount: 0, deliveredCount: 0, clickedCount: 0, scheduledAt: "2026-07-22T10:00:00" },
    ]);
  }, []);

  const totalSent = campaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalDelivered = campaigns.reduce((s, c) => s + c.deliveredCount, 0);
  const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent * 100) : 0;

  const useTemplate = (msg: string) => {
    setMessage(msg);
    setCharCount(msg.length);
  };

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">SMS Marketing</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Send targeted SMS campaigns to your customers</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">+ New Campaign</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: totalSent, accent: "#061b31" },
          { label: "Delivered", value: totalDelivered, accent: "#15be53" },
          { label: "Delivery Rate", value: `${deliveryRate.toFixed(1)}%`, accent: "#533afd" },
          { label: "Campaigns", value: campaigns.length, accent: "#061b31" },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-[28px] font-light tracking-[-0.5px]" style={{ color: s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Audience segments */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
        <div className="text-[14px] font-medium text-[#061b31] mb-3">🎯 Audience Segments</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: "all", label: "🌍 All Customers", count: 450 },
            { id: "repeat", label: "🔄 Repeat Customers", count: 156 },
            { id: "recent", label: "📅 Last 30 Days", count: 89 },
            { id: "inactive", label: "💤 Inactive (90+ days)", count: 205 },
            { id: "vip", label: "⭐ VIP Customers", count: 34 },
            { id: "area", label: "📍 By Service Area", count: 0 },
            { id: "leads", label: "🔗 Leads (not converted)", count: 67 },
            { id: "drivers", label: "🚛 Drivers Only", count: 12 },
          ].map(s => (
            <button key={s.id} onClick={() => setAudience(s.id)}
              className={`p-3 rounded-lg border text-left transition-colors ${audience === s.id ? "border-[#533afd] bg-[#533afd]/[0.04]" : "border-[#e5edf5] hover:border-[#b9b9f9]"}`}>
              <div className="text-[12px] font-medium text-[#061b31]">{s.label}</div>
              <div className="text-[11px] text-[#64748d]">{s.count > 0 ? `${s.count} contacts` : "Select area"}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Campaign history */}
      <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#e5edf5]">
          <div className="text-[13px] font-medium text-[#061b31]">Campaign History</div>
        </div>
        <table className="w-full">
          <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
            <tr>{["Campaign", "Audience", "Status", "Sent", "Delivered", "Clicks", "Date"].map(h =>
              <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
            )}</tr>
          </thead>
          <tbody className="divide-y divide-[#e5edf5]">
            {campaigns.map(c => (
              <tr key={c.id} className="hover:bg-[#f6f9fc]">
                <td className="px-4 py-3 text-[13px] font-medium">{c.name}</td>
                <td className="px-4 py-3 text-[12px] text-[#64748d]">{c.audience}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${c.status === "sent" ? "bg-[#dcfce7] text-[#166534]" : c.status === "scheduled" ? "bg-[#dbeafe] text-[#1e40af]" : "bg-[#f6f9fc] text-[#64748d]"}`}>{c.status}</span></td>
                <td className="px-4 py-3 text-[13px]">{c.sentCount}</td>
                <td className="px-4 py-3 text-[13px]">{c.deliveredCount} <span className="text-[10px] text-[#94a3b8]">({c.sentCount > 0 ? (c.deliveredCount / c.sentCount * 100).toFixed(0) : 0}%)</span></td>
                <td className="px-4 py-3 text-[13px]">{c.clickedCount}</td>
                <td className="px-4 py-3 text-[12px] text-[#64748d]">{c.sentAt ? new Date(c.sentAt).toLocaleDateString() : c.scheduledAt ? `Scheduled: ${new Date(c.scheduledAt).toLocaleDateString()}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[18px] font-semibold tracking-[-0.3px] mb-5">Create SMS Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Campaign Name</label>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Storm Alert - Dallas"
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Message</label>
                <textarea value={message} onChange={e => { setMessage(e.target.value); setCharCount(e.target.value.length); }} rows={4} maxLength={160}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none resize-none" />
                <div className="flex justify-between text-[10px] text-[#94a3b8] mt-1">
                  <span>Use {'{name}'}, {'{phone}'}, {'{website}'} for personalization</span>
                  <span>{charCount}/160</span>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Quick Templates</label>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATES.map(t => (
                    <button key={t.name} onClick={() => useTemplate(t.message)}
                      className="px-2.5 py-1 rounded text-[11px] font-medium border border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]">
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Schedule (optional)</label>
                <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium">Cancel</button>
                <button className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium">
                  {scheduleDate ? "Schedule" : "Send Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
