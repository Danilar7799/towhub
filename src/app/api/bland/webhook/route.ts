import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, jobs, users, callLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { parseTranscriptWithLLM, parseTranscriptRegex } from "@/lib/transcript-parser";

/*
 * Bland.ai Webhook — receives call transcripts and creates jobs
 * 
 * Now with:
 * - LLM fallback for robust transcript parsing
 * - Call log storage
 * - AI summary generation
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

// Simple summary generator from transcript
function generateSummary(transcript: string, parsed: Record<string, unknown>): string {
  const parts: string[] = [];

  if (parsed.customerName) parts.push(`Caller: ${parsed.customerName}`);
  if (parsed.pickupAddress) parts.push(`Location: ${parsed.pickupAddress}`);
  if (parsed.destinationAddress) parts.push(`Destination: ${parsed.destinationAddress}`);
  if (parsed.vehicleMake || parsed.vehicleModel) {
    parts.push(`Vehicle: ${[parsed.vehicleMake, parsed.vehicleModel, parsed.vehicleYear, parsed.vehicleColor].filter(Boolean).join(" ")}`);
  }
  if (parsed.vehiclePlate) parts.push(`Plate: ${parsed.vehiclePlate}`);

  // Extract call type from transcript
  const lower = transcript.toLowerCase();
  if (lower.includes("impound") || lower.includes("impounded")) parts.push("Type: Impound inquiry");
  else if (lower.includes("junk") || lower.includes("scrap") || lower.includes("non-running")) parts.push("Type: Junk car removal");
  else if (lower.includes("fleet") || lower.includes("commercial") || lower.includes("business")) parts.push("Type: Fleet/commercial");
  else if (lower.includes("tow") || lower.includes("breakdown") || lower.includes("accident") || lower.includes("lockout") || lower.includes("jump") || lower.includes("tire")) parts.push("Type: Roadside assistance");

  if (parts.length === 0) return "Call completed. No details extracted.";

  return parts.join(" • ");
}

export async function POST(req: NextRequest) {
  try {
    const body: BlandWebhook = await req.json();
    const { call_id, transcript, concatenated_transcript, caller_id, duration, recording_url, metadata, status, started_at, ended_at } = body;

    // Try to get org_id from metadata, or find by phone number
    let orgId = metadata?.org_id;

    if (!orgId) {
      // Find org by the Bland phone number (to field) — normalize for comparison
      const normalize = (p: string) => p.replace(/\D/g, ""); // digits only
      const toDigits = normalize(body.to || "");
      const orgs = await db.select().from(organizations);
      const org = orgs.find(o => {
        const settings = o.settings as Record<string, unknown>;
        const blandConfig = settings?.blandConfig as Record<string, unknown>;
        const configPhone = normalize(String(blandConfig?.phoneNumber || ""));
        const blandPhone = normalize(String(o.blandPhoneNumber || ""));
        return configPhone === toDigits || blandPhone === toDigits || toDigits.endsWith(configPhone) || toDigits.endsWith(blandPhone);
      });
      if (org) orgId = org.id;
    }

    if (!orgId) {
      console.log("[Bland Webhook] No org found for call:", call_id);
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
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

    // Generate summary
    const summary = generateSummary(fullTranscript, parsed as Record<string, unknown>);

    // Determine call type
    const lower = fullTranscript.toLowerCase();
    let callType = "roadside";
    if (lower.includes("impound") || lower.includes("impounded")) callType = "impound";
    else if (lower.includes("junk") || lower.includes("scrap")) callType = "junk_car";
    else if (lower.includes("fleet") || lower.includes("commercial")) callType = "fleet";

    // Determine urgency
    let urgency = "medium";
    if (lower.includes("emergency") || lower.includes("accident") || lower.includes("injured")) urgency = "emergency";
    else if (lower.includes("urgent") || lower.includes("highway") || lower.includes("stuck")) urgency = "high";

    // Find nearest available driver
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
      notes: `AI Dispatch Call\nDuration: ${duration}s\nSummary: ${summary}`,
      assignedDriverId: availableDriver?.id,
    }).returning();

    // If forced dispatch is enabled, auto-assign
    const settings = org.settings as Record<string, unknown>;
    const dispatchSettings = settings?.dispatch as Record<string, unknown>;
    if (dispatchSettings?.forcedDispatch && availableDriver) {
      await db.update(jobs).set({ status: "assigned", assignedAt: new Date() }).where(eq(jobs.id, job.id));
    }

    // Store call log
    await db.insert(callLogs).values({
      orgId,
      blandCallId: call_id,
      callerPhone: caller_id,
      callerName: parsed.customerName,
      status: "completed",
      duration: duration || 0,
      transcript: fullTranscript,
      summary,
      callType,
      serviceNeeded: parsed.serviceType,
      pickupAddress: parsed.pickupAddress,
      vehicleInfo: [parsed.vehicleMake, parsed.vehicleModel, parsed.vehicleYear, parsed.vehicleColor].filter(Boolean).join(" ") || undefined,
      urgency,
      recordingUrl: recording_url,
      jobId: job.id,
      metadata: metadata as Record<string, unknown>,
      startedAt: started_at ? new Date(started_at) : null,
      endedAt: ended_at ? new Date(ended_at) : null,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      summary,
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