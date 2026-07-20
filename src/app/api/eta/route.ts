import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs, gpsLocations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * ETA Sharing API
 * GET /api/eta?jobId=xxx — calculate ETA based on driver GPS + destination
 * Returns: { eta, distance, driverLocation, status }
 *
 * Uses Haversine formula for distance, average speed for ETA
 */

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const token = searchParams.get("token"); // Public access with token

  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Get driver location if assigned
  let driverLocation = null;
  let eta = null;
  let distance = null;

  if (job.assignedDriverId) {
    const [gps] = await db.select().from(gpsLocations)
      .where(and(eq(gpsLocations.userId, job.assignedDriverId), eq(gpsLocations.isOnline, true)))
      .orderBy(gpsLocations.timestamp)
      .limit(1);

    if (gps && job.pickupLat && job.pickupLng) {
      driverLocation = { lat: gps.lat, lng: gps.lng, speed: gps.speed, heading: gps.heading };
      distance = haversineDistance(gps.lat, gps.lng, job.pickupLat, job.pickupLng);
      const avgSpeedMph = gps.speed && gps.speed > 5 ? gps.speed : 30; // Default 30mph if slow/stopped
      eta = Math.round((distance / avgSpeedMph) * 60); // minutes
    }

    const [driver] = await db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, job.assignedDriverId)).limit(1);

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      driverName: driver ? `${driver.firstName} ${driver.lastName}` : null,
      driverLocation,
      pickup: { lat: job.pickupLat, lng: job.pickupLng, address: job.pickupAddress },
      destination: { lat: job.destinationLat, lng: job.destinationLng, address: job.destinationAddress },
      eta: eta ? `${eta} min` : null,
      etaMinutes: eta,
      distance: distance ? `${distance.toFixed(1)} mi` : null,
      distanceMiles: distance,
      isEnRoute: ["en_route", "on_scene", "towing"].includes(job.status),
    });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    driverName: null,
    driverLocation: null,
    pickup: { lat: job.pickupLat, lng: job.pickupLng, address: job.pickupAddress },
    destination: { lat: job.destinationLat, lng: job.destinationLng, address: job.destinationAddress },
    eta: null,
    distance: null,
    isEnRoute: false,
  });
}
