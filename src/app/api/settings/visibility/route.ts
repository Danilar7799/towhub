import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Admin Panel Visibility Settings
 * GET /api/settings/visibility — get visibility settings
 * POST /api/settings/visibility — save visibility settings (owner/super_admin only)
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const visibility = (settings.adminVisibility as Record<string, boolean>) || {};

  return NextResponse.json({ settings: visibility });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only owner/super_admin can change visibility
  if (user.role !== "owner" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Only owner or super_admin can change visibility" }, { status: 403 });
  }

  const body = await req.json();
  const { settings: visibility } = body;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const currentSettings = (org?.settings as Record<string, unknown>) || {};

  await db.update(organizations).set({
    settings: {
      ...currentSettings,
      adminVisibility: visibility,
    },
    updatedAt: new Date(),
  }).where(eq(organizations.id, user.orgId));

  return NextResponse.json({ success: true });
}