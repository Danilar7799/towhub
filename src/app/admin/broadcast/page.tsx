"use client";

import { useState, useEffect } from "react";

interface TargetingStats {
  usersByRole: { role: string; count: number }[];
  orgsByState: { state: string; count: number }[];
  orgsByCity: { city: string; state: string; count: number }[];
  totalUsers: number;
}

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function BroadcastPage() {
  const [stats, setStats] = useState<TargetingStats | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; message?: string; recipientCount?: number } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"system" | "promo" | "update" | "warning">("system");
  const [link, setLink] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [targetMode, setTargetMode] = useState<"all" | "role" | "city" | "state" | "company" | "specific">("all");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/broadcast?action=stats").then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const estimatedRecipients = (): number => {
    if (!stats) return 0;
    switch (targetMode) {
      case "all": return stats.totalUsers;
      case "role": return stats.usersByRole.filter(r => selectedRoles.includes(r.role)).reduce((s, r) => s + r.count, 0);
      case "state": return stats.orgsByState.filter(o => selectedStates.includes(o.state)).reduce((s, o) => s + o.count, 0) * 2; // ~2 users per org
      case "city": return stats.orgsByCity.filter(o => selectedCities.includes(o.city)).reduce((s, o) => s + o.count, 0) * 2;
      default: return 0;
    }
  };

  const sendBroadcast = async () => {
    if (!title || !message) return;
    setSending(true);
    setResult(null);

    try {
      const targeting: Record<string, unknown> = { mode: targetMode };
      if (targetMode === "role") targeting.roles = selectedRoles;
      if (targetMode === "state") targeting.states = selectedStates;
      if (targetMode === "city") targeting.cities = selectedCities;

      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, type, link: link || undefined, targeting, priority }),
      });
      const data = await res.json();
      setResult(data);
      if (data.ok) {
        setTitle("");
        setMessage("");
        setLink("");
      }
    } catch {
      setResult({ message: "Network error" });
    } finally {
      setSending(false);
    }
  };

  const toggleRole = (role: string) => setSelectedRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role]);
  const toggleState = (st: string) => setSelectedStates(s => s.includes(st) ? s.filter(x => x !== st) : [...s, st]);
  const toggleCity = (city: string) => setSelectedCities(c => c.includes(city) ? c.filter(x => x !== city) : [...c, city]);

  const TYPE_OPTIONS = [
    { value: "system", label: "⚙️ System", desc: "Platform updates, maintenance" },
    { value: "promo", label: "⭐ Promo", desc: "Feature announcements, offers" },
    { value: "update", label: "📱 Update", desc: "App updates, new features" },
    { value: "warning", label: "⚠️ Warning", desc: "Important alerts, outages" },
  ];

  const PRIORITY_OPTIONS = [
    { value: "low", label: "Low", color: "bg-[#f6f9fc] text-[#64748d]" },
    { value: "medium", label: "Medium", color: "bg-[#dbeafe] text-[#1e40af]" },
    { value: "high", label: "High", color: "bg-[#fef3c7] text-[#92400e]" },
    { value: "urgent", label: "Urgent", color: "bg-[#fef2f2] text-[#991b1b]" },
  ];

  return (
    <div className="space-y-6" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">📢 Broadcast Notifications</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Send targeted notifications to companies and users</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Compose */}
        <div className="lg:col-span-2 space-y-5">
          {/* Message */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[14px] font-medium text-[#061b31] mb-4">Compose Message</div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New Feature: Auction Aggregator" maxLength={100}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                <div className="text-[10px] text-[#94a3b8] mt-1">{title.length}/100</div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Message *</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder="Describe the update, announcement, or promotion..." maxLength={500}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none resize-none" />
                <div className="text-[10px] text-[#94a3b8] mt-1">{message.length}/500</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Type</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TYPE_OPTIONS.map(t => (
                      <button key={t.value} onClick={() => setType(t.value as typeof type)}
                        className={`p-2 rounded border text-left transition-colors ${type === t.value ? "border-[#533afd] bg-[#533afd]/[0.04]" : "border-[#e5edf5] hover:border-[#b9b9f9]"}`}>
                        <div className="text-[11px] font-medium">{t.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Priority</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRIORITY_OPTIONS.map(p => (
                      <button key={p.value} onClick={() => setPriority(p.value as typeof priority)}
                        className={`p-2 rounded border text-[11px] font-medium text-center transition-colors ${priority === p.value ? p.color + " border-current" : "border-[#e5edf5] text-[#64748d]"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Link (optional)</label>
                <input value={link} onChange={e => setLink(e.target.value)} placeholder="/dashboard/auctions"
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[14px] font-medium text-[#061b31] mb-1">🎯 Target Audience</div>
            <div className="text-[12px] text-[#64748d] mb-4">Choose who receives this notification</div>

            {/* Target mode selector */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { mode: "all" as const, label: "🌍 Everyone", desc: "All users" },
                { mode: "role" as const, label: "👤 By Role", desc: "Owners, drivers..." },
                { mode: "state" as const, label: "📍 By State", desc: "Specific states" },
                { mode: "city" as const, label: "🏙️ By City", desc: "Specific cities" },
                { mode: "company" as const, label: "🏢 By Company", desc: "Specific orgs" },
                { mode: "specific" as const, label: "🎯 Specific Users", desc: "Individual users" },
              ].map(t => (
                <button key={t.mode} onClick={() => setTargetMode(t.mode)}
                  className={`p-3 rounded-lg border text-left transition-colors ${targetMode === t.mode ? "border-[#533afd] bg-[#533afd]/[0.04]" : "border-[#e5edf5] hover:border-[#b9b9f9]"}`}>
                  <div className="text-[12px] font-medium text-[#061b31]">{t.label}</div>
                  <div className="text-[10px] text-[#64748d]">{t.desc}</div>
                </button>
              ))}
            </div>

            {/* Role targeting */}
            {targetMode === "role" && (
              <div className="space-y-2">
                <div className="text-[12px] font-medium text-[#273951] mb-2">Select roles:</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { role: "owner", label: "👔 Owners", count: stats?.usersByRole.find(r => r.role === "owner")?.count || 0 },
                    { role: "admin", label: "🔑 Admins", count: stats?.usersByRole.find(r => r.role === "admin")?.count || 0 },
                    { role: "dispatcher", label: "📞 Dispatchers", count: stats?.usersByRole.find(r => r.role === "dispatcher")?.count || 0 },
                    { role: "driver", label: "🚛 Drivers", count: stats?.usersByRole.find(r => r.role === "driver")?.count || 0 },
                  ].map(r => (
                    <button key={r.role} onClick={() => toggleRole(r.role)}
                      className={`px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors ${selectedRoles.includes(r.role) ? "border-[#533afd] bg-[#533afd]/[0.06] text-[#533afd]" : "border-[#e5edf5] text-[#64748d]"}`}>
                      {r.label} ({r.count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* State targeting */}
            {targetMode === "state" && (
              <div className="space-y-2">
                <div className="text-[12px] font-medium text-[#273951] mb-2">Select states ({selectedStates.length} selected):</div>
                <div className="flex flex-wrap gap-1.5 max-h-[200px] overflow-y-auto">
                  {US_STATES.map(st => {
                    const orgCount = stats?.orgsByState.find(o => o.state === st)?.count || 0;
                    return (
                      <button key={st} onClick={() => toggleState(st)}
                        className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${selectedStates.includes(st) ? "border-[#533afd] bg-[#533afd]/[0.06] text-[#533afd]" : "border-[#e5edf5] text-[#64748d]"}`}>
                        {st} {orgCount > 0 && `(${orgCount})`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* City targeting */}
            {targetMode === "city" && stats && (
              <div className="space-y-2">
                <div className="text-[12px] font-medium text-[#273951] mb-2">Select cities:</div>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {stats.orgsByCity.filter(o => o.city).map(o => (
                    <button key={o.city} onClick={() => toggleCity(o.city)}
                      className={`w-full px-3 py-2 rounded border text-left text-[12px] transition-colors ${selectedCities.includes(o.city) ? "border-[#533afd] bg-[#533afd]/[0.04]" : "border-[#e5edf5] hover:border-[#b9b9f9]"}`}>
                      <span className="font-medium">{o.city}</span>, {o.state} <span className="text-[#94a3b8]">({o.count} companies)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All mode */}
            {targetMode === "all" && (
              <div className="p-4 bg-[#f6f9fc] rounded-lg text-center">
                <div className="text-[24px] mb-2">🌍</div>
                <div className="text-[13px] font-medium text-[#061b31]">All {stats?.totalUsers || "..."} users</div>
                <div className="text-[11px] text-[#64748d]">This notification will be sent to every registered user</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview + Send */}
        <div className="space-y-5">
          {/* Preview */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[13px] font-medium text-[#061b31] mb-3">📱 Preview</div>
            <div className="border border-[#e5edf5] rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] shrink-0 ${
                  type === "system" ? "bg-[#f6f9fc] text-[#64748d]" :
                  type === "promo" ? "bg-[#fef3c7] text-[#92400e]" :
                  type === "update" ? "bg-[#f3e8ff] text-[#6b21a8]" :
                  "bg-[#fef2f2] text-[#991b1b]"
                }`}>
                  {type === "system" ? "⚙️" : type === "promo" ? "⭐" : type === "update" ? "📱" : "⚠️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold text-[#061b31]">{title || "Notification Title"}</div>
                    <div className="w-1.5 h-1.5 bg-[#533afd] rounded-full" />
                  </div>
                  <div className="text-[12px] text-[#64748d] mt-0.5">{message || "Notification message will appear here..."}</div>
                  {link && <div className="text-[11px] text-[#533afd] mt-1">🔗 {link}</div>}
                  <div className="text-[10px] text-[#94a3b8] mt-1">Just now</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[13px] font-medium text-[#061b31] mb-3">📊 Delivery Stats</div>
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748d]">Recipients</span>
                <span className="font-semibold text-[#533afd]">{estimatedRecipients()}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748d]">Targeting</span>
                <span className="capitalize">{targetMode}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748d]">Priority</span>
                <span className="capitalize">{priority}</span>
              </div>
            </div>
          </div>

          {/* Send button */}
          <button onClick={sendBroadcast} disabled={!title || !message || sending || estimatedRecipients() === 0}
            className="w-full bg-[#533afd] text-white py-3 rounded-lg text-[14px] font-semibold hover:bg-[#4434d4] disabled:opacity-40 transition-colors shadow-[0_4px_16px_rgba(83,58,253,0.3)]">
            {sending ? "Sending..." : `🚀 Send to ${estimatedRecipients()} users`}
          </button>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border ${result.ok ? "bg-[#dcfce7] border-[#bbf7d0]" : "bg-[#fef2f2] border-[#fecaca]"}`}>
              <div className={`text-[13px] font-medium ${result.ok ? "text-[#166534]" : "text-[#991b1b]"}`}>
                {result.ok ? `✅ ${result.message}` : `❌ ${result.message}`}
              </div>
              {result.ok && result.recipientCount && (
                <div className="text-[12px] text-[#166534] mt-1">Delivered to {result.recipientCount} users</div>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[11px] font-medium text-[#273951] mb-2">💡 Tips</div>
            <div className="text-[10px] text-[#64748d] space-y-1">
              <p>• Keep titles short and action-oriented</p>
              <p>• Use "Urgent" priority sparingly</p>
              <p>• Link to relevant page for best engagement</p>
              <p>• Target by role for relevant messages</p>
              <p>• Drivers see fewer notifications — keep it useful</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
