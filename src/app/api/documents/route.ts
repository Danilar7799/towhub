import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/*
 * Document Management API
 * GET  /api/documents — list documents (filter by type, job, customer)
 * POST /api/documents — upload document
 * PUT  /api/documents — update document metadata
 *
 * Document types: invoice, receipt, contract, police_report, bill_of_lading,
 *                 insurance_claim, driver_license, insurance_card, registration,
 *                 inspection, photo, other
 */

interface Document {
  id: string;
  orgId: string;
  type: string;
  name: string;
  description?: string;
  jobId?: string;
  customerId?: string;
  fileUrl?: string;
  mimeType?: string;
  size?: number;
  extractedData?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

// In-memory store (would be DB in production)
const documents: Document[] = [];

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const jobId = searchParams.get("jobId");
  const q = searchParams.get("q");

  let filtered = documents.filter(d => d.orgId === user.orgId);
  if (type) filtered = filtered.filter(d => d.type === type);
  if (jobId) filtered = filtered.filter(d => d.jobId === jobId);
  if (q) filtered = filtered.filter(d => d.name.toLowerCase().includes(q.toLowerCase()));

  return NextResponse.json({ documents: filtered });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const doc: Document = {
    id: `doc-${Date.now()}`,
    orgId: user.orgId,
    type: body.type || "other",
    name: body.name,
    description: body.description,
    jobId: body.jobId,
    customerId: body.customerId,
    fileUrl: body.fileUrl,
    mimeType: body.mimeType,
    size: body.size,
    extractedData: body.extractedData,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  };

  documents.push(doc);
  return NextResponse.json({ ok: true, document: doc });
}
