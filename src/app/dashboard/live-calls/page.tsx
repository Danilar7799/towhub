"use client";

import { useState, useEffect, useRef } from "react";

interface ActiveCall {
  id: string;
  callerPhone: string;
  callerName?: string;
  status: "ringing" | "in_progress" | "completed" | "missed";
  startedAt: string;
  duration: number;
  transcript: Array<{ speaker: "ai" | "caller"; text: string; timestamp: string }>;
  summary?: string;
  callType?: string;
  serviceNeeded?: string;
  pickupAddress?: string;
  vehicleInfo?: string;
  urgency?: string;
}

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  notifyUsers: string[]; // user IDs
  notifyRoles: string[]; // "owner", "dispatcher", "admin"
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};

export default function LiveCallMonitorPage() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [recentCalls, setRecentCalls] = useState<ActiveCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<ActiveCall | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: true,
    soundEnabled: true,
    notifyUsers: [],
    notifyRoles: ["owner", "dispatcher"],
  });
  const [showSettings, setShowSettings] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; role: string }>>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const triggerNotification = (call: ActiveCall) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("📞 Incoming Call", {
        body: `${call.callerName || call.callerPhone} is calling`,
        icon: "/favicon.ico",
        tag: `call-${call.id}`,
      });
    }
    if (notificationSettings.soundEnabled) {
      try {
        const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVggoKIc2BXZHyhoaRzTzVAY3yDeHBdTl57iYiDeXFhUVx4h4iEeXRgVV17hYeGenZgUlx6hIiGeXZhUV17hIaFeXVhUVx6hIaGenVhUVx7hIaGenVhUVx7hIaGenVhUVx7hIaGenVhUVx7hIaGenVhUVx7hIaGenVhUVx7hIaGenVhUVx7hA==");
        audio.play().catch(() => {});
      } catch {}
    }
  };

  // Poll for active calls every 3 seconds
  useEffect(() => {
    const load = async () => {
      try {
        const [callsRes, usersRes] = await Promise.all([
          fetch("/api/calls?active=true"),
          fetch("/api/users"),
        ]);
        const callsData = await callsRes.json();
        const usersData = await usersRes.json();

        const active = (callsData.calls || []).filter((c: ActiveCall) => c.status === "ringing" || c.status === "in_progress");
        const recent = (callsData.calls || []).filter((c: ActiveCall) => c.status === "completed" || c.status === "missed").slice(0, 10);

        // Check for new calls and trigger notification
        if (active.length > activeCalls.length && notificationSettings.enabled) {
          triggerNotification(active[active.length - 1]);
        }

        setActiveCalls(active);
        setRecentCalls(recent);
        setUsers(usersData.users || []);
      } catch (e) {}
    };

    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [selectedCall?.transcript]);


  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("✅ Notifications Enabled", {
          body: "You will be notified when calls come in",
        });
      }
    }
  };

  const saveNotificationSettings = async () => {
    await fetch("/api/notifications/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notificationSettings),
    });
    setShowSettings(false);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ringing": return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
      case "in_progress": return { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" };
      case "completed": return { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" };
      case "missed": return { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" };
      default: return { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" };
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Live Call Monitor</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">
            Real-time call monitoring and transcript
            {activeCalls.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-[#15be53] rounded-full animate-pulse"></span>
                <span className="text-[#15be53] font-medium">{activeCalls.length} active call{activeCalls.length > 1 ? "s" : ""}</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={requestNotificationPermission}
            className="px-3 py-2 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc] transition-colors flex items-center gap-2"
          >
            🔔 Enable Notifications
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc] transition-colors flex items-center gap-2"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left: Call List */}
        <div className="w-[320px] flex flex-col shrink-0">
          {/* Active Calls */}
          <div className="mb-4">
            <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Active Calls</div>
            {activeCalls.length === 0 ? (
              <div className="bg-white border border-[#e5edf5] rounded-lg p-6 text-center">
                <div className="text-[24px] mb-2 opacity-30">📞</div>
                <div className="text-[13px] text-[#64748d]">No active calls</div>
              </div>
            ) : (
              <div className="space-y-2">
                {activeCalls.map(call => {
                                const s = statusColor(call.status);
                                const copyCallInfo = () => {
                                  const info = `Call: ${call.id}\nCaller: ${call.callerName || call.callerPhone}\nPhone: ${call.callerPhone}\nStatus: ${call.status}\nDuration: ${formatDuration(call.duration)}\nType: ${call.callType || "N/A"}\nService: ${call.serviceNeeded || "N/A"}\nLocation: ${call.pickupAddress || "N/A"}\nVehicle: ${call.vehicleInfo || "N/A"}\nUrgency: ${call.urgency || "N/A"}\nStarted: ${new Date(call.startedAt).toLocaleString()}`;
                                  copyToClipboard(info);
                                };
                                return (
                                  <div
                                    key={call.id}
                                    onClick={() => setSelectedCall(call)}
                                    className={`bg-white border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                                      selectedCall?.id === call.id ? "border-[#533afd] shadow-[0_4px_12px_rgba(83,58,253,0.1)]" : "border-[#e5edf5]"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[14px] font-medium text-[#061b31] truncate">{call.callerName || "Unknown"}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>
                                          {call.status === "ringing" ? "🔔 Ringing" : "🟢 Live"}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); copyCallInfo(); }}
                                        className="text-[9px] px-2 py-1 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#ea2261] transition-colors whitespace-nowrap"
                                        title="Copy call info"
                                      >
                                        📋
                                      </button>
                                    </div>
                                    <div className="text-[12px] text-[#64748d]">{call.callerPhone}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[11px] text-[#94a3b8]">{formatDuration(call.duration)}</span>
                                      {call.urgency && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                          call.urgency === "emergency" ? "bg-[#fef2f2] text-[#991b1b]" :
                                          call.urgency === "high" ? "bg-[#fef3c7] text-[#92400e]" :
                                          "bg-[#f3f4f6] text-[#4b5563]"
                                        }`}>
                                          {call.urgency}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
              </div>
            )}
          </div>

          {/* Recent Calls */}
          <div className="flex-1 overflow-y-auto">
            <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Recent Calls</div>
            <div className="space-y-2">
              {recentCalls.map(call => {
                const s = statusColor(call.status);
                const copyCallInfo = () => {
                  const info = `Call: ${call.id}\nCaller: ${call.callerName || call.callerPhone}\nPhone: ${call.callerPhone}\nStatus: ${call.status}\nDuration: ${formatDuration(call.duration)}\nType: ${call.callType || "N/A"}\nService: ${call.serviceNeeded || "N/A"}\nLocation: ${call.pickupAddress || "N/A"}\nVehicle: ${call.vehicleInfo || "N/A"}\nUrgency: ${call.urgency || "N/A"}\nStarted: ${new Date(call.startedAt).toLocaleString()}`;
                  copyToClipboard(info);
                };
                return (
                  <div
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className={`bg-white border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                      selectedCall?.id === call.id ? "border-[#533afd]" : "border-[#e5edf5]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium">{call.callerName || "Unknown"}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${s.bg} ${s.text}`}>{call.status}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyCallInfo(); }}
                        className="text-[9px] px-2 py-1 bg-[#f6f9fc] border border-[#e5edf5] rounded hover:bg-[#eef3f8] text-[#ea2261] transition-colors whitespace-nowrap"
                        title="Copy call info"
                      >
                        📋
                      </button>
                    </div>
                    <div className="text-[11px] text-[#64748d] flex items-center gap-2">
                      <span>{call.callerPhone} • {formatDuration(call.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Call Detail / Transcript */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedCall ? (
            <div className="flex-1 flex items-center justify-center bg-white border border-[#e5edf5] rounded-lg">
              <div className="text-center">
                <div className="text-[48px] mb-4 opacity-20">🎙️</div>
                <div className="text-[16px] font-medium text-[#64748d]">Select a call to view details</div>
                <div className="text-[13px] text-[#94a3b8] mt-1">Active calls update in real-time</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
              {/* Call Header */}
              <div className="px-5 py-4 border-b border-[#e5edf5]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] font-semibold">{selectedCall.callerName || "Unknown Caller"}</span>
                      {selectedCall.status === "in_progress" && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-[#dcfce7] text-[#166534] rounded text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 bg-[#15be53] rounded-full animate-pulse"></span>
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-[#64748d] mt-0.5">{selectedCall.callerPhone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[20px] font-light">{formatDuration(selectedCall.duration)}</div>
                    <div className="text-[11px] text-[#64748d]">
                      {new Date(selectedCall.startedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Extracted Data */}
                {(selectedCall.callType || selectedCall.serviceNeeded || selectedCall.pickupAddress || selectedCall.vehicleInfo) && (
                  <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {selectedCall.callType && (
                      <div className="bg-[#f6f9fc] rounded p-2">
                        <div className="text-[10px] text-[#64748d] uppercase">Type</div>
                        <div className="text-[12px] font-medium">{selectedCall.callType}</div>
                      </div>
                    )}
                    {selectedCall.serviceNeeded && (
                      <div className="bg-[#f6f9fc] rounded p-2">
                        <div className="text-[10px] text-[#64748d] uppercase">Service</div>
                        <div className="text-[12px] font-medium">{selectedCall.serviceNeeded}</div>
                      </div>
                    )}
                    {selectedCall.pickupAddress && (
                      <div className="bg-[#f6f9fc] rounded p-2">
                        <div className="text-[10px] text-[#64748d] uppercase">Location</div>
                        <div className="text-[12px] font-medium truncate">{selectedCall.pickupAddress}</div>
                      </div>
                    )}
                    {selectedCall.vehicleInfo && (
                      <div className="bg-[#f6f9fc] rounded p-2">
                        <div className="text-[10px] text-[#64748d] uppercase">Vehicle</div>
                        <div className="text-[12px] font-medium">{selectedCall.vehicleInfo}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="flex-1 overflow-y-auto p-5" ref={transcriptRef}>
                {selectedCall.transcript.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-[32px] mb-3 opacity-20">🎙️</div>
                      <div className="text-[14px] text-[#64748d]">
                        {selectedCall.status === "ringing" ? "Waiting for answer..." : "Transcript will appear here"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCall.transcript.map((msg, i) => (
                      <div key={i} className={`flex ${msg.speaker === "ai" ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                          msg.speaker === "ai"
                            ? "bg-[#f6f9fc] border border-[#e5edf5]"
                            : "bg-[#533afd] text-white"
                        }`}>
                          <div className="text-[10px] font-medium mb-1 opacity-70">
                            {msg.speaker === "ai" ? "🤖 AI Dispatcher" : "👤 Caller"}
                          </div>
                          <div className="text-[13px] leading-[1.5]">{msg.text}</div>
                          <div className="text-[10px] mt-1 opacity-50">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary (after call) */}
              {selectedCall.status === "completed" && selectedCall.summary && (
                <div className="px-5 py-4 border-t border-[#e5edf5] bg-[#f6f9fc] flex items-center justify-between">
                  <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">AI Summary</div>
                  <div className="text-[13px] text-[#061b31] leading-[1.6] flex-1">{selectedCall.summary}</div>
                  <button
                    onClick={() => copyToClipboard(selectedCall.summary || "")}
                    className="text-[9px] px-2 py-1 bg-white border border-[#e5edf5] rounded hover:bg-[#f6f9fc] text-[#533afd] ml-4 whitespace-nowrap"
                    title="Copy summary"
                  >
                    📋
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notification Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSettings(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px] mb-1">🔔 Notification Settings</h2>
            <p className="text-[13px] text-[#64748d] mb-6">Configure who receives call notifications</p>

            <div className="space-y-4">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-medium">Enable Notifications</div>
                  <div className="text-[12px] text-[#64748d]">Show alerts when calls come in</div>
                </div>
                <button
                  onClick={() => setNotificationSettings(s => ({ ...s, enabled: !s.enabled }))}
                  className={`w-12 h-6 rounded-full transition-colors ${notificationSettings.enabled ? "bg-[#533afd]" : "bg-[#e5edf5]"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${notificationSettings.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Sound */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-medium">Sound Alerts</div>
                  <div className="text-[12px] text-[#64748d]">Play sound when call comes in</div>
                </div>
                <button
                  onClick={() => setNotificationSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
                  className={`w-12 h-6 rounded-full transition-colors ${notificationSettings.soundEnabled ? "bg-[#533afd]" : "bg-[#e5edf5]"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${notificationSettings.soundEnabled ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Roles */}
              <div>
                <div className="text-[14px] font-medium mb-2">Notify Roles</div>
                <div className="flex gap-2">
                  {["owner", "dispatcher", "admin"].map(role => (
                    <button
                      key={role}
                      onClick={() => setNotificationSettings(s => ({
                        ...s,
                        notifyRoles: s.notifyRoles.includes(role)
                          ? s.notifyRoles.filter(r => r !== role)
                          : [...s.notifyRoles, role]
                      }))}
                      className={`px-3 py-1.5 rounded text-[12px] font-medium border transition-colors ${
                        notificationSettings.notifyRoles.includes(role)
                          ? "bg-[#533afd] text-white border-[#533afd]"
                          : "bg-white border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users */}
              <div>
                <div className="text-[14px] font-medium mb-2">Notify Specific Users</div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {users.map(user => (
                    <label key={user.id} className="flex items-center gap-3 p-2 rounded hover:bg-[#f6f9fc] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.notifyUsers.includes(user.id)}
                        onChange={() => setNotificationSettings(s => ({
                          ...s,
                          notifyUsers: s.notifyUsers.includes(user.id)
                            ? s.notifyUsers.filter(u => u !== user.id)
                            : [...s.notifyUsers, user.id]
                        }))}
                        className="rounded border-[#e5edf5]"
                      />
                      <div>
                        <div className="text-[13px] font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-[11px] text-[#64748d]">{user.role}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t border-[#e5edf5]">
              <button onClick={() => setShowSettings(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
              <button onClick={saveNotificationSettings} className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}