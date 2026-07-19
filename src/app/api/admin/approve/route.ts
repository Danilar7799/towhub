import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations, waitlist, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

// POST - Approve waitlist entry -> create org + owner user
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { waitlistId, commissionPercent } = await req.json();

  const [entry] = await db.select().from(waitlist).where(eq(waitlist.id, waitlistId)).limit(1);
  if (!entry) return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });

  // Create org
  const slug = entry.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const [org] = await db.insert(organizations).values({
    name: entry.companyName,
    slug,
    email: entry.email,
    phone: entry.phone,
    city: entry.city,
    state: entry.state,
    website: entry.website,
    googleBusinessUrl: entry.googleBusinessUrl,
    status: "approved",
    commissionPercent: commissionPercent || 15,
  }).returning();

  // Create owner account with temp password
  const tempPassword = Math.random().toString(36).slice(-10);
  const passwordHash = await hashPassword(tempPassword);
  await db.insert(users).values({
    orgId: org.id,
    email: entry.email,
    passwordHash,
    firstName: entry.contactName.split(" ")[0] || entry.contactName,
    lastName: entry.contactName.split(" ").slice(1).join(" ") || "",
    phone: entry.phone,
    role: "owner",
  });

  // Mark waitlist entry as approved
  await db.update(waitlist).set({ isApproved: true, approvedAt: new Date() }).where(eq(waitlist.id, waitlistId));

  return NextResponse.json({
    success: true,
    org,
    credentials: { email: entry.email, password: tempPassword },
    message: `Approved! Login: ${entry.email} / ${tempPassword}`,
  });
}

// PUT - Update org status (approve/suspend/reject)
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgId, status, commissionPercent } = await req.json();

  const [updated] = await db.update(organizations)
    .set({ status, commissionPercent, updatedAt: new Date() })
    .where(eq(organizations.id, orgId))
    .returning();

  return NextResponse.json({ org: updated });
}
