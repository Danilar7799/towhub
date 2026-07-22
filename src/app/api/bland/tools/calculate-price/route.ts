import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, rateSheets, gpsLocations, users, shifts } from "@/db/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

/*
 * Enhanced Bland.ai Tool — Calculate Trip Price + ETA + Driver Availability
 *
 * Returns:
 * - Estimated price (with time-based multipliers)
 * - ETA based on nearest available driver
 * - Number of available drivers
 * - Fallback message if no drivers available
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pickup_lat, pickup_lng, dest_lat, dest_lng, service_type, org_id } = body;

    const orgId = org_id || body.metadata?.org_id || "pacific-towing";

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    // Get rate sheet
    const [rateSheet] = await db.select().from(rateSheets).where(eq(rateSheets.orgId, orgId)).limit(1);
    const rates = (rateSheet?.rates as Array<{ service: string; label: string; base: number; perMile: number; minCharge: number }>) || [];

    const defaultRates = [
      { service: "tow", label: "Standard Tow", base: 75, perMile: 3.50, minCharge: 50 },
      { service: "lockout", label: "Lockout", base: 45, perMile: 0, minCharge: 45 },
      { service: "jump_start", label: "Jump Start", base: 40, perMile: 0, minCharge: 40 },
      { service: "tire_change", label: "Tire Change", base: 35, perMile: 0, minCharge: 35 },
      { service: "fuel_delivery", label: "Fuel Delivery", base: 50, perMile: 2.00, minCharge: 50 },
      { service: "winch_out", label: "Winch Out", base: 100, perMile: 0, minCharge: 75 },
    ];

    const allRates = rates.length > 0 ? rates : defaultRates;
    const serviceKey = service_type || "tow";
    const rate = allRates.find(r => r.service === serviceKey) || allRates[0];

    // Calculate distance via OSRM
    let distance = 0;
    let duration = 0;
    if (pickup_lat && pickup_lng && dest_lat && dest_lng) {
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
      if (distance === 0) {
        distance = haversine(pickup_lat, pickup_lng, dest_lat, dest_lng);
        duration = Math.round(distance / 0.5);
      }
    }

    // Calculate price
    const mileageCharge = distance * rate.perMile;
    const basePrice = Math.max(rate.base + mileageCharge, rate.minCharge);

    // Time multipliers
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const isNight = hour >= 22 || hour < 6;
    const isEvening = hour >= 18 && hour < 22;

    const nightMult = rateSheet?.afterHoursMultiplier || 1.5;
    const weekendMult = rateSheet?.weekendMultiplier || 1.25;
    const holidayMult = rateSheet?.holidayMultiplier || 2.0;
    const eveningMult = 1.25;

    let timeLabel = "Daytime";
    let multiplier = 1;
    if (isNight) { multiplier = nightMult; timeLabel = "Night (10PM-6AM)"; }
    else if (isEvening) { multiplier = eveningMult; timeLabel = "Evening (6PM-10PM)"; }
    else if (isWeekend) { multiplier = weekendMult; timeLabel = "Weekend"; }

    const finalPrice = Math.round(basePrice * multiplier * 100) / 100;

    // ========== FIND NEAREST AVAILABLE DRIVER ==========
    let nearestDriver = null;
    let availableCount = 0;
    let etaMinutes = null;

    if (pickup_lat && pickup_lng) {
      // Get all drivers in org
      const drivers = await db.select().from(users).where(
        and(eq(users.orgId, orgId), eq(users.role, "driver"), eq(users.isActive, true))
      );

      // Get latest GPS for each driver (last 30 min)
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentLocations = await db.select().from(gpsLocations)
        .where(and(eq(gpsLocations.orgId, orgId), gte(gpsLocations.timestamp, thirtyMinAgo)))
        .orderBy(desc(gpsLocations.timestamp));

      // Deduplicate: latest per driver
      const latestByDriver = new Map<string, typeof recentLocations[0]>();
      for (const loc of recentLocations) {
        if (!latestByDriver.has(loc.userId)) latestByDriver.set(loc.userId, loc);
      }

      // Get active shifts
      const activeShifts = await db.select().from(shifts).where(
        and(eq(shifts.orgId, orgId), sql`${shifts.endedAt} IS NULL`)
      );
      const onShiftDriverIds = new Set(activeShifts.map(s => s.driverId));

      // Filter available drivers (online + on shift + has recent GPS)
      const availableDrivers = drivers.filter(d => {
        const loc = latestByDriver.get(d.id);
        const onShift = onShiftDriverIds.has(d.id);
        return loc && loc.isOnline && onShift;
      });

      availableCount = availableDrivers.length;

      if (availableCount > 0) {
        // Find nearest
        let nearestDist = Infinity;
        let nearestDriverData: typeof availableDrivers[0] | null = null;
        let nearestLoc: typeof recentLocations[0] | null = null;

        for (const driver of availableDrivers) {
          const loc = latestByDriver.get(driver.id)!;
          const dist = haversine(pickup_lat, pickup_lng, loc.lat, loc.lng);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestDriverData = driver;
            nearestLoc = loc;
          }
        }

        if (nearestDriverData && nearestLoc) {
          // ETA: distance to pickup / average speed (30 mph city)
          etaMinutes = Math.round(nearestDist / 0.5);

          nearestDriver = {
            name: `${nearestDriverData.firstName} ${nearestDriverData.lastName}`,
            distance_miles: Math.round(nearestDist * 10) / 10,
            eta_minutes: etaMinutes,
            is_online: true,
          };
        }
      }
    }

    // Build response message for Bland.ai to read
    let message = `The estimated price for this ${rate.label} is $${finalPrice}.`;
    if (distance > 0) message += ` Distance: ${distance} miles, trip time approximately ${duration} minutes.`;
    if (multiplier > 1) message += ` ${timeLabel} rate applies (${multiplier}x).`;

    if (nearestDriver) {
      message += ` We have a driver ${nearestDriver.distance_miles} miles away. Estimated arrival: ${etaMinutes} minutes.`;
    } else if (availableCount === 0) {
      message += ` All our drivers are currently busy. We will dispatch the next available driver as soon as possible. You will receive a text update.`;
    }

    return NextResponse.json({
      // Pricing
      service: rate.label,
      distance_miles: distance,
      duration_minutes: duration,
      estimated_price: finalPrice,
      time_period: timeLabel,
      multiplier,
      // Driver info
      nearest_driver: nearestDriver,
      available_drivers: availableCount,
      eta_minutes: etaMinutes,
      // Message for Bland.ai to read
      message,
      // Fallback if no drivers
      fallback: availableCount === 0 ? "No drivers available - notify owner" : null,
    });
  } catch (err) {
    console.error("Bland tool error:", err);
    return NextResponse.json({
      error: "System temporarily unavailable",
      message: "I'm having trouble accessing our system right now. Let me take your details and someone will call you back shortly.",
      fallback: "system_error",
    }, { status: 200 }); // Return 200 so Bland.ai can read the message
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}
