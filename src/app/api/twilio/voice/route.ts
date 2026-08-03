import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Twilio Voice Webhook — receives incoming calls and forwards to Bland.ai agent
 *
 * Flow:
 * 1. Twilio receives call on configured phone number
 * 2. Twilio POSTs to this webhook with CallSid, From, To, etc.
 * 3. We look up organization by Twilio phone number (To)
 * 4. Get organization's Bland agent ID from settings
 * 5. Return TwiML to connect call to Bland agent via <Dial>
 */

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callSid = (formData as any).get("CallSid") as string;
    const from = (formData as any).get("From") as string; // Caller's phone number
    const to = (formData as any).get("To") as string;     // Our Twilio number
    const callStatus = (formData as any).get("CallStatus") as string;

    console.log("[Twilio Voice] Incoming call:", { callSid, from, to, callStatus });

    // Find organization by Twilio phone number
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.twilioPhoneNumber, to))
      .limit(1);

    if (!org) {
      console.error("[Twilio Voice] No organization found for phone:", to);
      // Fallback: play message and hang up
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Thank you for calling. We're unable to process your call at this time. Please try again later.</Say>
          <Hangup />
        </Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Get Bland agent ID from org settings
    const settings = (org.settings as Record<string, unknown>) || {};
    const blandConfig = (settings.blandConfig as Record<string, unknown>) || {};
    const blandAgentId = blandConfig.agentId as string | undefined;
    const blandPhoneNumber = blandConfig.phoneNumber as string | undefined;

    if (!blandAgentId && !blandPhoneNumber) {
      console.error("[Twilio Voice] No Bland agent configured for org:", org.id);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Our AI dispatcher is not configured yet. Please hold while we transfer you.</Say>
          <Dial>${org.phone || "+15550000000"}</Dial>
        </Response>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Build TwiML to connect call to Bland agent
    // Bland.ai provides a SIP URI or phone number to forward to
    // Option 1: If Bland gives us a phone number to forward to
    // Option 2: If Bland gives us a SIP URI (preferred for lower latency)
    // For now, we'll use the Bland phone number from config or fall back to org phone

    const forwardTo = blandPhoneNumber || org.phone || "+15550000000";

    // Record the call for transcript parsing
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/bland/webhook`;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="alice">Connecting you to our AI dispatcher. One moment please.</Say>
      <Dial record="record-from-answer" recordingStatusCallback="${webhookUrl}" recordingStatusCallbackMethod="POST">
        <Number>${forwardTo}</Number>
      </Dial>
    </Response>`;

    console.log("[Twilio Voice] Forwarding call to:", forwardTo);

    return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
  } catch (err) {
    console.error("[Twilio Voice] Error:", err);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">An error occurred. Please try again later.</Say>
        <Hangup />
      </Response>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  }
}

// GET - for Twilio webhook validation
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/twilio/voice",
    description: "Twilio Voice webhook - forwards incoming calls to Bland.ai agent",
    expectedParams: ["CallSid", "From", "To", "CallStatus"],
  });
}