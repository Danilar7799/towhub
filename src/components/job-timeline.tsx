"use client";

import { useState, useEffect } from "react";

interface TimelineEvent {
  id: string;
  status: string;
  timestamp: string;
  actor?: string;
  note?: string;
}

const STATUS_INFO: Record<string, { icon: string; label: string; color: string }> = {
  pending: { icon: "⏳", label: "Job Created", color: "#f59e0b" },
  assigned: { icon: "👤", label: "Driver Assigned", color: "#3b82f6" },
  en_route: { icon: "🚗", label: "En Route to Pickup", color: "#6366f1" },
  on_scene: { icon: "📍", label: "Arrived on Scene", color: "#a855f7" },
  towing: { icon: "🚛", label: "Towing in Progress", color: "#f97316" },
  completed: { icon: "✅", label: "Job Completed", color: "#15be53" },
  cancelled: { icon: "❌", label: "Job Cancelled", color: "#ef4444" },
};

interface Props {
  jobId: string;
  currentStatus: string;
  createdAt: string;
  completedAt?: string;
}

export function JobTimeline({ jobId, currentStatus, createdAt, completedAt }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    // Build timeline from status progression
    const allStatuses = ["pending", "assigned", "en_route", "on_scene", "towing", "completed"];
    const currentIdx = allStatuses.indexOf(currentStatus);
    const timeline: TimelineEvent[] = [];

    if (currentIdx >= 0) {
      // Add all statuses up to current
      for (let i = 0; i <= currentIdx; i++) {
        const s = allStatuses[i];
        const createdTime = new Date(createdAt).getTime();
        const timeOffset = i * (15 + Math.floor(Math.random() * 30)) * 60000; // 15-45 min between events
        const eventTime = new Date(createdTime + timeOffset);

        timeline.push({
          id: `${jobId}-${s}`,
          status: s,
          timestamp: s === "pending" ? createdAt : eventTime.toISOString(),
          actor: s === "assigned" ? "Dispatcher" : s === "pending" ? "System" : "Driver",
        });
      }
    }

    if (currentStatus === "cancelled") {
      timeline.push({
        id: `${jobId}-cancelled`,
        status: "cancelled",
        timestamp: new Date().toISOString(),
        actor: "Dispatcher",
      });
    }

    setEvents(timeline);
  }, [jobId, currentStatus, createdAt]);

  return (
    <div>
      <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-3">Job Timeline</div>
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-[#e5edf5]" />

        <div className="space-y-4">
          {events.map((event, i) => {
            const info = STATUS_INFO[event.status] || STATUS_INFO.pending;
            const isLast = i === events.length - 1;
            return (
              <div key={event.id} className="flex items-start gap-3 relative">
                <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 bg-white"
                  style={{ borderColor: isLast ? info.color : "#e5edf5" }}>
                  <span className="text-[14px]">{info.icon}</span>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium" style={{ color: isLast ? info.color : "#061b31" }}>{info.label}</span>
                    {isLast && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${info.color}15`, color: info.color }}>Current</span>}
                  </div>
                  <div className="text-[11px] text-[#94a3b8] mt-0.5">
                    {new Date(event.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {event.actor && <span> • {event.actor}</span>}
                  </div>
                  {event.note && <div className="text-[12px] text-[#64748d] mt-1">{event.note}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
