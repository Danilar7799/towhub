import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

// GET - List drivers/dispatchers for org
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamMembers = await db.select({
    id: users.id,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    phone: users.phone,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.orgId, user.orgId));

  return NextResponse.json({ users: teamMembers });
}

// POST - Add driver/dispatcher to org
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, firstName, lastName, phone, role, password } = body;

  if (!email || !firstName || !lastName || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["driver", "dispatcher", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db.insert(users).values({
    orgId: user.orgId,
    email,
    passwordHash,
    firstName,
    lastName,
    phone,
    role,
  }).returning();

  return NextResponse.json({
    user: { id: newUser.id, email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName, role: newUser.role },
    credentials: { email, password },
  });
}

// PUT - Update team member
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, phone, isActive } = body;

  // Whitelist: only allow phone and isActive updates (no role/orgId escalation)
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (phone !== undefined) updates.phone = phone;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db.update(users)
    .set(updates)
    .where(and(eq(users.id, id), eq(users.orgId, user.orgId)))
    .returning();

  return NextResponse.json({ user: updated });
}
