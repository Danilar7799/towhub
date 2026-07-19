import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, or } from "drizzle-orm";

/*
 * Customer Tracking API — public endpoint (no auth required)
 *
 * GET /api/track?q=phone_or_id
 * Returns job status for customer self-service tracking
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Query required" }, { status: 400 });

  // Search by phone number or job ID
  const results = await db.select().from(jobs).where(
    or(
      eq(jobs.customerPhone, q),
      eq(jobs.id, q),
    )
  ).limit(1);

  if (results.length === 0) {
    return NextResponse.json({ job: null, message: "No job found" });
  }

  const job = results[0];

  // Return limited info for customer
  return NextResponse.json({
    job: {
      id: job.id,
      status: job.status,
      pickupAddress: job.pickupAddress,
      destinationAddress: job.destinationAddress,
      totalAmount: job.totalAmount,
      isPaid: job.isPaid,
      towVehicleMake: job.towVehicleMake,
      towVehicleModel: job.towVehicleModel,
      towVehicleYear: job.towVehicleYear,
      towVehicleColor: job.towVehicleColor,
      towVehiclePlate: job.towVehiclePlate,
      createdAt: job.createdAt,
      estimatedArrival: job.estimatedArrival,
    },
  });
}
