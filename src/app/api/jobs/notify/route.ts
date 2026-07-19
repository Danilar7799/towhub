import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Auto-send SMS on job status change
 *
 * POST /api/jobs/notify
 * { jobId }
 *
 * Automatically sends SMS to customer based on current job status.
 * Called by the app when job status changes.
 */

const STATUS_MESSAGES: Record<string, string> = {
  assigned: "A driver has been assigned to your tow request.",
  en_route: "Your driver is on the way!",
  on_scene: "Your driver has arrived at the pickup location.",
  towing: "Your vehicle is now being towed to the destination.",
  completed: "Your tow is complete! Thank you for choosing us.",
  cancelled: "Your tow request has been cancelled.",
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.orgId, user.orgId))).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.customerPhone) return NextResponse.json({ error: "No customer phone" }, { status: 400 });

  const statusMsg = STATUS_MESSAGES[job.status];
  if (!statusMsg) return NextResponse.json({ message: "No notification for this status" });

  // Call internal SMS API
  const smsRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notifications/sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": req.headers.get("cookie") || "",
    },
    body: JSON.stringify({ jobId, customMessage: `Hi ${job.customerName || "there"}! ${statusMsg}` }),
  });

  const smsData = await smsRes.json();
  return NextResponse.json({ notified: smsRes.ok, sms: smsData });
}
