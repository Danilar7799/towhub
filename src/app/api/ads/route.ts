import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { adBanners } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/*
 * Ad Banners API
 * GET    /api/ads — fetch active ads (filtered by role)
 * POST   /api/ads — create ad (super_admin)
 * PUT    /api/ads — update ad (super_admin)
 * DELETE /api/ads?id=xxx — delete ad (super_admin)
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const placement = searchParams.get("placement");
  const all = searchParams.get("all"); // super_admin sees all

  if (all && user.role === "super_admin") {
    const ads = await db.select().from(adBanners).orderBy(desc(adBanners.priority), desc(adBanners.createdAt));
    return NextResponse.json({ ads });
  }

  // Regular users see only active, role-targeted ads
  const now = new Date();
  let ads;

  if (placement) {
    ads = await db.select().from(adBanners).where(
      and(
        eq(adBanners.status, "active"),
        eq(adBanners.placement, placement as "top_banner" | "sidebar" | "inline" | "modal" | "footer")
      )
    ).orderBy(desc(adBanners.priority));
  } else {
    ads = await db.select().from(adBanners).where(eq(adBanners.status, "active")).orderBy(desc(adBanners.priority));
  }

  // Filter by role targeting
  const filtered = ads.filter(ad => {
    const targetRoles = ad.targetRoles || [];
    const excludeRoles = ad.excludeRoles || [];
    if (excludeRoles.includes(user.role)) return false;
    if (targetRoles.length > 0 && !targetRoles.includes(user.role)) return false;
    if (ad.startDate && new Date(ad.startDate) > now) return false;
    if (ad.endDate && new Date(ad.endDate) < now) return false;
    return true;
  });

  return NextResponse.json({ ads: filtered });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const [ad] = await db.insert(adBanners).values({
    name: body.name,
    placement: body.placement,
    title: body.title,
    subtitle: body.subtitle || null,
    ctaText: body.ctaText || null,
    ctaLink: body.ctaLink || null,
    imageUrl: body.imageUrl || null,
    gifUrl: body.gifUrl || null,
    bgColor: body.bgColor || "#533afd",
    textColor: body.textColor || "#ffffff",
    useGradient: body.useGradient || false,
    gradientFrom: body.gradientFrom || "#533afd",
    gradientTo: body.gradientTo || "#f96bee",
    animation: body.animation || "none",
    animationDuration: body.animationDuration || 3000,
    targetRoles: body.targetRoles || ["owner", "admin", "dispatcher"],
    excludeRoles: body.excludeRoles || ["driver"],
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
    priority: body.priority || 1,
    createdBy: user.id,
  }).returning();

  return NextResponse.json({ ok: true, ad });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Whitelist updatable fields
  const allowed: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["name", "placement", "status", "title", "subtitle", "ctaText", "ctaLink",
    "imageUrl", "gifUrl", "bgColor", "textColor", "useGradient", "gradientFrom", "gradientTo",
    "animation", "animationDuration", "targetRoles", "excludeRoles", "priority"] as const;

  for (const f of fields) {
    if (updates[f] !== undefined) (allowed as Record<string, unknown>)[f] = updates[f];
  }
  if (updates.startDate) allowed.startDate = new Date(updates.startDate);
  if (updates.endDate) allowed.endDate = new Date(updates.endDate);

  const [updated] = await db.update(adBanners).set(allowed).where(eq(adBanners.id, id)).returning();
  return NextResponse.json({ ok: true, ad: updated });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(adBanners).where(eq(adBanners.id, id));
  return NextResponse.json({ ok: true });
}
