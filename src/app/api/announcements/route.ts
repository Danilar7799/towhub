import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/*
 * Announcements API — news with YouTube video support
 *
 * GET  /api/announcements — fetch active announcements for current user's role
 * POST /api/announcements — create announcement (super_admin only)
 *   Body: { type, title, body, videoUrl?, imageUrl?, priority, targetRoles }
 */

interface Announcement {
  id: string;
  type: string;
  title: string;
  body: string;
  date: string;
  priority: string;
  targetRoles: string[];
  active: boolean;
  videoUrl?: string;
  imageUrl?: string;
}

// Seed announcements with video examples
const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "welcome-video",
    type: "feature",
    title: "🎬 Watch: TowHub Quick Start Guide",
    body: "Learn how to set up your towing company in under 5 minutes. This walkthrough covers fleet setup, driver invites, and your first job.",
    date: "2026-07-19",
    priority: "high",
    targetRoles: ["owner", "admin"],
    active: true,
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "auctions-launch",
    type: "feature",
    title: "🚀 Auction Aggregator Live!",
    body: "Search vehicles across Copart, IAA, Manheim, and more — all from one place. Check out Auctions in the sidebar.",
    date: "2026-07-19",
    priority: "high",
    targetRoles: ["owner", "admin", "dispatcher"],
    active: true,
  },
  {
    id: "quickbooks-connect",
    type: "integration",
    title: "📊 QuickBooks Integration",
    body: "Connect your QuickBooks account to auto-sync invoices, expenses, and customers. Go to Settings → Integrations.",
    date: "2026-07-19",
    priority: "medium",
    targetRoles: ["owner", "admin"],
    active: true,
  },
  {
    id: "pro-tip-lead-form",
    type: "tip",
    title: "💡 Pro Tip: Lead Capture Form",
    body: "Add the TowHub lead form to your website. Get the embed code in Settings → Website Lead Capture. Leads flow directly into your CRM.",
    date: "2026-07-18",
    priority: "low",
    targetRoles: ["owner", "admin", "dispatcher"],
    active: true,
  },
  {
    id: "driver-app-update",
    type: "update",
    title: "📱 Driver App: GPS Improvements",
    body: "GPS tracking is now more accurate with background location. Shift management tracks hours automatically. Push notifications coming soon!",
    date: "2026-07-17",
    priority: "medium",
    targetRoles: ["driver"],
    active: true,
  },
];

// In production, this would be stored in a database table
let announcements = [...DEFAULT_ANNOUNCEMENTS];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filtered = announcements
    .filter(a => a.active && a.targetRoles.includes(user.role))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ announcements: filtered });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { type, title, body: content, videoUrl, imageUrl, priority, targetRoles } = body;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const announcement: Announcement = {
    id: `custom-${Date.now()}`,
    type: type || "update",
    title,
    body: content || "",
    date: new Date().toISOString().slice(0, 10),
    priority: priority || "medium",
    targetRoles: targetRoles || ["owner", "admin", "dispatcher", "driver"],
    active: true,
    videoUrl: videoUrl || undefined,
    imageUrl: imageUrl || undefined,
  };

  announcements.unshift(announcement);

  return NextResponse.json({ ok: true, announcement });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;

  const idx = announcements.findIndex(a => a.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  announcements[idx] = { ...announcements[idx], ...updates };
  return NextResponse.json({ ok: true, announcement: announcements[idx] });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  announcements = announcements.filter(a => a.id !== id);
  return NextResponse.json({ ok: true });
}
