import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { shifts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/*
 * Shifts API — Driver clock in/out
 * GET  /api/shifts — list shifts (filter by driverId, active)
 * POST /api/shifts — start shift (clock in)
 * PUT  /api/shifts — end shift (clock out)
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const driverId = searchParams.get("driverId");
  const active = searchParams.get("active");

  let query = db.select().from(shifts).where(eq(shifts.orgId, user.orgId)).orderBy(desc(shifts.startedAt));

  if (driverId) {
    query = db.select().from(shifts).where(and(eq(shifts.orgId, user.orgId), eq(shifts.driverId, driverId))).orderBy(desc(shifts.startedAt));
  }

  const allShifts = await query;

  // Filter active (no endedAt)
  const result = active === "true" ? allShifts.filter(s => !s.endedAt) : allShifts;

  return NextResponse.json({ shifts: result });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { vehicleId, startMileage } = body;

  // Check if already on active shift
  const activeShifts = await db.select().from(shifts).where(and(eq(shifts.orgId, user.orgId), eq(shifts.driverId, user.id)));
  const hasActive = activeShifts.some(s => !s.endedAt);
  if (hasActive) return NextResponse.json({ error: "Already on an active shift. End current shift first." }, { status: 400 });

  const [shift] = await db.insert(shifts).values({
    orgId: user.orgId,
    driverId: user.id,
    vehicleId: vehicleId || null,
    startMileage: startMileage ? parseInt(startMileage) : null,
  }).returning();

  return NextResponse.json({ shift, message: "Shift started. Drive safe! 🚛" });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { shiftId, endMileage, notes } = body;

  if (!shiftId) return NextResponse.json({ error: "shiftId required" }, { status: 400 });

  const [shift] = await db.update(shifts).set({
    endedAt: new Date(),
    endMileage: endMileage ? parseInt(endMileage) : null,
    notes: notes || null,
  }).where(and(eq(shifts.id, shiftId), eq(shifts.driverId, user.id))).returning();

  const duration = shift?.endedAt && shift?.startedAt
    ? ((new Date(shift.endedAt).getTime() - new Date(shift.startedAt).getTime()) / 3600000).toFixed(1)
    : "0";

  return NextResponse.json({ shift, message: `Shift ended. ${duration}h worked. Great job! 👍` });
}
