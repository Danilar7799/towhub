import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

// GET — fetch current API key
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [org] = await db
    .select({ apiKey: organizations.apiKey })
    .from(organizations)
    .where(eq(organizations.id, user.orgId))
    .limit(1);

  return NextResponse.json({ apiKey: org?.apiKey || null });
}

// POST — generate / regenerate API key
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newKey = `th_${randomBytes(24).toString("hex")}`;

  await db
    .update(organizations)
    .set({ apiKey: newKey, updatedAt: new Date() })
    .where(eq(organizations.id, user.orgId));

  return NextResponse.json({ apiKey: newKey });
}
