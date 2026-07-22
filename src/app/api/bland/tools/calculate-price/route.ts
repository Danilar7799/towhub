import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, rateSheets } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Bland.ai Tool — Calculate Trip Price
 *
 * This endpoint is called BY Bland.ai during the call (function calling).
 * It receives pickup and destination addresses, calculates distance,
 * looks up the rate sheet, and returns estimated price.
 *
 * Bland.ai Tool Configuration:
 * {
 *   "name": "calculate_trip_price",
 *   "description": "Calculate the estimated price for a towing trip based on pickup and destination",
 *   "url": "https://towhub.vercel.app/api/bland/tools/calculate-price",
 *   "method": "POST",
 *   "parameters": {
 *     "pickup_lat": { "type": "number", "description": "Pickup latitude" },
 *     "pickup_lng": { "type": "number", "description": "Pickup longitude" },
 *     "dest_lat": { "type": "number", "description": "Destination latitude" },
 *     "dest_lng": { "type": "number", "description": "Destination longitude" },
 *     "service_type": { "type": "string", "description": "Service type: tow, lockout, jump_start, tire_change, fuel_delivery, winch_out" }
 *   }
 * }
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pickup_lat, pickup_lng, dest_lat, dest_lng, service_type, org_id } = body;

    // Get org and rate sheet
    const orgId = org_id || body.metadata?.org_id;
    if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    // Get rate sheet
    const [rateSheet] = await db.select().from(rateSheets).where(eq(rateSheets.orgId, orgId)).limit(1);
    const rates = (rateSheet?.rates as Array<{ service: string; label: string; base: number; perMile: number; minCharge: number }>) || [];

    // Find matching rate
    const serviceKey = service_type || "tow";
    const rate = rates.find(r => r.service === serviceKey) || rates[0] || { base: 75, perMile: 3.50, minCharge: 50, label: "Standard Tow" };

    // Calculate distance
    let distance = 0;
    let duration = 0;

    if (pickup_lat && pickup_lng && dest_lat && dest_lng) {
      // Try OSRM first
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup_lng},${pickup_lat};${dest_lng},${dest_lat}`;
        const osrmRes = await fetch(osrmUrl);
        if (osrmRes.ok) {
          const osrmData = await osrmRes.json();
          if (osrmData.routes?.[0]) {
            distance = Math.round((osrmData.routes[0].distance / 1609.34) * 10) / 10;
            duration = Math.round(osrmData.routes[0].duration / 60);
          }
        }
      } catch {}

      // Fallback to haversine
      if (distance === 0) {
        distance = haversine(pickup_lat, pickup_lng, dest_lat, dest_lng);
        duration = Math.round(distance / 0.5);
      }
    }

    // Calculate price
    const mileageCharge = distance * rate.perMile;
    const estimatedPrice = Math.max(rate.base + mileageCharge, rate.minCharge);

    // Apply multipliers for time of day
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 6;
    const isWeekend = [0, 6].includes(new Date().getDay());
    const multiplier = isNight ? (rateSheet?.afterHoursMultiplier || 1.5) : isWeekend ? (rateSheet?.weekendMultiplier || 1.25) : 1;
    const finalPrice = Math.round(estimatedPrice * multiplier * 100) / 100;

    return NextResponse.json({
      service: rate.label,
      distance_miles: distance,
      duration_minutes: duration,
      base_rate: rate.base,
      per_mile: rate.perMile,
      mileage_charge: Math.round(mileageCharge * 100) / 100,
      multiplier: multiplier > 1 ? `${isNight ? "night" : "weekend"} (${multiplier}x)` : "standard",
      estimated_price: finalPrice,
      min_charge: rate.minCharge,
      currency: "USD",
    });
  } catch (err) {
    console.error("Bland tool error:", err);
    return NextResponse.json({ error: "Calculation failed" }, { status: 500 });
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
