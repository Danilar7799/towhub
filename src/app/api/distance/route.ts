import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Route & Distance API — supports OSRM (free) and Google Maps
 *
 * POST /api/distance
 * { origin: { lat, lng }, destination: { lat, lng }, provider?: "osrm" | "google" }
 *
 * Returns: distance (miles), duration (minutes), route geometry
 *
 * Provider selection:
 * 1. Explicit provider parameter
 * 2. Org settings (super admin can set default)
 * 3. Fallback to OSRM (free)
 */

interface Coordinate { lat: number; lng: number; }

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { origin, destination, provider: requestedProvider } = await req.json();
  if (!origin || !destination) return NextResponse.json({ error: "origin and destination required" }, { status: 400 });

  // Determine provider
  let provider = requestedProvider || "osrm";
  if (!requestedProvider && user.orgId) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
    const settings = (org?.settings as Record<string, unknown>) || {};
    const mapSettings = (settings.mapProvider as Record<string, string>) || {};
    provider = mapSettings.provider || "osrm";
  }

  try {
    if (provider === "google") {
      return await googleDistance(origin, destination);
    }
    return await osrmDistance(origin, destination);
  } catch (err) {
    console.error("Distance API error:", err);
    // Fallback to haversine
    const dist = haversine(origin.lat, origin.lng, destination.lat, destination.lng);
    return NextResponse.json({
      distance: Math.round(dist * 10) / 10,
      duration: Math.round(dist / 0.5),
      provider: "haversine (fallback)",
      geometry: null,
    });
  }
}

async function osrmDistance(origin: Coordinate, destination: Coordinate) {
  // OSRM free public server
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);

  const data = await res.json();
  if (!data.routes || data.routes.length === 0) throw new Error("No route found");

  const route = data.routes[0];
  const distanceMeters = route.distance;
  const durationSeconds = route.duration;

  return NextResponse.json({
    distance: Math.round((distanceMeters / 1609.34) * 10) / 10, // meters to miles
    duration: Math.round(durationSeconds / 60), // seconds to minutes
    provider: "osrm",
    geometry: route.geometry, // GeoJSON LineString
  });
}

async function googleDistance(origin: Coordinate, destination: Coordinate) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    // Fallback to OSRM
    return await osrmDistance(origin, destination);
  }

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&key=${apiKey}&units=imperial`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google API error: ${res.status}`);

  const data = await res.json();
  if (data.status !== "OK") throw new Error(`Google API status: ${data.status}`);

  const element = data.rows[0]?.elements[0];
  if (!element || element.status !== "OK") throw new Error("No route found");

  return NextResponse.json({
    distance: Math.round((element.distance.value / 1609.34) * 10) / 10,
    duration: Math.round(element.duration.value / 60),
    provider: "google",
    geometry: null,
  });
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number { return deg * Math.PI / 180; }
