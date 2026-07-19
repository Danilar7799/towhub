import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs, customers, invoices } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Customer Rating System
 *
 * POST /api/jobs/rate — customer rates a completed job
 * GET /api/jobs/rate?jobId=xxx — get rating for a job
 *
 * Rating: 1-5 stars + optional comment
 * Stored in job notes for now, could be separate table later.
 */

export async function POST(req: NextRequest) {
  const { jobId, rating, comment, customerPhone } = await req.json();
  if (!jobId || !rating) return NextResponse.json({ error: "jobId and rating required" }, { status: 400 });
  if (rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Verify customer (by phone or being logged in)
  const user = await getCurrentUser();
  if (!user && customerPhone && job.customerPhone !== customerPhone) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stars = "⭐".repeat(rating);
  const ratingNote = [
    `\n--- CUSTOMER RATING ---`,
    `Rating: ${stars} (${rating}/5)`,
    comment ? `Comment: ${comment}` : null,
    `Submitted: ${new Date().toISOString()}`,
    `--- END RATING ---`,
  ].filter(Boolean).join("\n");

  await db.update(jobs).set({
    notes: (job.notes || "") + ratingNote,
  }).where(eq(jobs.id, jobId));

  return NextResponse.json({ success: true, rating, message: "Thank you for your feedback!" });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Parse rating from notes
  const ratingMatch = job.notes?.match(/Rating: (⭐+) \((\d+)\/5\)/);
  const commentMatch = job.notes?.match(/Comment: (.+)/);

  return NextResponse.json({
    jobId,
    rating: ratingMatch ? parseInt(ratingMatch[2]) : null,
    comment: commentMatch?.[1] || null,
    hasRating: !!ratingMatch,
  });
}
