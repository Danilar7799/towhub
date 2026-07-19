import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, jobs, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Bland.ai Webhook — receives call transcripts and creates jobs
 * 
 * Bland.ai sends a POST after each call with:
 * - transcript: full conversation text
 * - caller_id: phone number
 * - duration: call length in seconds
 * - metadata: custom fields we pass in
 *
 * We parse the transcript to extract:
 * - Customer name, phone
 * - Pickup address
 * - Destination (if mentioned)
 * - Vehicle info
 * - Urgency
 */

interface BlandWebhook {
  call_id: string;
  transcript: string;
  concatenated_transcript: string;
  caller_id: string;
  to: string;
  duration: number;
  recording_url?: string;
  metadata?: Record<string, string>;
  status: string;
  started_at: string;
  ended_at: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: BlandWebhook = await req.json();
    const { transcript, concatenated_transcript, caller_id, duration, recording_url, metadata, started_at, ended_at } = body;

    const orgId = metadata?.org_id;
    if (!orgId) {
      return NextResponse.json({ error: "org_id required in metadata" }, { status: 400 });
    }

    // Verify org exists
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    // Parse transcript to extract job details
    const fullTranscript = concatenated_transcript || transcript || "";
    const parsed = parseTranscript(fullTranscript);

    // Find nearest available driver (simple: first active driver in org)
    const [availableDriver] = await db.select().from(users).where(and(eq(users.orgId, orgId), eq(users.role, "driver"), eq(users.isActive, true))).limit(1);

    // Create job
    const [job] = await db.insert(jobs).values({
      orgId,
      status: "pending",
      source: "ai_dispatcher",
      customerName: parsed.customerName || "AI Caller",
      customerPhone: caller_id,
      pickupAddress: parsed.pickupAddress || "Address from call",
      destinationAddress: parsed.destinationAddress,
      towVehicleMake: parsed.vehicleMake,
      towVehicleModel: parsed.vehicleModel,
      towVehicleYear: parsed.vehicleYear,
      towVehicleColor: parsed.vehicleColor,
      notes: `AI Dispatch Call\nDuration: ${duration}s\nTranscript: ${fullTranscript.slice(0, 500)}`,
      assignedDriverId: availableDriver?.id,
    }).returning();

    // If forced dispatch is enabled, auto-assign
    const settings = org.settings as Record<string, unknown>;
    const dispatchSettings = settings?.dispatch as Record<string, unknown>;
    if (dispatchSettings?.forcedDispatch && availableDriver) {
      await db.update(jobs).set({ status: "assigned", assignedAt: new Date() }).where(eq(jobs.id, job.id));
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
      parsed,
      assignedDriver: availableDriver ? `${availableDriver.firstName} ${availableDriver.lastName}` : null,
    });
  } catch (err) {
    console.error("Bland webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — return webhook config instructions
export async function GET() {
  return NextResponse.json({
    instructions: "Configure this URL in your Bland.ai dashboard as the webhook endpoint.",
    url: "/api/bland/webhook",
    method: "POST",
    requiredMetadata: { org_id: "Your organization ID from TowHub" },
    examplePayload: {
      call_id: "call_123",
      transcript: "Customer: I need a tow from 123 Main St to 456 Oak Ave. My car is a 2020 Honda Civic, blue.",
      caller_id: "+15551234567",
      duration: 120,
      metadata: { org_id: "your-org-id" },
    },
  });
}

function parseTranscript(text: string) {
  const lower = text.toLowerCase();

  // Extract customer name
  const nameMatch = text.match(/(?:my name is|i'm|this is|calling for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  const customerName = nameMatch?.[1] || null;

  // Extract addresses (look for common patterns)
  const addressPatterns = [
    /(?:pickup|pick up|come to|at|from|located at|address is|tow from)\s+(.+?)(?:\.|,|$)/i,
    /(\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct))/i,
  ];
  
  let pickupAddress = null;
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match) { pickupAddress = match[1].trim().slice(0, 200); break; }
  }

  // Extract destination
  const destMatch = text.match(/(?:to|going to|destination|drop off|deliver to)\s+(.+?)(?:\.|,|$)/i);
  const destinationAddress = destMatch?.[1]?.trim().slice(0, 200) || null;

  // Extract vehicle info
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const vehicleYear = yearMatch ? parseInt(yearMatch[0]) : null;

  const makes = ["honda", "toyota", "ford", "chevy", "chevrolet", "nissan", "bmw", "mercedes", "audi", "hyundai", "kia", "mazda", "subaru", "dodge", "ram", "gmc", "jeep", "lexus", "acura", "volkswagen", "vw"];
  const vehicleMake = makes.find(m => lower.includes(m)) || null;

  const colors = ["black", "white", "silver", "gray", "red", "blue", "green", "yellow", "orange", "brown"];
  const vehicleColor = colors.find(c => lower.includes(c)) || null;

  const modelMatch = text.match(new RegExp(`(?:${makes.join("|")})\\s+([a-zA-Z\\s]+?)(?:\\s|,|\\.|$)`, "i"));
  const vehicleModel = modelMatch?.[1]?.trim() || null;

  return { customerName, pickupAddress, destinationAddress, vehicleMake, vehicleModel, vehicleYear, vehicleColor };
}
