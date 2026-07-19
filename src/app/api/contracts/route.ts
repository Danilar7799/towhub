import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { eq, and, desc, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const expiring = searchParams.get("expiring"); // days threshold

  if (expiring) {
    const threshold = new Date(Date.now() + parseInt(expiring) * 86400000);
    const all = await db.select().from(contracts).where(and(eq(contracts.orgId, user.orgId), lte(contracts.endDate, threshold), eq(contracts.status, "active")));
    return NextResponse.json({ contracts: all, message: `${all.length} contracts expiring within ${expiring} days` });
  }

  const all = await db.select().from(contracts).where(eq(contracts.orgId, user.orgId)).orderBy(desc(contracts.createdAt));
  return NextResponse.json({ contracts: all });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { customerId, subcontractorId, contractType, title, description, terms, ratePerMile, flatRate, monthlyRetainer, commission, startDate, endDate, renewalDate, notifyDaysBefore, isAutoRenew, notes } = body;
  if (!title || !contractType || !startDate || !endDate) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const [contract] = await db.insert(contracts).values({
    orgId: user.orgId, customerId, subcontractorId, contractType, title, description, terms, ratePerMile, flatRate, monthlyRetainer, commission,
    startDate: new Date(startDate), endDate: new Date(endDate), renewalDate: renewalDate ? new Date(renewalDate) : undefined,
    notifyDaysBefore, isAutoRenew, notes,
  }).returning();

  return NextResponse.json({ contract });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await req.json();
  if (updates.startDate) updates.startDate = new Date(updates.startDate);
  if (updates.endDate) updates.endDate = new Date(updates.endDate);

  const [updated] = await db.update(contracts).set({ ...updates, updatedAt: new Date() }).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId))).returning();
  return NextResponse.json({ contract: updated });
}
