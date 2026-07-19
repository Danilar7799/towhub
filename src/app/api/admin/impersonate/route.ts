import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, signToken } from "@/lib/auth";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// POST - Super admin impersonates a user/org
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgId } = await req.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  // Get the org owner
  const [owner] = await db.select().from(users).where(and(eq(users.orgId, orgId), eq(users.role, "owner"))).limit(1);
  if (!owner) return NextResponse.json({ error: "No owner found for this org" }, { status: 404 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);

  // Create a token as the owner
  const token = signToken({ userId: owner.id, email: owner.email, role: owner.role, orgId: orgId });

  const res = NextResponse.json({
    success: true,
    user: { id: owner.id, email: owner.email, firstName: owner.firstName, lastName: owner.lastName, role: owner.role },
    org: org ? { id: org.id, name: org.name, status: org.status } : null,
    impersonatedBy: user.email,
  });
  res.cookies.set("towhub_token", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 2 }); // 2h for impersonation
  res.cookies.set("towhub_impersonator", user.email, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 2 });

  return res;
}
