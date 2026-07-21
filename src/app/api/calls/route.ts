import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations, jobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Call Tracking — logs incoming calls for analytics
 *
 * POST /api/calls/incoming — log incoming call
 * GET /api/calls — list call logs
 *
 * Called by Bland.ai or Twilio when call comes in.
 */

interface CallLog {
  id: string;
  callerPhone: string;
  callerName?: string;
  duration: number;
  status: string;
  jobId?: string;
  recordingUrl?: string;
  transcript?: string;
  createdAt: string;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const callLogs = ((settings.callLogs as CallLog[]) || []).slice(0, 100);

  return NextResponse.json({
    calls: callLogs,
    stats: {
      total: callLogs.length,
      avgDuration: callLogs.length > 0 ? Math.round(callLogs.reduce((s, c) => s + c.duration, 0) / callLogs.length) : 0,
      convertedToJob: callLogs.filter(c => c.jobId).length,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orgId, callerPhone, callerName, duration, status, jobId, recordingUrl, transcript } = body;

  if (!orgId || !callerPhone) return NextResponse.json({ error: "orgId and callerPhone required" }, { status: 400 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const settings = (org.settings as Record<string, unknown>) || {};
  const callLogs = ((settings.callLogs as CallLog[]) || []);

  callLogs.unshift({
    id: `call_${Date.now()}`,
    callerPhone,
    callerName,
    duration: duration || 0,
    status: status || "completed",
    jobId,
    recordingUrl,
    transcript: transcript?.slice(0, 1000),
    createdAt: new Date().toISOString(),
  });

  // Keep last 500 calls
  const trimmed = callLogs.slice(0, 500);

  await db.update(organizations).set({
    settings: { ...settings, callLogs: trimmed },
    updatedAt: new Date(),
  }).where(eq(organizations.id, orgId));

  return NextResponse.json({ success: true, message: "Call logged" });
}
