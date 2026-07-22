import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, rateSheets } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Bland.ai Tool — Calculate Trip Price with Time-based Multipliers
 *
 * Called BY Bland.ai during the call.
 * Returns estimated price based on:
 * - Distance (OSRM routing)
 * - Rate sheet (base + per mile)
 * - Time of day multiplier (day/evening/night)
 * - Weekend multiplier
 * - Holiday multiplier
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pickup_lat, pickup_lng, dest_lat, dest_lng, service_type, org_id } = body;

    const orgId = org_id || body.metadata?.org_id || "pacific-towing";
    if (!orgId) return NextResponse.json({ error: "org_id required" }, { status: 400 });

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    // Get rate sheet
    const [rateSheet] = await db.select().from(rateSheets).where(eq(rateSheets.orgId, orgId)).limit(1);
    const rates = (rateSheet?.rates as Array<{ service: string; label: string; base: number; perMile: number; minCharge: number }>) || [];

    // Default rates if no rate sheet
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

      // Fallback to haversine
      if (distance === 0) {
        distance = haversine(pickup_lat, pickup_lng, dest_lat, dest_lng);
        duration = Math.round(distance / 0.5);
      }
    }

    // Calculate base price
    const mileageCharge = distance * rate.perMile;
    const basePrice = Math.max(rate.base + mileageCharge, rate.minCharge);

    // Time-based multipliers
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0=Sun, 6=Sat
    const isWeekend = day === 0 || day === 6;
    const isNight = hour >= 22 || hour < 6;      // 10pm - 6am
    const isEvening = hour >= 18 && hour < 22;    // 6pm - 10pm
    const isHoliday = false; // TODO: check holiday calendar

    // Get multipliers from rate sheet or use defaults
    const nightMultiplier = rateSheet?.afterHoursMultiplier || 1.5;
    const weekendMultiplier = rateSheet?.weekendMultiplier || 1.25;
    const holidayMultiplier = rateSheet?.holidayMultiplier || 2.0;
    const eveningMultiplier = 1.25; // 25% surcharge for evening

    // Determine which multiplier applies
    let timeLabel = "Daytime";
    let multiplier = 1;

    if (isHoliday) {
      multiplier = holidayMultiplier;
      timeLabel = "Holiday";
    } else if (isNight) {
      multiplier = nightMultiplier;
      timeLabel = "Night (10PM-6AM)";
    } else if (isEvening) {
      multiplier = eveningMultiplier;
      timeLabel = "Evening (6PM-10PM)";
    } else if (isWeekend) {
      multiplier = weekendMultiplier;
      timeLabel = "Weekend";
    }

    const finalPrice = Math.round(basePrice * multiplier * 100) / 100;

    return NextResponse.json({
      service: rate.label,
      distance_miles: distance,
      duration_minutes: duration,
      base_rate: rate.base,
      per_mile: rate.perMile,
      mileage_charge: Math.round(mileageCharge * 100) / 100,
      time_period: timeLabel,
      multiplier: multiplier,
      multiplier_reason: multiplier > 1 ? `${timeLabel} rate (${multiplier}x)` : "Standard daytime rate",
      estimated_price: finalPrice,
      min_charge: rate.minCharge,
      currency: "USD",
      message: `The estimated price for this ${rate.label} is $${finalPrice}. ${distance > 0 ? `Distance: ${distance} miles, approximately ${duration} minutes. ` : ""}${multiplier > 1 ? `${timeLabel} rate applies (${multiplier}x).` : ""}`
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
