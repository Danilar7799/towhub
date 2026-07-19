import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { impoundVehicles } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "stored";

  const all = await db.select().from(impoundVehicles)
    .where(and(eq(impoundVehicles.orgId, user.orgId), eq(impoundVehicles.status, status)))
    .orderBy(desc(impoundVehicles.storedAt));

  return NextResponse.json({ vehicles: all });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { jobId, vehicleMake, vehicleModel, vehicleYear, vehicleColor, vehiclePlate, vehicleVin, ownerName, ownerPhone, lotLocation, lotSpot, dailyRate, notes } = body;

  const [vehicle] = await db.insert(impoundVehicles).values({
    orgId: user.orgId, jobId, vehicleMake, vehicleModel, vehicleYear, vehicleColor, vehiclePlate, vehicleVin, ownerName, ownerPhone, lotLocation, lotSpot, dailyRate, notes,
  }).returning();

  return NextResponse.json({ vehicle });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await req.json();

  if (updates.status === "released") {
    updates.releasedAt = new Date();
    // Calculate total charges
    const [v] = await db.select().from(impoundVehicles).where(eq(impoundVehicles.id, id)).limit(1);
    if (v) {
      const days = Math.ceil((Date.now() - new Date(v.storedAt).getTime()) / 86400000);
      updates.totalCharges = days * (v.dailyRate || 25);
    }
  }

  const [updated] = await db.update(impoundVehicles).set({ ...updates, updatedAt: new Date() }).where(and(eq(impoundVehicles.id, id), eq(impoundVehicles.orgId, user.orgId))).returning();
  return NextResponse.json({ vehicle: updated });
}
