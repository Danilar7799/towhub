import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobPhotos, jobs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/*
 * Photo Uploads for Jobs
 *
 * Stores photo metadata in DB. Actual files stored externally (S3, Cloudflare R2, etc.)
 * For MVP, we store base64 data URLs or external URLs.
 *
 * POST /api/jobs/photos — upload photo
 * GET /api/jobs/photos?jobId=xxx — list photos for job
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const photos = await db.select().from(jobPhotos)
    .where(and(eq(jobPhotos.jobId, jobId), eq(jobPhotos.orgId, user.orgId)))
    .orderBy(desc(jobPhotos.createdAt));

  return NextResponse.json({ photos });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { jobId, url, caption, type } = body;
  if (!jobId || !url) return NextResponse.json({ error: "jobId and url required" }, { status: 400 });

  // Verify job belongs to org
  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.orgId, user.orgId))).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const [photo] = await db.insert(jobPhotos).values({
    jobId, orgId: user.orgId, url, caption, type: type || "general", uploadedBy: user.id,
  }).returning();

  return NextResponse.json({ photo });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.delete(jobPhotos).where(and(eq(jobPhotos.id, id), eq(jobPhotos.orgId, user.orgId)));
  return NextResponse.json({ success: true });
}
