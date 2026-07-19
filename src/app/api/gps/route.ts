import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { gpsLocations, users } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";

// POST - Report GPS location (from driver app)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { lat, lng, speed, heading, accuracy, batteryLevel, activeJobId } = body;

  if (lat === undefined || lng === undefined) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  const [location] = await db.insert(gpsLocations).values({
    userId: user.id,
    orgId: user.orgId,
    lat,
    lng,
    speed,
    heading,
    accuracy,
    batteryLevel,
    activeJobId,
    isOnline: true,
  }).returning();

  return NextResponse.json({ location });
}

// GET - Get all driver locations for org (for dispatcher map)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since"); // ISO date string

  // Get latest location for each driver in org
  // Using a subquery approach: get the most recent GPS ping per driver
  const recentCutoff = since ? new Date(since) : new Date(Date.now() - 30 * 60 * 1000); // last 30 min default

  const locations = await db
    .select({
      id: gpsLocations.id,
      userId: gpsLocations.userId,
      lat: gpsLocations.lat,
      lng: gpsLocations.lng,
      speed: gpsLocations.speed,
      heading: gpsLocations.heading,
      batteryLevel: gpsLocations.batteryLevel,
      isOnline: gpsLocations.isOnline,
      activeJobId: gpsLocations.activeJobId,
      timestamp: gpsLocations.timestamp,
      driverFirstName: users.firstName,
      driverLastName: users.lastName,
    })
    .from(gpsLocations)
    .innerJoin(users, eq(gpsLocations.userId, users.id))
    .where(and(eq(gpsLocations.orgId, user.orgId), gte(gpsLocations.timestamp, recentCutoff)))
    .orderBy(desc(gpsLocations.timestamp));

  // Deduplicate: keep only latest per driver
  const latestByDriver = new Map();
  for (const loc of locations) {
    if (!latestByDriver.has(loc.userId)) {
      latestByDriver.set(loc.userId, loc);
    }
  }

  return NextResponse.json({ drivers: Array.from(latestByDriver.values()) });
}
