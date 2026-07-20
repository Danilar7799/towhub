import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/*
 * Auction Transport Orders API
 *
 * Tow companies receive transport requests from auction platforms.
 * They don't buy cars — they tow/transport them for the auction company.
 *
 * GET  /api/auctions — list transport orders (filter by platform, status)
 * POST /api/auctions — accept/decline order
 * PUT  /api/auctions — update order status
 *
 * Platforms: Copart, IAA, Manheim, ADESA, BacklotCars, Pipeline
 * Workflow: pending → accepted → dispatched → picked_up → in_transit → delivered
 *
 * In production, orders come via:
 * - Webhooks from auction company APIs
 * - Email parsing (auction sends dispatch emails)
 * - Manual entry from dispatch board
 * - EDI integration for large companies
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");

  // In production, this queries a real auction_orders table
  // For now, return mock data structure
  return NextResponse.json({
    orders: [],
    message: "Connect auction platforms in Settings → Integrations to receive transport orders",
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { orderId, action, driverId, vehicleId, eta } = body;

  if (!orderId || !action) return NextResponse.json({ error: "orderId and action required" }, { status: 400 });

  // In production, this updates the order in the database
  // and notifies the auction platform via webhook

  if (action === "accept") {
    return NextResponse.json({
      ok: true,
      message: "Order accepted. Assign a driver to dispatch.",
    });
  }

  if (action === "decline") {
    return NextResponse.json({
      ok: true,
      message: "Order declined.",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { orderId, status, driverId, notes } = body;

  if (!orderId || !status) return NextResponse.json({ error: "orderId and status required" }, { status: 400 });

  const validStatuses = ["accepted", "dispatched", "picked_up", "in_transit", "delivered"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Valid: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  // In production, update DB and notify auction platform
  return NextResponse.json({
    ok: true,
    message: `Order status updated to ${status}`,
  });
}
