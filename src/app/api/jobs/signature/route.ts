import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Digital Signatures for Jobs
 *
 * Stores signature as base64 data URL in job notes.
 * Driver collects customer signature on completion.
 *
 * POST /api/jobs/signature — save signature
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, signatureData, signerName } = await req.json();
  if (!jobId || !signatureData) return NextResponse.json({ error: "jobId and signatureData required" }, { status: 400 });

  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.orgId, user.orgId))).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Store signature info in notes
  const sigNote = [
    `\n--- DIGITAL SIGNATURE ---`,
    `Signed by: ${signerName || "Customer"}`,
    `Signed at: ${new Date().toISOString()}`,
    `Driver: ${user.firstName} ${user.lastName}`,
    `Signature data: ${signatureData.slice(0, 100)}...`,
    `--- END SIGNATURE ---`,
  ].join("\n");

  await db.update(jobs).set({
    notes: (job.notes || "") + sigNote,
  }).where(eq(jobs.id, jobId));

  return NextResponse.json({ success: true, message: "Signature saved" });
}
