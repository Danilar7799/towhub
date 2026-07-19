import { NextResponse, NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      orgId: user.orgId,
    },
    org: user.organization ? {
      id: user.organization.id,
      name: user.organization.name,
      status: user.organization.status,
      phone: user.organization.phone,
      blandPhoneNumber: (user.organization as Record<string, unknown>).blandPhoneNumber,
      twilioPhoneNumber: (user.organization as Record<string, unknown>).twilioPhoneNumber,
      googleBusinessUrl: user.organization.googleBusinessUrl,
    } : null,
  });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = ["blandPhoneNumber", "twilioPhoneNumber", "googleBusinessUrl", "phone", "address"] as const;
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    await db.update(organizations).set(updates).where(eq(organizations.id, user.orgId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
