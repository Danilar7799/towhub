import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * SMS Notifications via Twilio
 *
 * POST /api/notifications/sms
 * { jobId, type: "status_update" | "driver_assigned" | "arrival" | "completed" }
 *
 * Sends SMS to customer based on job status changes.
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars.
 */

const SMS_TEMPLATES: Record<string, (data: { customerName?: string; driverName?: string; orgName?: string; eta?: string }) => string> = {
  driver_assigned: (d) => `Hi ${d.customerName || "there"}! A driver has been assigned to your tow request. ${d.driverName || "Your driver"} is on the way. - ${d.orgName || "Your Towing Company"}`,
  en_route: (d) => `Hi ${d.customerName || "there"}! Your driver ${d.driverName || ""} is on the way. ETA: ${d.eta || "shortly"}. - ${d.orgName || "Your Towing Company"}`,
  on_scene: (d) => `Hi ${d.customerName || "there"}! Your driver has arrived at the pickup location. - ${d.orgName || "Your Towing Company"}`,
  completed: (d) => `Hi ${d.customerName || "there"}! Your tow is complete. Thank you for choosing ${d.orgName || "us"}! We'd appreciate a review if you have a moment.`,
  cancelled: (d) => `Hi ${d.customerName || "there"}. Your tow request has been cancelled. If this was a mistake, please call us. - ${d.orgName || "Your Towing Company"}`,
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, type, customMessage } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.orgId, user.orgId))).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.customerPhone) return NextResponse.json({ error: "No customer phone on file" }, { status: 400 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);

  const message = customMessage || SMS_TEMPLATES[type || "status_update"]?.({
    customerName: job.customerName || undefined,
    driverName: user.firstName + " " + user.lastName,
    orgName: org?.name,
  }) || `Update on your tow: Status changed to ${job.status.replace("_", " ")}. - ${org?.name || "Your Towing Company"}`;

  // If Twilio is configured, send SMS
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const twilio = (await import("twilio")).default;
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: job.customerPhone,
      });

      return NextResponse.json({ success: true, message: "SMS sent", to: job.customerPhone });
    } catch (err) {
      console.error("Twilio error:", err);
      return NextResponse.json({ error: "SMS failed", details: String(err) }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: false,
    message: "Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.",
    preview: { to: job.customerPhone, body: message },
  });
}
