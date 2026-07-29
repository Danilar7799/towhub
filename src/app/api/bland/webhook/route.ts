import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, jobs, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { parseTranscriptWithLLM, parseTranscriptRegex } from "@/lib/transcript-parser";

/*
 * Bland.ai Webhook — receives call transcripts and creates jobs
 * 
 * Now with LLM fallback for robust transcript parsing
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

    // Parse transcript with regex first, then LLM fallback
    const fullTranscript = concatenated_transcript || transcript || "";
    let parsed = parseTranscriptRegex(fullTranscript);
    
    // If regex parsing yields poor results, try LLM
    const hasGoodParse = parsed.pickupAddress || parsed.destinationAddress || parsed.vehicleMake;
    if (!hasGoodParse && fullTranscript.length > 50) {
      console.log("[Bland Webhook] Regex parse weak, trying LLM fallback...");
      const llmParsed = await parseTranscriptWithLLM(fullTranscript);
      if (llmParsed) {
        parsed = { ...parsed, ...llmParsed };
        console.log("[Bland Webhook] LLM parse succeeded:", parsed);
      }
    }

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
      towVehiclePlate: parsed.vehiclePlate,
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
      parseMethod: hasGoodParse ? "regex" : "llm_fallback",
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
      caller_id: "+155****4567",
      duration: 120,
      metadata: { org_id: "your-org-id" },
    },
  });
}