"use client";

import { useState, useEffect } from "react";

interface CallLog {
  id: string;
  callerPhone: string;
  callerName?: string;
  status: string;
  duration: number;
  transcript?: string;
  summary?: string;
  callType?: string;
  serviceNeeded?: string;
  pickupAddress?: string;
  vehicleInfo?: string;
  urgency?: string;
  jobId?: string;
  source?: string; // "ai_dispatcher" | "manual" | "phone"
  notes?: string;
  createdAt: string;
}

interface Job {
  id: string;
  customerName?: string;
  pickupAddress: string;
  status: string;
}

const CALL_TYPES = [
  { value: "roadside", label: "Roadside Assistance", icon: "🚗", color: "#3b82f6" },
  { value: "impound", label: "Impound Inquiry", icon: "🅿️", color: "#f59e0b" },
  { value: "junk_car", label: "Junk Car Removal", icon: "🗑️", color: "#6366f1" },
  { value: "fleet", label: "Fleet/Commercial", icon: "🏢", color: "#8b5cf6" },
  { value: "quote", label: "Price Quote", icon: "💰", color: "#15be53" },
  { value: "complaint", label: "Complaint", icon: "⚠️", color: "#ef4444" },
  { value: "follow_up", label: "Follow Up", icon: "📞", color: "#06b6d4" },
  { value: "other", label: "Other", icon: "📋", color: "#64748d" },
];

const URGENCY_COLORS: Record<string, { bg: string; text: string }> = {
  emergency: { bg: "bg-[#fef2f2]", text: "text-[#991b1b]" },
  high: { bg: "bg-[#fef3c7]", text: "text-[#92400e]" },
  medium: { bg: "bg-[#f6f9fc]", text: "text-[#64748d]" },
  low: { bg: "bg-[#f3f4f6]", text: "text-[#4b5563]" },
};

