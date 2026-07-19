import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Organization Profile & Verification API
 * GET  /api/org/profile — get full org profile
 * PUT  /api/org/profile — update company info, licenses, verification
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      email: org.email,
      phone: org.phone,
      address: org.address,
      city: org.city,
      state: org.state,
      zip: org.zip,
      website: org.website,
      status: org.status,
      settings: org.settings,
    },
  });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["name", "phone", "email", "address", "city", "state", "zip", "website",
    "blandPhoneNumber", "twilioPhoneNumber", "googleBusinessUrl"] as const;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  // Handle nested settings (licenses, verification docs, etc.)
  if (body.settings) {
    const [current] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
    const currentSettings = (current?.settings as Record<string, unknown>) || {};
    updates.settings = { ...currentSettings, ...body.settings };
  }

  try {
    await db.update(organizations).set(updates).where(eq(organizations.id, user.orgId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
