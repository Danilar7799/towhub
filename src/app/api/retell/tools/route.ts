import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, users, jobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * TowHub Tools API — called by Retell AI during calls
 * POST /api/retell/tools — execute tools that AI can call
 *
 * Tools:
 * - calculate_price: Calculate towing price based on pickup/destination/vehicle
 * - get_eta: Get estimated time of arrival for nearest driver
 * - get_driver_status: Check available drivers
 * - create_job: Create a new job from call data
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, parameters } = body;

    const orgId = parameters?.org_id;
    if (!orgId) {
      // Try to find org from phone number
      const orgs = await db.select().from(organizations).limit(1);
      if (orgs.length === 0) return NextResponse.json({ error: "No organization" }, { status: 404 });
      parameters.org_id = orgs[0].id;
    }

    switch (tool) {
      // ── Calculate Price ──
      case "calculate_price": {
        const { pickup_address, destination_address, vehicle_type, service_type } = parameters;

        // Get org rates
        const [org] = await db.select().from(organizations).where(eq(organizations.id, parameters.org_id)).limit(1);
        const orgSettings = (org?.settings as Record<string, unknown>) || {};
        const rateConfig = orgSettings.rates as Record<string, unknown> || {};

        // Default pricing (can be overridden per org)
        const baseFees: Record<string, number> = {
          "light_duty": 75,
          "medium_duty": 125,
          "heavy_duty": 200,
          "flatbed": 95,
          "wheel_lift": 75,
          "lockout": 65,
          "jump_start": 65,
          "tire_change": 65,
          "fuel_delivery": 75,
        };

        const perMileRates: Record<string, number> = {
          "light_duty": 3.50,
          "medium_duty": 5.00,
          "heavy_duty": 7.50,
          "flatbed": 4.00,
          "wheel_lift": 3.50,
        };

        const service = service_type || "light_duty";
        const baseFee = (rateConfig.baseFees as Record<string, number>)?.[service] || baseFees[service] || 75;
        const perMile = (rateConfig.perMile as Record<string, number>)?.[service] || perMileRates[service] || 3.50;

        // Estimate miles (simple calculation - in production use Google Maps API)
        // For now, return base fee + estimated miles
        let estimatedMiles = 10; // Default estimate
        let estimatedPrice = baseFee;

        if (destination_address) {
          // Simple heuristic: assume 10-30 miles for most tows
          estimatedMiles = 15;
          estimatedPrice = baseFee + (estimatedMiles * perMile);
        }

        // Round to nearest $5
        estimatedPrice = Math.round(estimatedPrice / 5) * 5;

        // After-hours surcharge (6pm-6am)
        const hour = new Date().getHours();
        const isAfterHours = hour >= 18 || hour < 6;
        const afterHoursFee = isAfterHours ? 25 : 0;

        // Holiday surcharge
        const total = estimatedPrice + afterHoursFee;

        return NextResponse.json({
          tool: "calculate_price",
          result: {
            base_fee: baseFee,
            per_mile_rate: perMile,
            estimated_miles: estimatedMiles,
            estimated_price: total,
            after_hours_surcharge: afterHoursFee,
            service_type: service,
            currency: "USD",
            note: isAfterHours ? "Includes after-hours surcharge ($25)" : "Standard hours pricing",
          },
        });
      }

      // ── Get ETA ──
      case "get_eta": {
        const { pickup_address } = parameters;

        // Get available drivers
        const availableDrivers = await db.select().from(users).where(
          and(
            eq(users.orgId, parameters.org_id),
            eq(users.role, "driver"),
            eq(users.isActive, true)
          )
        );

        if (availableDrivers.length === 0) {
          return NextResponse.json({
            tool: "get_eta",
            result: {
              eta_minutes: null,
              available_drivers: 0,
              message: "No drivers currently available. We will dispatch the nearest available driver as soon as possible.",
            },
          });
        }

        // Estimate ETA based on time of day and driver availability
        const hour = new Date().getHours();
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);
        const baseEta = isRushHour ? 35 : 20;
        const driverBonus = Math.min(availableDrivers.length * 5, 15); // More drivers = faster
        const etaMinutes = Math.max(baseEta - driverBonus, 10);

        return NextResponse.json({
          tool: "get_eta",
          result: {
            eta_minutes: etaMinutes,
            available_drivers: availableDrivers.length,
            message: `We have ${availableDrivers.length} driver${availableDrivers.length > 1 ? 's' : ''} available. Estimated arrival: ${etaMinutes} minutes.`,
          },
        });
      }

      // ── Get Driver Status ──
      case "get_driver_status": {
        const drivers = await db.select().from(users).where(
          and(
            eq(users.orgId, parameters.org_id),
            eq(users.role, "driver"),
            eq(users.isActive, true)
          )
        );

        return NextResponse.json({
          tool: "get_driver_status",
          result: {
            total_drivers: drivers.length,
            available: drivers.length,
            drivers: drivers.map(d => ({
              name: `${d.firstName} ${d.lastName}`,
              available: true,
            })),
          },
        });
      }

      // ── Create Job ──
      case "create_job": {
        const {
          customer_name, customer_phone, pickup_address, destination_address,
          vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate,
          service_type, estimated_price, notes, call_id,
        } = parameters;

        const [job] = await db.insert(jobs).values({
          orgId: parameters.org_id,
          status: "pending",
          source: "ai_dispatcher",
          customerName: customer_name || "AI Caller",
          customerPhone: customer_phone || "",
          pickupAddress: pickup_address || "Address from call",
          destinationAddress: destination_address,
          towVehicleMake: vehicle_make,
          towVehicleModel: vehicle_model,
          towVehicleYear: vehicle_year ? parseInt(vehicle_year) : undefined,
          towVehicleColor: vehicle_color,
          towVehiclePlate: vehicle_plate,
          totalAmount: estimated_price ? parseFloat(estimated_price) : undefined,
          notes: notes || `AI Dispatch Call${call_id ? ` (${call_id})` : ""}`,
        }).returning();

        return NextResponse.json({
          tool: "create_job",
          result: {
            success: true,
            job_id: job.id,
            status: "pending",
            message: `Job created successfully. Job ID: ${job.id}. A driver will be dispatched shortly.`,
          },
        });
      }

      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[Retell Tools] Error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    available_tools: [
      {
        name: "calculate_price",
        description: "Calculate towing price based on pickup address, destination, and vehicle type",
        parameters: ["pickup_address", "destination_address", "vehicle_type", "service_type"],
      },
      {
        name: "get_eta",
        description: "Get estimated time of arrival for nearest available driver",
        parameters: ["pickup_address"],
      },
      {
        name: "get_driver_status",
        description: "Check how many drivers are available",
        parameters: [],
      },
      {
        name: "create_job",
        description: "Create a new towing job from call data",
        parameters: ["customer_name", "customer_phone", "pickup_address", "destination_address", "vehicle_make", "vehicle_model", "vehicle_year", "vehicle_color", "vehicle_plate", "service_type", "estimated_price"],
      },
    ],
  });
}