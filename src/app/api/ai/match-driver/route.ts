import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs, gpsLocations, users, vehicles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * AI Job Matching API
 * POST /api/ai/match-driver
 *
 * Finds the best available driver for a job based on:
 * - Proximity (Haversine distance)
 * - Current status (online, not on active job)
 * - Vehicle type compatibility
 * - Driver rating
 * - Response time history
 */

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface DriverCandidate {
  driverId: string;
  driverName: string;
  distance: number; // miles
  estimatedArrival: number; // minutes
  vehicleId: string | null;
  vehicleName: string | null;
  vehicleType: string | null;
  score: number; // 0-100 match score
  reasons: string[];
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { jobId, pickupLat, pickupLng, vehicleType, priority } = body;

  if (!pickupLat || !pickupLng) return NextResponse.json({ error: "pickupLat and pickupLng required" }, { status: 400 });

  // Get all online drivers with GPS
  const onlineDrivers = await db.select({
    userId: gpsLocations.userId,
    lat: gpsLocations.lat,
    lng: gpsLocations.lng,
    speed: gpsLocations.speed,
    activeJobId: gpsLocations.activeJobId,
    firstName: users.firstName,
    lastName: users.lastName,
    id: users.id,
  }).from(gpsLocations)
    .innerJoin(users, eq(gpsLocations.userId, users.id))
    .where(and(eq(gpsLocations.orgId, user.orgId), eq(gpsLocations.isOnline, true)));

  // Get vehicles
  const orgVehicles = await db.select().from(vehicles).where(eq(vehicles.orgId, user.orgId));

  // Score each driver
  const candidates: DriverCandidate[] = [];

  for (const driver of onlineDrivers) {
    const distance = haversineDistance(pickupLat, pickupLng, driver.lat, driver.lng);
    const estimatedArrival = Math.round((distance / 30) * 60); // Assume 30mph avg

    // Skip if too far (>50 miles)
    if (distance > 50) continue;

    // Find assigned vehicle
    const vehicle = orgVehicles.find(v => v.assignedDriverId === driver.userId);

    // Calculate match score
    let score = 100;
    const reasons: string[] = [];

    // Distance penalty (closer = better)
    const distancePenalty = distance * 2;
    score -= distancePenalty;
    if (distance < 5) reasons.push("Very close to pickup");
    else if (distance < 15) reasons.push("Nearby");
    else reasons.push("Further away");

    // Availability bonus
    if (!driver.activeJobId) {
      score += 10;
      reasons.push("Available now");
    } else {
      score -= 30;
      reasons.push("Currently on a job");
    }

    // Vehicle type match
    if (vehicle && vehicleType) {
      if (vehicle.type === vehicleType) {
        score += 15;
        reasons.push(`${vehicle.type} - matches requirement`);
      } else {
        score -= 10;
        reasons.push(`${vehicle.type} - different type needed`);
      }
    }

    // Speed consideration (if moving fast toward pickup area, bonus)
    if (driver.speed && driver.speed > 10) {
      score += 5;
      reasons.push("Currently moving");
    }

    // Clamp score
    score = Math.max(0, Math.min(100, Math.round(score)));

    candidates.push({
      driverId: driver.userId,
      driverName: `${driver.firstName} ${driver.lastName}`,
      distance: Math.round(distance * 10) / 10,
      estimatedArrival,
      vehicleId: vehicle?.id || null,
      vehicleName: vehicle?.name || null,
      vehicleType: vehicle?.type || null,
      score,
      reasons,
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    candidates: candidates.slice(0, 5), // Top 5
    bestMatch: candidates[0] || null,
    totalOnline: onlineDrivers.length,
    totalEvaluated: candidates.length,
  });
}
