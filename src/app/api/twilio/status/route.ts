import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Twilio Status Callback Webhook — receives call status updates
 *
 * Twilio POSTs here when call status changes:
 * - initiated, ringing, answered, completed, busy, failed, no-answer, canceled
 * 
 * We log these for analytics and can trigger follow-up actions (e.g., SMS on missed call)
 */

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const duration = formData.get("CallDuration") as string;
    const recordingUrl = formData.get("RecordingUrl") as string | null;

    console.log("[Twilio Status] Call update:", { callSid, callStatus, from, to, duration, recordingUrl });

    // Find organization by Twilio phone number
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.twilioPhoneNumber, to))
      .limit(1);

    if (!org) {
      console.warn("[Twilio Status] No org found for number:", to);
      return NextResponse.json({ ok: true, warning: "Org not found" });
    }

    // Log call status - could store in a call_logs table if we had one
    // For now, just log to console

    // If call completed and we have a recording, the Bland webhook will handle transcript
    // If call missed/failed/no-answer and no Bland agent answered, we could send SMS fallback
    if (["busy", "failed", "no-answer", "canceled"].includes(callStatus)) {
      console.log("[Twilio Status] Call not answered, could trigger SMS fallback to:", from);
      // TODO: Send SMS with link to request tow via web form
      // await sendMissedCallSms(org.id, from);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Twilio Status] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "/api/twilio/status",
    description: "Twilio Call Status Callback webhook",
    expectedParams: ["CallSid", "CallStatus", "From", "To", "CallDuration", "RecordingUrl"],
  });
}