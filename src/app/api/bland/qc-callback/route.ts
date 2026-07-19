import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * QC Callback Webhook — Bland.ai calls customer after job completion
 * to ask about service quality. Results are stored in the job notes
 * and used for driver performance tracking.
 *
 * POST /api/bland/qc-callback
 * { call_id, transcript, job_id, org_id, metadata }
 */

interface QCCallback {
  call_id: string;
  transcript: string;
  concatenated_transcript: string;
  duration: number;
  metadata?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  try {
    const body: QCCallback = await req.json();
    const { concatenated_transcript, metadata } = body;

    const jobId = metadata?.job_id;
    const orgId = metadata?.org_id;
    if (!jobId || !orgId) return NextResponse.json({ error: "job_id and org_id required in metadata" }, { status: 400 });

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    // Analyze transcript for sentiment
    const analysis = analyzeQC(concatenated_transcript || "");

    // Store QC results in job notes
    const qcNote = [
      `\n--- QC CALLBACK (${new Date().toISOString()}) ---`,
      `Satisfaction: ${analysis.satisfaction}/5`,
      `Sentiment: ${analysis.sentiment}`,
      `Issues: ${analysis.issues.length > 0 ? analysis.issues.join(", ") : "None"}`,
      `Summary: ${analysis.summary}`,
      `--- END QC ---`,
    ].join("\n");

    await db.update(jobs).set({
      notes: (job.notes || "") + qcNote,
    }).where(eq(jobs.id, jobId));

    return NextResponse.json({
      success: true,
      jobId,
      analysis,
    });
  } catch (err) {
    console.error("QC callback error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function analyzeQC(transcript: string) {
  const lower = transcript.toLowerCase();

  // Sentiment analysis (simple keyword-based)
  const positive = ["great", "excellent", "amazing", "wonderful", "happy", "satisfied", "professional", "fast", "quick", "friendly", "recommend", "good", "perfect", "thank"];
  const negative = ["bad", "terrible", "awful", "slow", "rude", "unprofessional", "late", "damage", "broken", "angry", "disappointed", "worst", "horrible", "complaint"];

  const posCount = positive.filter(w => lower.includes(w)).length;
  const negCount = negative.filter(w => lower.includes(w)).length;

  let sentiment = "neutral";
  let satisfaction = 3;
  if (posCount > negCount + 1) { sentiment = "positive"; satisfaction = 5; }
  else if (posCount > negCount) { sentiment = "mostly positive"; satisfaction = 4; }
  else if (negCount > posCount + 1) { sentiment = "negative"; satisfaction = 1; }
  else if (negCount > posCount) { sentiment = "mostly negative"; satisfaction = 2; }

  // Issue detection
  const issues: string[] = [];
  if (lower.includes("damage") || lower.includes("broken")) issues.push("Vehicle damage reported");
  if (lower.includes("late") || lower.includes("slow") || lower.includes("wait")) issues.push("Slow response time");
  if (lower.includes("rude") || lower.includes("unprofessional")) issues.push("Professionalism concern");
  if (lower.includes("overcharg") || lower.includes("expensive") || lower.includes("price")) issues.push("Pricing complaint");
  if (lower.includes("wrong") || lower.includes("mistake")) issues.push("Service error");

  // Generate summary
  const summary = posCount > negCount
    ? "Customer satisfied with service."
    : negCount > posCount
    ? "Customer expressed dissatisfaction. Review needed."
    : "Customer had mixed experience.";

  return { satisfaction, sentiment, issues, summary, posCount, negCount };
}
