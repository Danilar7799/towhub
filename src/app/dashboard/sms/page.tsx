"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/lib/toast";

/*
 * SMS Campaigns — bulk SMS to customers
 * Use cases: appointment reminders, marketing, follow-ups
 * Design: Stripe tokens
 */

interface Customer {
  id: string; name: string; phone?: string; email?: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  recipients: number;
  sent: number;
  status: "draft" | "sending" | "completed" | "failed";
  createdAt: string;
}

export default function SmsPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);

  // Compose form
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/customers").then(r => r.json()).then(d => setCustomers(d.customers || []));
  }, []);

  const filtered = customers.filter(c => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.phone?.includes(searchQuery)) return false;
    return true;
  });

  const toggleCustomer = (id: string) => {
    setSelectedCustomers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => setSelectedCustomers(filtered.map(c => c.id));
  const deselectAll = () => setSelectedCustomers([]);

  const sendCampaign = async () => {
    if (!message.trim() || selectedCustomers.length === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/sms/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
          message,
          recipientIds: selectedCustomers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sent to ${data.sent} customers`);
        setShowCompose(false);
        setCampaignName("");
        setMessage("");
        setSelectedCustomers([]);
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Network error");
    }
    setSending(false);
  };

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">💬 SMS Campaigns</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Send bulk SMS to customers — reminders, follow-ups, marketing</p>
        </div>
        <button onClick={() => setShowCompose(true)} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium hover:bg-[#4434d4] shadow-[0_2px_8px_rgba(83,58,253,0.2)] press-active">
          ✉️ New Campaign
        </button>
      </div>

      {/* Quick Templates */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Appointment Reminder", icon: "📅", template: "Hi {name}, this is a reminder about your tow scheduled for tomorrow. Reply CONFIRM to confirm or call us to reschedule." },
          { label: "Follow-up", icon: "👋", template: "Hi {name}, thank you for choosing Pacific Towing! How was your experience? We'd love your feedback." },
          { label: "Promo", icon: "🎉", template: "Hi {name}! Pacific Towing is offering 10% off your next tow. Use code TOW10. Valid through end of month." },
        ].map(t => (
          <button
            key={t.label}
            onClick={() => { setMessage(t.template); setShowCompose(true); }}
            className="bg-white border border-[#e5edf5] rounded-lg p-4 text-left hover:border-[#b9b9f9] card-hover"
          >
            <span className="text-[20px]">{t.icon}</span>
            <div className="text-[13px] font-medium text-[#061b31] mt-2">{t.label}</div>
            <div className="text-[11px] text-[#64748d] mt-1 line-clamp-2">{t.template.slice(0, 80)}...</div>
          </button>
        ))}
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e5edf5] bg-[#f6f9fc]">
          <span className="text-[14px] font-semibold">Recent Campaigns</span>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[32px] mb-3 opacity-20">💬</div>
            <div className="text-[14px] font-medium text-[#061b31] mb-1">No campaigns yet</div>
            <div className="text-[12px] text-[#64748d]">Create your first SMS campaign to reach customers</div>
          </div>
        ) : (
          <div className="divide-y divide-[#e5edf5]">
            {campaigns.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium">{c.name}</div>
                  <div className="text-[11px] text-[#64748d]">{c.sent}/{c.recipients} sent • {new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
                <span className={`badge ${c.status === "completed" ? "badge-success" : c.status === "sending" ? "badge-warning" : "badge-neutral"}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCompose(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#e5edf5] flex items-center justify-between">
              <h2 className="text-[18px] font-semibold">New SMS Campaign</h2>
              <button onClick={() => setShowCompose(false)} className="text-[18px] text-[#64748d] hover:text-[#061b31]">×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Campaign name */}
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Campaign Name</label>
                <input
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  placeholder="e.g. Weekly Reminder"
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd]"
                />
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-medium text-[#273951]">Message *</label>
                  <span className="text-[11px] text-[#94a3b8] tabular-nums">{charCount}/160 ({smsCount} SMS)</span>
                </div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message... Use {name} for customer name"
                  rows={4}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none resize-none focus:border-[#533afd]"
                />
                <div className="text-[10px] text-[#94a3b8] mt-1">{"{name}"} = customer name, {"{phone}"} = phone number</div>
              </div>

              {/* Recipients */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] font-medium text-[#273951]">Recipients ({selectedCustomers.length} selected)</label>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-[11px] text-[#533afd] hover:underline">Select All</button>
                    <button onClick={deselectAll} className="text-[11px] text-[#94a3b8] hover:underline">Clear</button>
                  </div>
                </div>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[12px] outline-none focus:border-[#533afd] mb-2"
                />
                <div className="max-h-[200px] overflow-y-auto border border-[#e5edf5] rounded divide-y divide-[#e5edf5]">
                  {filtered.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#f6f9fc] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                        className="accent-[#533afd]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#061b31] truncate">{c.name}</div>
                        <div className="text-[11px] text-[#64748d]">{c.phone || "No phone"}</div>
                      </div>
                    </label>
                  ))}
                  {filtered.length === 0 && <div className="p-4 text-center text-[12px] text-[#94a3b8]">No customers found</div>}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[#e5edf5] flex items-center justify-between">
              <div className="text-[12px] text-[#64748d]">
                Est. cost: <span className="font-medium tabular-nums">${(selectedCustomers.length * smsCount * 0.0079).toFixed(2)}</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCompose(false)} className="px-4 py-2 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
                <button
                  onClick={sendCampaign}
                  disabled={sending || !message.trim() || selectedCustomers.length === 0}
                  className="px-6 py-2 bg-[#533afd] text-white rounded text-[13px] font-medium hover:bg-[#4434d4] disabled:opacity-50 press-active"
                >
                  {sending ? "Sending..." : `Send to ${selectedCustomers.length}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}