export default function CallsPage() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [showNewCall, setShowNewCall] = useState(false);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ total: 0, ai: 0, manual: 0, avgDuration: 0 });

  // New call form
  const [newCall, setNewCall] = useState({
    callerPhone: "",
    callerName: "",
    callType: "roadside",
    serviceNeeded: "",
    pickupAddress: "",
    destinationAddress: "",
    vehicleInfo: "",
    urgency: "medium",
    summary: "",
    notes: "",
    jobId: "",
    duration: "",
  });

  const load = async () => {
    const [callsRes, jobsRes] = await Promise.all([
      fetch("/api/calls"),
      fetch("/api/jobs"),
    ]);
    const callsData = await callsRes.json();
    const jobsData = await jobsRes.json();
    setCalls(callsData.calls || []);
    setStats(callsData.stats || {});
    setJobs(jobsData.jobs || []);
  };

  useEffect(() => { load(); }, []);

  const createManualCall = async () => {
    const res = await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: "auto", // Will be resolved by API
        callerPhone: newCall.callerPhone,
        callerName: newCall.callerName,
        status: "completed",
        duration: parseInt(newCall.duration) || 0,
        summary: newCall.summary,
        callType: newCall.callType,
        serviceNeeded: newCall.serviceNeeded,
        pickupAddress: newCall.pickupAddress,
        vehicleInfo: newCall.vehicleInfo,
        urgency: newCall.urgency,
        notes: newCall.notes,
        jobId: newCall.jobId || undefined,
        source: "manual",
      }),
    });

    if (res.ok) {
      setShowNewCall(false);
      setNewCall({ callerPhone: "", callerName: "", callType: "roadside", serviceNeeded: "", pickupAddress: "", destinationAddress: "", vehicleInfo: "", urgency: "medium", summary: "", notes: "", jobId: "", duration: "" });
      load();
    }
  };

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const fmtTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const fmtDate = (d: string) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filtered = filterSource === "all" ? calls : calls.filter(c => c.source === filterSource);

  // Group by date
  const grouped = new Map<string, CallLog[]>();
  filtered.forEach(call => {
    const dateKey = fmtDate(call.createdAt);
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(call);
  });

  const getTypeInfo = (type?: string) => CALL_TYPES.find(t => t.value === type) || CALL_TYPES[CALL_TYPES.length - 1];

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Left: Call List */}
      <div className="w-[380px] flex flex-col shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Call History</h2>
            <p className="text-[13px] text-[#64748d] mt-0.5">AI dispatch + manual call logs</p>
          </div>
          <button onClick={() => setShowNewCall(true)} className="bg-[#533afd] text-white px-3 py-1.5 rounded text-[12px] font-medium hover:bg-[#4434d4] transition-colors">
            + Log Call
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white border border-[#e5edf5] rounded-lg p-2.5 text-center">
            <div className="text-[18px] font-light">{stats.total}</div>
            <div className="text-[10px] text-[#64748d]">Total</div>
          </div>
          <div className="bg-white border border-[#e5edf5] rounded-lg p-2.5 text-center">
            <div className="text-[18px] font-light text-[#533afd]">{stats.ai}</div>
            <div className="text-[10px] text-[#64748d]">AI</div>
          </div>
          <div className="bg-white border border-[#e5edf5] rounded-lg p-2.5 text-center">
            <div className="text-[18px] font-light text-[#15be53]">{stats.manual}</div>
            <div className="text-[10px] text-[#64748d]">Manual</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 mb-3 bg-[#f6f9fc] p-1 rounded-lg">
          {[
            { id: "all", label: "All" },
            { id: "ai_dispatcher", label: "AI" },
            { id: "manual", label: "Manual" },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterSource(f.id)}
              className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                filterSource === f.id
                  ? "bg-white text-[#061b31] shadow-sm"
                  : "text-[#64748d]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Call List */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {Array.from(grouped.entries()).map(([date, dateCalls]) => (
            <div key={date}>
              <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider px-2 py-1.5 sticky top-0 bg-[#f6f9fc]">
                {date}
              </div>
              {dateCalls.map(call => {
                const typeInfo = getTypeInfo(call.callType);
                const isSelected = selectedCall?.id === call.id;
                return (
                  <div
                    key={call.id}
                    onClick={() => setSelectedCall(call)}
                    className={`px-3 py-2.5 cursor-pointer transition-colors border-l-2 ${
                      isSelected
                        ? "bg-[#533afd]/[0.04] border-l-[#533afd]"
                        : "border-l-transparent hover:bg-[#f6f9fc]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]">{typeInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium truncate">{call.callerName || call.callerPhone}</span>
                          {call.source === "ai_dispatcher" && (
                            <span className="px-1.5 py-0.5 bg-[#533afd]/10 text-[#533afd] rounded text-[9px] font-medium">AI</span>
                          )}
                          {call.source === "manual" && (
                            <span className="px-1.5 py-0.5 bg-[#dcfce7] text-[#166534] rounded text-[9px] font-medium">Manual</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748d] truncate">
                          {call.summary || call.callerPhone}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-[#64748d]">{fmtTime(call.createdAt)}</div>
                        <div className="text-[10px] text-[#94a3b8]">{fmtDuration(call.duration)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Call Detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedCall ? (
          <div className="flex-1 flex items-center justify-center bg-white border border-[#e5edf5] rounded-lg">
            <div className="text-center">
              <div className="text-[48px] mb-4 opacity-20">📞</div>
              <div className="text-[16px] font-medium text-[#64748d]">Select a call to view details</div>
              <div className="text-[13px] text-[#94a3b8] mt-1">Or click "+ Log Call" to add a manual entry</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
            {/* Call Header */}
            <div className="px-6 py-4 border-b border-[#e5edf5]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[28px]">{getTypeInfo(selectedCall.callType).icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[18px] font-semibold">{selectedCall.callerName || "Unknown Caller"}</span>
                      {selectedCall.source === "ai_dispatcher" && (
                        <span className="px-2 py-0.5 bg-[#533afd]/10 text-[#533afd] rounded text-[10px] font-medium">AI Dispatch</span>
                      )}
                      {selectedCall.source === "manual" && (
                        <span className="px-2 py-0.5 bg-[#dcfce7] text-[#166534] rounded text-[10px] font-medium">Manual Log</span>
                      )}
                    </div>
                    <div className="text-[13px] text-[#64748d]">{selectedCall.callerPhone}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[20px] font-light">{fmtDuration(selectedCall.duration)}</div>
                  <div className="text-[11px] text-[#64748d]">{fmtTime(selectedCall.createdAt)}</div>
                </div>
              </div>
            </div>

            {/* Call Details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Summary */}
              {selectedCall.summary && (
                <div>
                  <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Summary</div>
                  <div className="text-[14px] text-[#061b31] leading-[1.6] bg-[#f6f9fc] rounded-lg p-4">
                    {selectedCall.summary}
                  </div>
                </div>
              )}

              {/* Extracted Data */}
              <div className="grid grid-cols-2 gap-4">
                {selectedCall.callType && (
                  <div className="bg-[#f6f9fc] rounded-lg p-3">
                    <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Call Type</div>
                    <div className="text-[13px] font-medium mt-0.5 flex items-center gap-1.5">
                      <span>{getTypeInfo(selectedCall.callType).icon}</span>
                      <span>{getTypeInfo(selectedCall.callType).label}</span>
                    </div>
                  </div>
                )}
                {selectedCall.serviceNeeded && (
                  <div className="bg-[#f6f9fc] rounded-lg p-3">
                    <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Service Needed</div>
                    <div className="text-[13px] font-medium mt-0.5">{selectedCall.serviceNeeded}</div>
                  </div>
                )}
                {selectedCall.pickupAddress && (
                  <div className="bg-[#f6f9fc] rounded-lg p-3">
                    <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Location</div>
                    <div className="text-[13px] font-medium mt-0.5">{selectedCall.pickupAddress}</div>
                  </div>
                )}
                {selectedCall.vehicleInfo && (
                  <div className="bg-[#f6f9fc] rounded-lg p-3">
                    <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Vehicle</div>
                    <div className="text-[13px] font-medium mt-0.5">{selectedCall.vehicleInfo}</div>
                  </div>
                )}
                {selectedCall.urgency && (
                  <div className="bg-[#f6f9fc] rounded-lg p-3">
                    <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Urgency</div>
                    <div className="mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${URGENCY_COLORS[selectedCall.urgency]?.bg} ${URGENCY_COLORS[selectedCall.urgency]?.text}`}>
                        {selectedCall.urgency}
                      </span>
                    </div>
                  </div>
                )}
                {selectedCall.jobId && (
                  <div className="bg-[#f6f9fc] rounded-lg p-3">
                    <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Linked Job</div>
                    <div className="text-[13px] font-medium mt-0.5 text-[#533afd]">
                      #{selectedCall.jobId.slice(0, 8)}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedCall.notes && (
                <div>
                  <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Notes</div>
                  <div className="text-[13px] text-[#061b31] leading-[1.6] bg-[#f6f9fc] rounded-lg p-4 whitespace-pre-wrap">
                    {selectedCall.notes}
                  </div>
                </div>
              )}

              {/* Transcript (AI calls) */}
              {selectedCall.source === "ai_dispatcher" && selectedCall.transcript && (
                <div>
                  <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Transcript</div>
                  <div className="bg-[#f6f9fc] rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    {(() => {
                      try {
                        const messages = typeof selectedCall.transcript === "string"
                          ? JSON.parse(selectedCall.transcript)
                          : selectedCall.transcript;
                        if (Array.isArray(messages)) {
                          return messages.map((msg: { speaker: string; text: string }, i: number) => (
                            <div key={i} className={`mb-2 ${msg.speaker === "ai" ? "text-[#533afd]" : "text-[#061b31]"}`}>
                              <span className="text-[10px] font-medium uppercase">{msg.speaker === "ai" ? "AI" : "Caller"}:</span>
                              <span className="text-[13px] ml-1">{msg.text}</span>
                            </div>
                          ));
                        }
                      } catch {
                        // Plain text transcript
                      }
                      return <div className="text-[13px] text-[#64748d] whitespace-pre-wrap">{selectedCall.transcript}</div>;
                    })()}
                  </div>
                </div>
              )}

              {/* Transcript (Manual calls — just show notes) */}
              {selectedCall.source === "manual" && !selectedCall.transcript && (
                <div>
                  <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Call Notes</div>
                  <div className="text-[13px] text-[#64748d] bg-[#f6f9fc] rounded-lg p-4">
                    {selectedCall.notes || selectedCall.summary || "No notes recorded"}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Manual Call Modal */}
      {showNewCall && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowNewCall(false)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px] mb-1">📞 Log Manual Call</h2>
            <p className="text-[13px] text-[#64748d] mb-6">Record details from a phone call</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Caller Phone *</label>
                  <input
                    required
                    value={newCall.callerPhone}
                    onChange={e => setNewCall(f => ({ ...f, callerPhone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Caller Name</label>
                  <input
                    value={newCall.callerName}
                    onChange={e => setNewCall(f => ({ ...f, callerName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Call Type</label>
                  <select
                    value={newCall.callType}
                    onChange={e => setNewCall(f => ({ ...f, callType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                  >
                    {CALL_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Urgency</label>
                  <select
                    value={newCall.urgency}
                    onChange={e => setNewCall(f => ({ ...f, urgency: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Service Needed</label>
                <input
                  value={newCall.serviceNeeded}
                  onChange={e => setNewCall(f => ({ ...f, serviceNeeded: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                  placeholder="e.g. Flatbed tow, jump start, lockout"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Location</label>
                <input
                  value={newCall.pickupAddress}
                  onChange={e => setNewCall(f => ({ ...f, pickupAddress: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                  placeholder="Pickup address"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Vehicle Info</label>
                <input
                  value={newCall.vehicleInfo}
                  onChange={e => setNewCall(f => ({ ...f, vehicleInfo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                  placeholder="e.g. 2020 Honda Civic, blue"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Duration (seconds)</label>
                <input
                  type="number"
                  value={newCall.duration}
                  onChange={e => setNewCall(f => ({ ...f, duration: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                  placeholder="120"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Summary *</label>
                <textarea
                  required
                  rows={3}
                  value={newCall.summary}
                  onChange={e => setNewCall(f => ({ ...f, summary: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none resize-none"
                  placeholder="Brief summary of the call..."
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Additional Notes</label>
                <textarea
                  rows={2}
                  value={newCall.notes}
                  onChange={e => setNewCall(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none resize-none"
                  placeholder="Any additional details..."
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Link to Job (optional)</label>
                <select
                  value={newCall.jobId}
                  onChange={e => setNewCall(f => ({ ...f, jobId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
                >
                  <option value="">No linked job</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>
                      #{j.id.slice(0, 8)} — {j.customerName || j.pickupAddress} ({j.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t border-[#e5edf5]">
              <button onClick={() => setShowNewCall(false)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">Cancel</button>
              <button onClick={createManualCall} className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4]">
                Save Call Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}