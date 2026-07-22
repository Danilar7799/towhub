import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users, gpsLocations, shifts, jobs } from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

/*
 * Driver Availability API
 *
 * GET /api/drivers/availability — get all drivers with their current status
 *
 * Returns:
 * - Each driver's online/offline status
 * - Current shift info
 * - Active job (if any)
 * - Last GPS location
 * - Hours worked today
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drivers = await db.select().from(users).where(
    and(eq(users.orgId, user.orgId), eq(users.role, "driver"), eq(users.isActive, true))
  );

  // Get latest GPS for each driver (last 30 min)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const recentLocations = await db.select().from(gpsLocations)
    .where(and(eq(gpsLocations.orgId, user.orgId), gte(gpsLocations.timestamp, thirtyMinAgo)))
    .orderBy(desc(gpsLocations.timestamp));

  const latestByDriver = new Map<string, typeof recentLocations[0]>();
  for (const loc of recentLocations) {
    if (!latestByDriver.has(loc.userId)) latestByDriver.set(loc.userId, loc);
  }

  // Get active shifts
  const activeShifts = await db.select().from(shifts).where(
    and(eq(shifts.orgId, user.orgId), sql`${shifts.endedAt} IS NULL`)
  );
  const shiftByDriver = new Map<string, typeof activeShifts[0]>();
  for (const shift of activeShifts) shiftByDriver.set(shift.driverId, shift);

  // Get active jobs
  const activeJobs = await db.select().from(jobs).where(
    and(eq(jobs.orgId, user.orgId), sql`${jobs.status} IN ('assigned', 'en_route', 'on_scene', 'towing')`)
  );
  const jobByDriver = new Map<string, typeof activeJobs[0]>();
  for (const job of activeJobs) {
    if (job.assignedDriverId) jobByDriver.set(job.assignedDriverId, job);
  }

  // Get today's shifts for hours worked
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayShifts = await db.select().from(shifts).where(
    and(eq(shifts.orgId, user.orgId), gte(shifts.startedAt, todayStart))
  );
  const todayHoursByDriver = new Map<string, number>();
  for (const shift of todayShifts) {
    const end = shift.endedAt || new Date();
    const hours = (end.getTime() - new Date(shift.startedAt).getTime()) / 3600000;
    todayHoursByDriver.set(shift.driverId, (todayHoursByDriver.get(shift.driverId) || 0) + hours);
  }

  const driverStatuses = drivers.map(d => {
    const gps = latestByDriver.get(d.id);
    const shift = shiftByDriver.get(d.id);
    const activeJob = jobByDriver.get(d.id);
    const todayHours = todayHoursByDriver.get(d.id) || 0;
    const isOnline = gps?.isOnline && shift;
    const isOnJob = !!activeJob;

    return {
      id: d.id,
      name: `${d.firstName} ${d.lastName}`,
      email: d.email,
      phone: d.phone,
      isOnline: !!isOnline,
      isOnShift: !!shift,
      isOnJob,
      shiftStartedAt: shift?.startedAt || null,
      todayHours: Math.round(todayHours * 10) / 10,
      currentJob: activeJob ? {
        id: activeJob.id,
        status: activeJob.status,
        customer: activeJob.customerName,
        pickup: activeJob.pickupAddress,
      } : null,
      location: gps ? {
        lat: gps.lat,
        lng: gps.lng,
        speed: gps.speed,
        battery: gps.batteryLevel,
        lastUpdate: gps.timestamp,
      } : null,
    };
  });

  // Summary
  const online = driverStatuses.filter(d => d.isOnline).length;
  const onJob = driverStatuses.filter(d => d.isOnJob).length;
  const available = online - onJob;

  return NextResponse.json({
    drivers: driverStatuses,
    summary: {
      total: drivers.length,
      online,
      onJob,
      available: Math.max(0, available),
      offline: drivers.length - online,
    },
  });
}
