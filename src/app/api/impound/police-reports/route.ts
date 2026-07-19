import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { policeReports, impoundVehicles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const impoundId = searchParams.get("impoundId");

  const reports = impoundId
    ? await db.select().from(policeReports).where(and(eq(policeReports.orgId, user.orgId), eq(policeReports.impoundVehicleId, impoundId)))
    : await db.select().from(policeReports).where(eq(policeReports.orgId, user.orgId));

  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { impoundVehicleId, reportNumber, department, officerName, officerBadge, reasonForTow, accidentReportNumber, notes } = body;

  // Get impound vehicle data to pre-fill form
  const [vehicle] = await db.select().from(impoundVehicles).where(eq(impoundVehicles.id, impoundVehicleId)).limit(1);
  if (!vehicle) return NextResponse.json({ error: "Impound vehicle not found" }, { status: 404 });

  const [report] = await db.insert(policeReports).values({
    orgId: user.orgId, impoundVehicleId, reportNumber, department, officerName, officerBadge, reasonForTow, accidentReportNumber, notes,
    formFields: {
      vehicleMake: vehicle.vehicleMake,
      vehicleModel: vehicle.vehicleModel,
      vehicleYear: vehicle.vehicleYear,
      vehicleColor: vehicle.vehicleColor,
      vehiclePlate: vehicle.vehiclePlate,
      vehicleVin: vehicle.vehicleVin,
      ownerName: vehicle.ownerName,
      ownerPhone: vehicle.ownerPhone,
      lotLocation: vehicle.lotLocation,
      lotSpot: vehicle.lotSpot,
      storedAt: vehicle.storedAt,
      dailyRate: vehicle.dailyRate,
    },
  }).returning();

  return NextResponse.json({ report });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status, sentMethod, ...updates } = await req.json();

  if (status === "sent") {
    updates.sentAt = new Date();
    updates.sentMethod = sentMethod;
  }

  const [updated] = await db.update(policeReports).set({ ...updates, status, updatedAt: new Date() }).where(and(eq(policeReports.id, id), eq(policeReports.orgId, user.orgId))).returning();
  return NextResponse.json({ report: updated });
}
