import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/*
 * Route Optimization — find optimal route for multiple stops
 *
 * POST /api/route/optimize
 * { stops: [{ lat, lng, address }], startLat, startLng }
 *
 * Returns optimized order of stops using nearest-neighbor heuristic.
 * For production, use Google Directions API or Mapbox Optimization API.
 */

interface Stop {
  lat: number;
  lng: number;
  address: string;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stops, startLat, startLng } = await req.json();
  if (!stops || stops.length < 2) return NextResponse.json({ error: "At least 2 stops required" }, { status: 400 });

  const start: Stop = { lat: startLat || 0, lng: startLng || 0, address: "Start" };

  // Nearest-neighbor heuristic
  const optimized = nearestNeighbor(start, stops);

  // Calculate total distance
  let totalDistance = 0;
  let current = start;
  for (const stop of optimized) {
    totalDistance += haversine(current.lat, current.lng, stop.lat, stop.lng);
    current = stop;
  }

  return NextResponse.json({
    optimizedStops: optimized,
    totalDistance: Math.round(totalDistance * 10) / 10,
    estimatedMinutes: Math.round(totalDistance / 0.5), // ~30mph avg
    algorithm: "nearest-neighbor",
  });
}

function nearestNeighbor(start: Stop, stops: Stop[]): Stop[] {
  const remaining = [...stops];
  const route: Stop[] = [];
  let current = start;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current.lat, current.lng, remaining[i].lat, remaining[i].lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    route.push(remaining[nearestIdx]);
    current = remaining[nearestIdx];
    remaining.splice(nearestIdx, 1);
  }

  return route;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number { return deg * Math.PI / 180; }
