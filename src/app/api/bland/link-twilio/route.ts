import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Link Twilio Phone Number to Bland.ai Agent
 *
 * POST /api/bland/link-twilio
 * 
 * This configures the Twilio phone number to forward incoming calls
 * to the Bland.ai agent via our webhook endpoint.
 * 
 * Flow:
 * 1. Get Twilio credentials and phone number from request
 * 2. Get Bland agent ID from org settings
 * 3. Use Twilio API to update the phone number's voice webhook URL
 * 4. Save linked status to org settings
 */

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber, blandPhoneNumber } = body;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber || !blandPhoneNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get organization
    const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    const settings = (org.settings as Record<string, unknown>) || {};
    const blandConfig = (settings.blandConfig as Record<string, unknown>) || {};
    const blandAgentId = blandConfig.agentId as string | undefined;

    if (!blandAgentId) {
      return NextResponse.json({ error: "No Bland agent configured. Create agent first." }, { status: 400 });
    }

    // The webhook URL that Twilio should call when a call comes in
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/api/twilio/voice`;

    // Update Twilio phone number to use our webhook
    const twilioPhoneSid = await findTwilioPhoneNumberSid(twilioAccountSid, twilioAuthToken, twilioPhoneNumber);
    
    if (!twilioPhoneSid) {
      return NextResponse.json({ error: "Phone number not found in Twilio account" }, { status: 404 });
    }

    // Update the phone number's voice URL
    const updateRes = await fetch(`${TWILIO_API_BASE}/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${twilioPhoneSid}.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        VoiceUrl: webhookUrl,
        VoiceMethod: "POST",
        StatusCallback: `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/api/twilio/status`,
        StatusCallbackMethod: "POST",
        StatusCallbackEvent: ["initiated", "ringing", "answered", "completed", "busy", "failed", "no-answer", "canceled"].join(","),
      }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      console.error("[Link Twilio] Failed to update phone number:", err);
      return NextResponse.json({ error: "Failed to configure Twilio webhook", details: err }, { status: 500 });
    }

    // Save linked status and Twilio config to org
    await db.update(organizations).set({
      settings: {
        ...settings,
        blandConfig: {
          ...blandConfig,
          twilioLinked: true,
          twilioAccountSid,
          twilioAuthToken, // Consider encrypting this
          twilioPhoneNumber,
          linkedAt: new Date().toISOString(),
        },
      },
      twilioPhoneNumber,
      updatedAt: new Date(),
    }).where(eq(organizations.id, user.orgId));

    return NextResponse.json({
      success: true,
      message: "Twilio number linked to Bland agent successfully",
      webhookUrl,
    });
  } catch (err) {
    console.error("[Link Twilio] Error:", err);
    return NextResponse.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}

async function findTwilioPhoneNumberSid(accountSid: string, authToken: string, phoneNumber: string): Promise<string | null> {
  try {
    // List all incoming phone numbers and find the matching one
    const res = await fetch(`${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json`, {
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const numbers = data.incoming_phone_numbers || [];
    
    // Normalize phone number for comparison (remove +, spaces, dashes)
    const normalizedTarget = phoneNumber.replace(/[^\d]/g, "");
    
    for (const num of numbers) {
      const normalized = num.phone_number.replace(/[^\d]/g, "");
      if (normalized === normalizedTarget || normalized.endsWith(normalizedTarget.slice(-10))) {
        return num.sid;
      }
    }

    return null;
  } catch (err) {
    console.error("[Link Twilio] Error finding phone number:", err);
    return null;
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/bland/link-twilio",
    description: "Link Twilio phone number to Bland.ai agent - configures Twilio webhook to forward calls",
    requiredFields: ["twilioAccountSid", "twilioAuthToken", "twilioPhoneNumber", "blandPhoneNumber"],
  });
}