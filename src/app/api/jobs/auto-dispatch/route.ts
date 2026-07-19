import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs, gpsLocations, users, organizations } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/*
 * Auto-dispatch — assigns nearest available driver to a job
 *
 * POST /api/jobs/auto-dispatch
 * { jobId }
 *
 * Algorithm:
 * 1. Get job pickup coordinates
 * 2. Find all online drivers in org with recent GPS pings
 * 3. Calculate distance using Haversine formula
 * 4. Assign closest driver
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.orgId, user.orgId))).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.pickupLat || !job.pickupLng) return NextResponse.json({ error: "Job has no coordinates. Add pickup address first." }, { status: 400 });

  // Check if forced dispatch is enabled
  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const dispatchSettings = (settings.dispatch as Record<string, unknown>) || {};
  const forcedDispatch = dispatchSettings.forcedDispatch === true;

  // Get all drivers in org
  const drivers = await db.select().from(users).where(and(eq(users.orgId, user.orgId), eq(users.role, "driver"), eq(users.isActive, true)));

  if (drivers.length === 0) return NextResponse.json({ error: "No active drivers available" }, { status: 400 });

  // Get latest GPS for each driver (last 30 min)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const driverLocations = await db.select().from(gpsLocations)
    .where(and(eq(gpsLocations.orgId, user.orgId), sql`${gpsLocations.timestamp} >= ${thirtyMinAgo}`))
    .orderBy(desc(gpsLocations.timestamp));

  // Deduplicate: get latest location per driver
  const latestByDriver = new Map<string, typeof driverLocations[0]>();
  for (const loc of driverLocations) {
    if (!latestByDriver.has(loc.userId)) latestByDriver.set(loc.userId, loc);
  }

  // Filter drivers who are online and not on active jobs
  const availableDrivers = drivers.filter(d => {
    const loc = latestByDriver.get(d.id);
    if (!loc || !loc.isOnline) return false;
    // Check if driver has active job
    // For now, allow reassignment
    return true;
  });

  if (availableDrivers.length === 0) return NextResponse.json({ error: "No available drivers nearby" }, { status: 400 });

  // Calculate distance to each driver
  const driversWithDistance = availableDrivers.map(d => {
    const loc = latestByDriver.get(d.id)!;
    const distance = haversine(job.pickupLat!, job.pickupLng!, loc.lat, loc.lng);
    return { driver: d, location: loc, distance };
  }).sort((a, b) => a.distance - b.distance);

  const nearest = driversWithDistance[0];

  // Assign driver
  await db.update(jobs).set({
    assignedDriverId: nearest.driver.id,
    status: "assigned",
    assignedAt: new Date(),
  }).where(eq(jobs.id, jobId));

  return NextResponse.json({
    success: true,
    assignedDriver: {
      id: nearest.driver.id,
      name: `${nearest.driver.firstName} ${nearest.driver.lastName}`,
      distance: Math.round(nearest.distance * 10) / 10,
      estimatedMinutes: Math.round(nearest.distance / 0.5), // rough: 30mph avg
    },
    totalAvailableDrivers: availableDrivers.length,
    forcedDispatch,
  });
}

// Haversine formula — distance in miles between two coordinates
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number { return deg * Math.PI / 180; }
