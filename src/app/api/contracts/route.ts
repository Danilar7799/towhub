import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { contracts, customers, subcontractors } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET - List contracts, filter by type
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "b2b" or "b2c"
  const status = searchParams.get("status");

  let query = db.select().from(contracts).where(eq(contracts.orgId, user.orgId)).orderBy(desc(contracts.createdAt));

  if (type) {
    query = db.select().from(contracts)
      .where(and(eq(contracts.orgId, user.orgId), eq(contracts.contractType, type as "b2b" | "b2c")))
      .orderBy(desc(contracts.createdAt));
  }

  const allContracts = await query;

  // Enrich with customer/subcontractor names
  const enriched = await Promise.all(allContracts.map(async (c) => {
    let partyName = "—";
    if (c.customerId) {
      const [cust] = await db.select({ name: customers.name }).from(customers).where(eq(customers.id, c.customerId)).limit(1);
      partyName = cust?.name || "—";
    } else if (c.subcontractorId) {
      const [sub] = await db.select({ name: subcontractors.companyName }).from(subcontractors).where(eq(subcontractors.id, c.subcontractorId)).limit(1);
      partyName = sub?.name || "—";
    }
    return { ...c, partyName };
  }));

  return NextResponse.json({ contracts: enriched });
}

// POST - Create contract
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { contractType, title, description, terms, customerId, subcontractorId, ratePerMile, flatRate, monthlyRetainer, commission, startDate, endDate, renewalDate, notifyDaysBefore, isAutoRenew, notes } = body;

  if (!contractType || !title || !startDate) {
    return NextResponse.json({ error: "contractType, title, and startDate required" }, { status: 400 });
  }

  const [contract] = await db.insert(contracts).values({
    orgId: user.orgId,
    contractType,
    title,
    description: description || null,
    terms: terms || null,
    customerId: customerId || null,
    subcontractorId: subcontractorId || null,
    ratePerMile: ratePerMile ? parseFloat(ratePerMile) : null,
    flatRate: flatRate ? parseFloat(flatRate) : null,
    monthlyRetainer: monthlyRetainer ? parseFloat(monthlyRetainer) : null,
    commission: commission ? parseFloat(commission) : null,
    startDate: new Date(startDate),
    endDate: endDate ? new Date(endDate) : new Date(startDate),
    renewalDate: renewalDate ? new Date(renewalDate) : null,
    notifyDaysBefore: notifyDaysBefore || 30,
    isAutoRenew: isAutoRenew || false,
    notes: notes || null,
  }).returning();

  return NextResponse.json({ contract });
}

// PUT - Update contract
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status: newStatus, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Contract ID required" }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (newStatus) updates.status = newStatus;
  if (rest.title) updates.title = rest.title;
  if (rest.terms) updates.terms = rest.terms;
  if (rest.ratePerMile !== undefined) updates.ratePerMile = rest.ratePerMile ? parseFloat(rest.ratePerMile) : null;
  if (rest.flatRate !== undefined) updates.flatRate = rest.flatRate ? parseFloat(rest.flatRate) : null;
  if (rest.monthlyRetainer !== undefined) updates.monthlyRetainer = rest.monthlyRetainer ? parseFloat(rest.monthlyRetainer) : null;
  if (rest.commission !== undefined) updates.commission = rest.commission ? parseFloat(rest.commission) : null;
  if (rest.notes) updates.notes = rest.notes;
  if (rest.isAutoRenew !== undefined) updates.isAutoRenew = rest.isAutoRenew;

  const [updated] = await db.update(contracts).set(updates).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId))).returning();

  return NextResponse.json({ contract: updated });
}

// DELETE - Terminate contract
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Contract ID required" }, { status: 400 });

  await db.update(contracts).set({ status: "terminated", updatedAt: new Date() }).where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)));

  return NextResponse.json({ success: true });
}
