"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Announcement {
  id: string;
  type: "feature" | "integration" | "tip" | "update" | "promo";
  title: string;
  body: string;
  date: string;
  priority: "high" | "medium" | "low";
  videoUrl?: string; // YouTube URL
  imageUrl?: string;
}

const TYPE_STYLES: Record<string, { icon: string; bg: string; text: string }> = {
  feature: { icon: "🚀", bg: "bg-[#dcfce7]", text: "text-[#166534]" },
  integration: { icon: "🔌", bg: "bg-[#dbeafe]", text: "text-[#1e40af]" },
  tip: { icon: "💡", bg: "bg-[#fef3c7]", text: "text-[#92400e]" },
  update: { icon: "📱", bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]" },
  promo: { icon: "⭐", bg: "bg-[#fce7f3]", text: "text-[#9d174d]" },
};

// Extract YouTube video ID from various URL formats
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function YouTubeEmbed({ url }: { url: string }) {
  const videoId = getYouTubeId(url);
  if (!videoId) return null;

  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-[#e5edf5]">
      <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    </div>
  );
}

export function NewsSidebar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/announcements").then(r => r.json()).then(d => {
      setAnnouncements(d.announcements || []);
    }).catch(() => {});
  }, []);

  const fmtDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 86400000) return "Today";
    if (diff < 172800000) return "Yesterday";
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e5edf5] flex items-center justify-between">
        <div className="text-[13px] font-medium text-[#061b31]">📰 News & Updates</div>
        <Link href="/docs" className="text-[10px] text-[#533afd] font-medium hover:underline">Help Center →</Link>
      </div>

      <div className="divide-y divide-[#e5edf5] max-h-[500px] overflow-y-auto">
        {announcements.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-[20px] mb-1 opacity-30">📰</div>
            <div className="text-[12px] text-[#64748d]">No news yet</div>
          </div>
        ) : announcements.map(a => {
          const style = TYPE_STYLES[a.type] || TYPE_STYLES.update;
          const isExpanded = expanded === a.id;
          const hasVideo = !!a.videoUrl;

          return (
            <div key={a.id} onClick={() => setExpanded(isExpanded ? null : a.id)}
              className={`px-4 py-3 cursor-pointer hover:bg-[#f6f9fc] transition-colors ${a.priority === "high" ? "border-l-2 border-l-[#533afd]" : ""}`}>
              <div className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] shrink-0 ${style.bg} ${style.text}`}>
                  {hasVideo ? "▶️" : style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12px] font-semibold text-[#061b31] truncate">{a.title}</div>
                    <div className="text-[10px] text-[#94a3b8] shrink-0">{fmtDate(a.date)}</div>
                  </div>
                  {isExpanded && (
                    <div className="mt-2">
                      {/* Image */}
                      {a.imageUrl && (
                        <img src={a.imageUrl} alt="" className="w-full rounded-lg border border-[#e5edf5] mb-2 object-cover max-h-[120px]" />
                      )}
                      {/* Body text */}
                      <div className="text-[11px] text-[#64748d] leading-relaxed">{a.body}</div>
                      {/* YouTube embed */}
                      {a.videoUrl && <YouTubeEmbed url={a.videoUrl} />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Support quick link */}
      <div className="px-4 py-3 border-t border-[#e5edf5] bg-[#f6f9fc]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[10px]">💬</div>
          <div className="flex-1">
            <div className="text-[11px] font-medium text-[#061b31]">Need help?</div>
            <div className="text-[10px] text-[#64748d]">support@towhub.vercel.app</div>
          </div>
          <Link href="/dashboard/settings" className="text-[10px] text-[#533afd] font-medium hover:underline">Contact →</Link>
        </div>
      </div>
    </div>
  );
}
