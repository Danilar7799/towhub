import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, phone, orgName, orgSlug, orgPhone, orgAddress, orgCity, orgState, orgZip } = body;

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // If org details provided, create org + owner
    if (orgName) {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const [org] = await db.insert(organizations).values({
        name: orgName,
        slug,
        email,
        phone: orgPhone,
        address: orgAddress,
        city: orgCity,
        state: orgState,
        zip: orgZip,
        status: "pending",
      }).returning();

      const [user] = await db.insert(users).values({
        orgId: org.id,
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        role: "owner",
      }).returning();

      const token = signToken({ userId: user.id, email: user.email, role: user.role, orgId: org.id });
      const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role }, org: { id: org.id, name: org.name, status: org.status } });
      res.cookies.set("towhub_token", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    // Register as standalone user (driver, etc.)
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      role: "driver",
    }).returning();

    const token = signToken({ userId: user.id, email: user.email, role: user.role, orgId: null });
    const res = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
    res.cookies.set("towhub_token", token, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
