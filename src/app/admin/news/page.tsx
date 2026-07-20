"use client";

import { useState, useEffect } from "react";

interface Announcement {
  id: string; type: string; title: string; body: string; date: string;
  priority: string; targetRoles: string[]; active: boolean;
  videoUrl?: string; imageUrl?: string;
}

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] || null;
}

export default function AdminNewsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("update");
  const [priority, setPriority] = useState("medium");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetRoles, setTargetRoles] = useState(["owner", "admin", "dispatcher"]);

  const load = () => fetch("/api/announcements").then(r => r.json()).then(d => setAnnouncements(d.announcements || []));
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setTitle(""); setBody(""); setType("update"); setPriority("medium");
    setVideoUrl(""); setImageUrl(""); setTargetRoles(["owner", "admin", "dispatcher"]);
    setEditing(null);
  };

  const save = async () => {
    const payload = { title, body, type, priority, videoUrl: videoUrl || undefined, imageUrl: imageUrl || undefined, targetRoles };

    if (editing) {
      await fetch("/api/announcements", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...payload }) });
    } else {
      await fetch("/api/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setShowAdd(false);
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
    load();
  };

  const edit = (a: Announcement) => {
    setEditing(a);
    setTitle(a.title); setBody(a.body); setType(a.type); setPriority(a.priority);
    setVideoUrl(a.videoUrl || ""); setImageUrl(a.imageUrl || "");
    setTargetRoles(a.targetRoles);
    setShowAdd(true);
  };

  const toggleRole = (role: string) => setTargetRoles(r => r.includes(role) ? r.filter(x => x !== role) : [...r, role]);

  const TYPE_OPTIONS = [
    { value: "feature", label: "🚀 Feature" },
    { value: "integration", label: "🔌 Integration" },
    { value: "tip", label: "💡 Tip" },
    { value: "update", label: "📱 Update" },
    { value: "promo", label: "⭐ Promo" },
  ];

  return (
    <div className="space-y-6" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">📰 News & Announcements</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Manage news feed with YouTube videos, images, and targeted delivery</p>
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-[#533afd] text-white px-4 py-2 rounded text-[13px] font-medium">+ Create Announcement</button>
      </div>

      {/* Announcements list */}
      <div className="space-y-3">
        {announcements.map(a => {
          const ytId = a.videoUrl ? getYouTubeId(a.videoUrl) : null;
          return (
            <div key={a.id} className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {TYPE_OPTIONS.find(t => t.value === a.type)?.label || a.type}
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${a.priority === "high" ? "bg-[#fef2f2] text-[#991b1b]" : a.priority === "medium" ? "bg-[#dbeafe] text-[#1e40af]" : "bg-[#f6f9fc] text-[#64748d]"}`}>
                        {a.priority}
                      </span>
                      <span className="text-[10px] text-[#94a3b8]">{a.date}</span>
                    </div>
                    <div className="text-[15px] font-semibold text-[#061b31] mb-1">{a.title}</div>
                    <div className="text-[12px] text-[#64748d] mb-2">{a.body}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#94a3b8]">Target: {a.targetRoles.join(", ")}</span>
                      {a.videoUrl && <span className="text-[10px] bg-[#fef2f2] text-[#dc2626] px-1.5 py-0.5 rounded">▶️ YouTube</span>}
                      {a.imageUrl && <span className="text-[10px] bg-[#dbeafe] text-[#1e40af] px-1.5 py-0.5 rounded">🖼️ Image</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => edit(a)} className="text-[12px] text-[#533afd] font-medium hover:underline">Edit</button>
                    <button onClick={() => remove(a.id)} className="text-[12px] text-[#dc2626] font-medium hover:underline">Delete</button>
                  </div>
                </div>
              </div>

              {/* YouTube preview */}
              {ytId && (
                <div className="border-t border-[#e5edf5] p-4 bg-[#f6f9fc]">
                  <div className="max-w-[320px]">
                    <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="YouTube preview"
                        className="rounded"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowAdd(false); resetForm(); }}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-semibold tracking-[-0.3px]">{editing ? "Edit Announcement" : "New Announcement"}</h2>
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="text-[#64748d] hover:text-[#061b31] text-xl">×</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Type</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none">
                    {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (urgent, with highlight)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 🎬 New Feature: Auction Aggregator"
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Body</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Describe the announcement..."
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none resize-none" />
              </div>

              {/* YouTube Video */}
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">▶️ YouTube Video URL (optional)</label>
                <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                {videoUrl && getYouTubeId(videoUrl) && (
                  <div className="mt-2 max-w-[320px]">
                    <div className="text-[10px] text-[#15be53] mb-1">✅ YouTube video detected</div>
                    <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeId(videoUrl)}?rel=0`}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                        frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen title="Preview" className="rounded"
                      />
                    </div>
                  </div>
                )}
                {videoUrl && !getYouTubeId(videoUrl) && (
                  <div className="text-[10px] text-[#dc2626] mt-1">⚠️ Could not detect YouTube video ID from this URL</div>
                )}
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">🖼️ Image URL (optional)</label>
                <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.png"
                  className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                {imageUrl && (
                  <img src={imageUrl} alt="Preview" className="mt-2 max-h-[100px] rounded border border-[#e5edf5] object-cover" onError={e => (e.target as HTMLImageElement).style.display = "none"} />
                )}
              </div>

              {/* Target roles */}
              <div>
                <label className="block text-[12px] font-medium text-[#273951] mb-1.5">🎯 Target Audience</label>
                <div className="flex flex-wrap gap-2">
                  {["owner", "admin", "dispatcher", "driver"].map(role => (
                    <button key={role} onClick={() => toggleRole(role)}
                      className={`px-3 py-1.5 rounded text-[12px] font-medium border capitalize ${targetRoles.includes(role) ? "border-[#533afd] bg-[#533afd]/[0.06] text-[#533afd]" : "border-[#e5edf5] text-[#64748d]"}`}>
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium">Cancel</button>
                <button onClick={save} disabled={!title} className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium disabled:opacity-50">
                  {editing ? "Save Changes" : "Publish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
