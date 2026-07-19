import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { subcontractors, subcontractorDrivers, subcontractorVehicles } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subs = await db.select().from(subcontractors).where(eq(subcontractors.orgId, user.orgId)).orderBy(desc(subcontractors.createdAt));

  // Get drivers and vehicles for each sub
  const result = await Promise.all(subs.map(async (sub) => {
    const drivers = await db.select().from(subcontractorDrivers).where(eq(subcontractorDrivers.subcontractorId, sub.id));
    const vehicles = await db.select().from(subcontractorVehicles).where(eq(subcontractorVehicles.subcontractorId, sub.id));
    return { ...sub, drivers, vehicles };
  }));

  return NextResponse.json({ subcontractors: result });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { companyName, contactName, email, phone, address, city, state, zip, mcNumber, dotNumber, insuranceExpiry, ratePerMile, flatRate, commission, notes } = body;
  if (!companyName) return NextResponse.json({ error: "Company name required" }, { status: 400 });

  const [sub] = await db.insert(subcontractors).values({
    orgId: user.orgId, companyName, contactName, email, phone, address, city, state, zip, mcNumber, dotNumber,
    insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : undefined,
    ratePerMile, flatRate, commission, notes,
  }).returning();

  return NextResponse.json({ subcontractor: sub });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action, ...data } = await req.json();

  if (action === "add_driver") {
    const [driver] = await db.insert(subcontractorDrivers).values({ orgId: user.orgId, subcontractorId: id, ...data }).returning();
    return NextResponse.json({ driver });
  }
  if (action === "add_vehicle") {
    const [vehicle] = await db.insert(subcontractorVehicles).values({ orgId: user.orgId, subcontractorId: id, ...data }).returning();
    return NextResponse.json({ vehicle });
  }

  const [updated] = await db.update(subcontractors).set({ ...data, updatedAt: new Date() }).where(and(eq(subcontractors.id, id), eq(subcontractors.orgId, user.orgId))).returning();
  return NextResponse.json({ subcontractor: updated });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await db.delete(subcontractors).where(and(eq(subcontractors.id, id), eq(subcontractors.orgId, user.orgId)));
  return NextResponse.json({ success: true });
}
