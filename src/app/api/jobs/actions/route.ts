import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Driver Job Actions — accept, decline (with reason), mark review requested
 *
 * POST /api/jobs/actions
 * { jobId, action: "accept" | "decline" | "complete" | "review_requested" | "review_received", reason?, reviewUrl? }
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, action, reason, reviewUrl } = await req.json();
  if (!jobId || !action) return NextResponse.json({ error: "jobId and action required" }, { status: 400 });

  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.orgId, user.orgId))).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const now = new Date();

  switch (action) {
    case "accept":
      await db.update(jobs).set({ status: "en_route", enRouteAt: now, assignedDriverId: user.id }).where(eq(jobs.id, jobId));
      return NextResponse.json({ success: true, message: "Job accepted" });

    case "decline":
      // Store decline reason in dispatcher notes
      const declineNote = `[DECLINED by ${user.firstName} ${user.lastName}] Reason: ${reason || "No reason given"} | ${now.toISOString()}`;
      await db.update(jobs).set({
        assignedDriverId: null,
        status: "pending",
        dispatcherNotes: declineNote + "\n" + (job.dispatcherNotes || ""),
      }).where(eq(jobs.id, jobId));
      return NextResponse.json({ success: true, message: "Job declined", reason });

    case "complete":
      await db.update(jobs).set({ status: "completed", completedAt: now }).where(eq(jobs.id, jobId));
      return NextResponse.json({ success: true, message: "Job completed" });

    case "review_requested":
      // Driver marks that they asked the customer for a review
      const reviewNote = `[REVIEW REQUESTED by driver] ${now.toISOString()}`;
      await db.update(jobs).set({
        notes: (job.notes || "") + "\n" + reviewNote,
      }).where(eq(jobs.id, jobId));
      return NextResponse.json({ success: true, message: "Review request noted" });

    case "review_received":
      // Driver marks that customer left a review
      const receivedNote = `[REVIEW RECEIVED] URL: ${reviewUrl || "N/A"} | ${now.toISOString()}`;
      await db.update(jobs).set({
        notes: (job.notes || "") + "\n" + receivedNote,
      }).where(eq(jobs.id, jobId));
      return NextResponse.json({ success: true, message: "Review receipt noted" });

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
