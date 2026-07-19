import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET - List vehicles for org
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const fleet = await db.select().from(vehicles).where(eq(vehicles.orgId, user.orgId));
  return NextResponse.json({ vehicles: fleet });
}

// POST - Add vehicle
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, type, make, model, year, vin, licensePlate, color, capacityLbs } = body;

  if (!name || !type) {
    return NextResponse.json({ error: "Name and type required" }, { status: 400 });
  }

  const [vehicle] = await db.insert(vehicles).values({
    orgId: user.orgId,
    name,
    type,
    make,
    model,
    year: year ? parseInt(year) : null,
    vin,
    licensePlate,
    color,
    capacityLbs: capacityLbs ? parseInt(capacityLbs) : null,
  }).returning();

  return NextResponse.json({ vehicle });
}

// PUT - Update vehicle
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "Vehicle ID required" }, { status: 400 });

  const [updated] = await db.update(vehicles)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(vehicles.id, id), eq(vehicles.orgId, user.orgId)))
    .returning();

  return NextResponse.json({ vehicle: updated });
}

// DELETE - Remove vehicle
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Vehicle ID required" }, { status: 400 });

  await db.delete(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.orgId, user.orgId)));
  return NextResponse.json({ success: true });
}
