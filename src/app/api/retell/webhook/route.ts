import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, jobs, users, callLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { parseTranscriptWithLLM, parseTranscriptRegex } from "@/lib/transcript-parser";

/*
 * Retell AI Webhook — receives call transcripts and creates jobs
 * 
 * Retell sends webhook events:
 * - call_started: when call begins
 * - call_ended: when call ends (main event with transcript)
 * - call_analyzed: post-call analysis
 *
 * Webhook payload: https://docs.retellai.com/monitor/register-handle-webhooks
 */

interface RetellWebhook {
  event: "call_started" | "call_ended" | "call_analyzed";
  call: {
    call_id: string;
    agent_id: string;
    call_status: string;
    start_timestamp: number;
    end_timestamp: number;
    transcript: string;
    recording_url: string;
    duration_ms: number;
    telephony_identifier?: {
      twilio_call_sid?: string;
    };
    call_analysis?: {
      call_summary: string;
      user_sentiment: string;
      custom_analysis_data: Record<string, unknown>;
    };
    metadata?: Record<string, string>;
    from_number?: string;
    to_number?: string;
  };
}

function generateSummary(transcript: string, parsed: Record<string, unknown>): string {
  const parts: string[] = [];
  if (parsed.customerName) parts.push(`Caller: ${parsed.customerName}`);
  if (parsed.pickupAddress) parts.push(`Location: ${parsed.pickupAddress}`);
  if (parsed.destinationAddress) parts.push(`Destination: ${parsed.destinationAddress}`);
  if (parsed.vehicleMake || parsed.vehicleModel) {
    parts.push(`Vehicle: ${[parsed.vehicleMake, parsed.vehicleModel, parsed.vehicleYear, parsed.vehicleColor].filter(Boolean).join(" ")}`);
  }
  if (parsed.vehiclePlate) parts.push(`Plate: ${parsed.vehiclePlate}`);

  const lower = transcript.toLowerCase();
  if (lower.includes("impound") || lower.includes("impounded")) parts.push("Type: Impound inquiry");
  else if (lower.includes("junk") || lower.includes("scrap")) parts.push("Type: Junk car removal");
  else if (lower.includes("fleet") || lower.includes("commercial")) parts.push("Type: Fleet/commercial");
  else if (lower.includes("tow") || lower.includes("breakdown") || lower.includes("accident")) parts.push("Type: Roadside assistance");

  return parts.length > 0 ? parts.join(" • ") : "Call completed.";
}

export async function POST(req: NextRequest) {
  try {
    const body: RetellWebhook = await req.json();
    const { event, call } = body;

    // Only process call_ended events (has full transcript)
    if (event !== "call_ended" && event !== "call_analyzed") {
      return NextResponse.json({ received: true, event });
    }

    const { call_id, transcript, duration_ms, recording_url, metadata, from_number, to_number, call_analysis } = call;

    // Find org by phone number or agent_id
    let orgId = metadata?.org_id;

    if (!orgId) {
      const normalize = (p: string) => p.replace(/\D/g, "");
      const toDigits = normalize(to_number || "");
      const orgs = await db.select().from(organizations);
      const org = orgs.find(o => {
        const settings = o.settings as Record<string, unknown>;
        const retellConfig = settings?.retellConfig as Record<string, unknown>;
        const configPhone = normalize(String(retellConfig?.phoneNumber || ""));
        const blandPhone = normalize(String(o.blandPhoneNumber || ""));
        return configPhone === toDigits || blandPhone === toDigits || toDigits.endsWith(configPhone) || toDigits.endsWith(blandPhone);
      });
      if (org) orgId = org.id;
    }

    if (!orgId) {
      console.log("[Retell Webhook] No org found for call:", call_id);
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    // Parse transcript
    const fullTranscript = transcript || "";
    let parsed = parseTranscriptRegex(fullTranscript);

    const hasGoodParse = parsed.pickupAddress || parsed.destinationAddress || parsed.vehicleMake;
    if (!hasGoodParse && fullTranscript.length > 50) {
      const llmParsed = await parseTranscriptWithLLM(fullTranscript);
      if (llmParsed) parsed = { ...parsed, ...llmParsed };
    }

    // Use Retell's call analysis if available
    const summary = call_analysis?.call_summary || generateSummary(fullTranscript, parsed as Record<string, unknown>);
    const sentiment = call_analysis?.user_sentiment || "neutral";

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
      customerPhone: from_number || "",
      pickupAddress: parsed.pickupAddress || "Address from call",
      destinationAddress: parsed.destinationAddress,
      towVehicleMake: parsed.vehicleMake,
      towVehicleModel: parsed.vehicleModel,
      towVehicleYear: parsed.vehicleYear,
      towVehicleColor: parsed.vehicleColor,
      towVehiclePlate: parsed.vehiclePlate,
      notes: `AI Dispatch Call (Retell)\nDuration: ${Math.round((duration_ms || 0) / 1000)}s\nSentiment: ${sentiment}\nSummary: ${summary}`,
      assignedDriverId: availableDriver?.id,
    }).returning();

    // Auto-assign if forced dispatch
    const settings = org.settings as Record<string, unknown>;
    const dispatchSettings = settings?.dispatch as Record<string, unknown>;
    if (dispatchSettings?.forcedDispatch && availableDriver) {
      await db.update(jobs).set({ status: "assigned", assignedAt: new Date() }).where(eq(jobs.id, job.id));
    }

    // Store call log
    await db.insert(callLogs).values({
      orgId,
      blandCallId: call_id,
      callerPhone: from_number || "",
      callerName: parsed.customerName,
      status: "completed",
      duration: Math.round((duration_ms || 0) / 1000),
      transcript: fullTranscript,
      summary,
      callType,
      serviceNeeded: parsed.serviceType,
      pickupAddress: parsed.pickupAddress,
      vehicleInfo: [parsed.vehicleMake, parsed.vehicleModel, parsed.vehicleYear, parsed.vehicleColor].filter(Boolean).join(" ") || undefined,
      urgency,
      recordingUrl: recording_url,
      jobId: job.id,
      metadata: { ...metadata, provider: "retell", sentiment },
      startedAt: call.start_timestamp ? new Date(call.start_timestamp) : null,
      endedAt: call.end_timestamp ? new Date(call.end_timestamp) : null,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      summary,
      sentiment,
      parsed,
      assignedDriver: availableDriver ? `${availableDriver.firstName} ${availableDriver.lastName}` : null,
      provider: "retell",
    });
  } catch (err) {
    console.error("Retell webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    provider: "retell",
    instructions: "Configure this URL in your Retell AI dashboard as the webhook endpoint.",
    url: "/api/retell/webhook",
    method: "POST",
    events: ["call_ended", "call_analyzed"],
    examplePayload: {
      event: "call_ended",
      call: {
        call_id: "call_abc123",
        agent_id: "agent_xyz",
        call_status: "ended",
        transcript: "Agent: How can I help? Customer: I need a tow...",
        duration_ms: 120000,
        from_number: "+15551234567",
        to_number: "+12536501545",
        metadata: { org_id: "your-org-id" },
      },
    },
  });
}