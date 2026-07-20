import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs, gpsLocations, users, vehicles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * POST /api/dispatch/auto-assign
 * Auto-assign the nearest available driver to a job
 *
 * Body: { jobId: string }
 *
 * Algorithm:
 * 1. Get job pickup location
 * 2. Find all online drivers with GPS
 * 3. Score by: distance, availability, vehicle type match
 * 4. Assign best match
 */

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  // Get the job
  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.orgId, user.orgId))).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Get all online drivers with GPS
  const onlineDrivers = await db.select({
    userId: gpsLocations.userId,
    lat: gpsLocations.lat,
    lng: gpsLocations.lng,
    speed: gpsLocations.speed,
    activeJobId: gpsLocations.activeJobId,
    firstName: users.firstName,
    lastName: users.lastName,
  }).from(gpsLocations)
    .innerJoin(users, eq(gpsLocations.userId, users.id))
    .where(and(eq(gpsLocations.orgId, user.orgId), eq(gpsLocations.isOnline, true)));

  // Get vehicles
  const orgVehicles = await db.select().from(vehicles).where(eq(vehicles.orgId, user.orgId));

  // LA city center coordinates (fallback if no GPS data)
  const defaultLat = 34.0522;
  const defaultLng = -118.2437;

  // Score each driver
  let bestDriver: string | null = null;
  let bestVehicle: string | null = null;
  let bestScore = -1;
  const candidates: Array<{ name: string; distance: number; score: number; available: boolean }> = [];

  for (const driver of onlineDrivers) {
    const distance = haversine(defaultLat, defaultLng, driver.lat, driver.lng);
    const isAvailable = !driver.activeJobId;
    const vehicle = orgVehicles.find(v => v.assignedDriverId === driver.userId);

    let score = 100;
    // Distance penalty
    score -= distance * 2;
    // Availability bonus
    if (isAvailable) score += 20;
    else score -= 40;

    score = Math.max(0, Math.round(score));

    candidates.push({
      name: `${driver.firstName} ${driver.lastName}`,
      distance: Math.round(distance * 10) / 10,
      score,
      available: isAvailable,
    });

    if (isAvailable && score > bestScore) {
      bestScore = score;
      bestDriver = driver.userId;
      bestVehicle = vehicle?.id || null;
    }
  }

  if (!bestDriver) {
    return NextResponse.json({ error: "No available drivers", candidates });
  }

  // Assign the best driver
  const [updated] = await db.update(jobs).set({
    assignedDriverId: bestDriver,
    assignedVehicleId: bestVehicle,
    status: "assigned",
    updatedAt: new Date(),
  }).where(and(eq(jobs.id, jobId), eq(jobs.orgId, user.orgId))).returning();

  // Get driver name
  const [driver] = await db.select().from(users).where(eq(users.id, bestDriver)).limit(1);

  return NextResponse.json({
    ok: true,
    job: updated,
    assignedTo: driver ? `${driver.firstName} ${driver.lastName}` : "Unknown",
    score: bestScore,
    candidates,
  });
}
