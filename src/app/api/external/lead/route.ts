import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, leads } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Public API — bolt.new websites (or any external form) POST leads here.
 *
 * POST /api/external/lead
 * Headers: Authorization: Bearer <API_KEY>  (or X-API-Key: <API_KEY>)
 * Body JSON:
 *   { name, phone, email, message, pickup, destination, source }
 *
 * The API key identifies which towing company the lead belongs to.
 */

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Extract API key from header
    const authHeader = req.headers.get("authorization") || "";
    const xApiKey = req.headers.get("x-api-key") || "";
    const apiKey = authHeader.replace("Bearer ", "") || xApiKey;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API key. Pass via Authorization: Bearer <key> or X-API-Key header." },
        { status: 401 }
      );
    }

    // Find org by API key
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.apiKey, apiKey))
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    if (org.status !== "approved") {
      return NextResponse.json({ error: "Organization not active" }, { status: 403 });
    }

    // Parse body
    const body = await req.json();
    const { name, phone, email, message, pickup, destination, source, vehicle_make, vehicle_model, vehicle_year, vehicle_color } = body;

    if (!name && !phone && !email) {
      return NextResponse.json({ error: "At least name, phone, or email required" }, { status: 400 });
    }

    // Create lead
    const [lead] = await db
      .insert(leads)
      .values({
        orgId: org.id,
        source: source || "website",
        customerName: name || null,
        customerPhone: phone || null,
        customerEmail: email || null,
        message: [
          message,
          vehicle_make ? `Vehicle: ${vehicle_make} ${vehicle_model || ""} ${vehicle_year || ""} ${vehicle_color || ""}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        pickupAddress: pickup || null,
        destinationAddress: destination || null,
      })
      .returning();

    return NextResponse.json(
      { success: true, leadId: lead.id, message: "Lead received" },
      {
        status: 201,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  } catch (err) {
    console.error("External lead error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
