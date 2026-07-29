import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { documents, jobs, vehicles, customers, users } from "@/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";

/*
 * Document Management API
 * GET  /api/documents — list documents (filter by type, job, vehicle, customer, driver, q)
 * POST /api/documents — create document record (after upload to S3/R2)
 * PUT  /api/documents — update document metadata
 * DELETE /api/documents?id=xxx — delete document
 *
 * Document types: invoice, contract, police_report, bill_of_lading, inspection, driver_license, insurance_card, registration, photo, other
 */

function generatePresignedUrl(key: string, contentType: string): { uploadUrl: string; fileUrl: string; fields?: Record<string, string> } {
  // In production: use AWS S3 / Cloudflare R2 presigned POST
  // For now: return local mock URL pattern
  const uploadUrl = `/api/upload?key=${encodeURIComponent(key)}`;
  const fileUrl = `/uploads/${key}`;
  return { uploadUrl, fileUrl };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const jobId = searchParams.get("jobId");
  const vehicleId = searchParams.get("vehicleId");
  const customerId = searchParams.get("customerId");
  const driverId = searchParams.get("driverId");
  const q = searchParams.get("q");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = db.select({
    id: documents.id,
    type: documents.type,
    name: documents.name,
    description: documents.description,
    fileUrl: documents.fileUrl,
    mimeType: documents.mimeType,
    size: documents.size,
    extractedData: documents.extractedData,
    jobId: documents.jobId,
    vehicleId: documents.vehicleId,
    customerId: documents.customerId,
    driverId: documents.driverId,
    createdBy: documents.createdBy,
    createdAt: documents.createdAt,
    updatedAt: documents.updatedAt,
    // Relations
    jobNumber: jobs.id,
    vehicleName: vehicles.name,
    customerName: customers.name,
    uploaderName: users.firstName,
  })
    .from(documents)
    .leftJoin(jobs, eq(documents.jobId, jobs.id))
    .leftJoin(vehicles, eq(documents.vehicleId, vehicles.id))
    .leftJoin(customers, eq(documents.customerId, customers.id))
    .leftJoin(users, eq(documents.createdBy, users.id))
    .where(eq(documents.orgId, user.orgId))
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset(offset);

  const conditions = [];
  if (type) conditions.push(eq(documents.type, type as any));
  if (jobId) conditions.push(eq(documents.jobId, jobId));
  if (vehicleId) conditions.push(eq(documents.vehicleId, vehicleId));
  if (customerId) conditions.push(eq(documents.customerId, customerId));
  if (driverId) conditions.push(eq(documents.driverId, driverId));
  if (q) conditions.push(or(ilike(documents.name, `%${q}%`), ilike(documents.description || "", `%${q}%`)));

  if (conditions.length > 0) {
    query = db.select({
      id: documents.id,
      type: documents.type,
      name: documents.name,
      description: documents.description,
      fileUrl: documents.fileUrl,
      mimeType: documents.mimeType,
      size: documents.size,
      extractedData: documents.extractedData,
      jobId: documents.jobId,
      vehicleId: documents.vehicleId,
      customerId: documents.customerId,
      driverId: documents.driverId,
      createdBy: documents.createdBy,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      jobNumber: jobs.id,
      vehicleName: vehicles.name,
      customerName: customers.name,
      uploaderName: users.firstName,
    })
      .from(documents)
      .leftJoin(jobs, eq(documents.jobId, jobs.id))
      .leftJoin(vehicles, eq(documents.vehicleId, vehicles.id))
      .leftJoin(customers, eq(documents.customerId, customers.id))
      .leftJoin(users, eq(documents.createdBy, users.id))
      .where(and(eq(documents.orgId, user.orgId), ...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset);
  }

  const docs = await query;

  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, name, description, fileUrl, mimeType, size, jobId, vehicleId, customerId, driverId, extractedData } = body;

  if (!type || !name || !fileUrl) {
    return NextResponse.json({ error: "type, name, and fileUrl are required" }, { status: 400 });
  }

  const [doc] = await db.insert(documents).values({
    orgId: user.orgId,
    type,
    name,
    description: description || null,
    fileUrl,
    mimeType: mimeType || null,
    size: size || null,
    jobId: jobId || null,
    vehicleId: vehicleId || null,
    customerId: customerId || null,
    driverId: driverId || null,
    extractedData: extractedData || {},
    createdBy: user.id,
  }).returning();

  return NextResponse.json({ ok: true, document: doc });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name, description, extractedData, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Document ID required" }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (extractedData) updates.extractedData = extractedData;

  const [updated] = await db.update(documents).set(updates).where(and(eq(documents.id, id), eq(documents.orgId, user.orgId))).returning();
  if (!updated) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  return NextResponse.json({ ok: true, document: updated });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Document ID required" }, { status: 400 });

  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.orgId, user.orgId)));
  return NextResponse.json({ ok: true });
}