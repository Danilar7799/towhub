import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { callLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sendTelegramMessage, formatCallNotification } from "@/lib/telegram";

/*
 * Call Logs API
 * GET /api/calls — list call logs
 * POST /api/calls — create call log (from webhook)
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const active = searchParams.get("active") === "true";

  let query = db
    .select()
    .from(callLogs)
    .where(eq(callLogs.orgId, user.orgId))
    .orderBy(desc(callLogs.createdAt))
    .limit(50);

  const calls = await query;

  // Transform for frontend
  const transformed = calls.map(c => ({
    id: c.id,
    callerPhone: c.callerPhone,
    callerName: c.callerName,
    status: c.status,
    duration: c.duration || 0,
    transcript: c.transcript ? JSON.parse(c.transcript) : [],
    summary: c.summary,
    callType: c.callType,
    serviceNeeded: c.serviceNeeded,
    pickupAddress: c.pickupAddress,
    vehicleInfo: c.vehicleInfo,
    urgency: c.urgency,
    jobId: c.jobId,
    startedAt: c.startedAt || c.createdAt,
    createdAt: c.createdAt,
  }));

  // Stats
  const stats = {
    total: transformed.length,
    avgDuration: transformed.length > 0 ? transformed.reduce((s, c) => s + c.duration, 0) / transformed.length : 0,
    convertedToJob: transformed.filter(c => c.jobId).length,
  };

  return NextResponse.json({ calls: transformed, stats });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orgId, blandCallId, callerPhone, callerName, status, duration, transcript, summary, callType, serviceNeeded, pickupAddress, vehicleInfo, urgency, recordingUrl, jobId, startedAt, endedAt, metadata } = body;

  if (!orgId || !callerPhone) {
    return NextResponse.json({ error: "orgId and callerPhone required" }, { status: 400 });
  }

  const [created] = await db.insert(callLogs).values({
    orgId,
    blandCallId,
    callerPhone,
    callerName,
    status: status || "completed",
    duration: duration || 0,
    transcript: typeof transcript === "string" ? transcript : JSON.stringify(transcript || []),
    summary,
    callType,
    serviceNeeded,
    pickupAddress,
    vehicleInfo,
    urgency,
    recordingUrl,
    jobId,
    metadata,
    startedAt: startedAt ? new Date(startedAt) : null,
    endedAt: endedAt ? new Date(endedAt) : null,
  }).returning();

  // Send Telegram notification for new incoming calls
  if (status === "ringing" || status === "in_progress") {
    try {
      const message = formatCallNotification({
        id: created.id,
        callerName: created.callerName || undefined,
        callerPhone: created.callerPhone,
        status: created.status,
        callType: created.callType || undefined,
        serviceNeeded: created.serviceNeeded || undefined,
        pickupAddress: created.pickupAddress || undefined,
        urgency: created.urgency || undefined,
      });
      
      await sendTelegramMessage(message);
    } catch (error) {
      console.error("Failed to send Telegram notification:", error);
      // Don't fail the request if Telegram fails
    }
  }

  return NextResponse.json({ call: created });
}