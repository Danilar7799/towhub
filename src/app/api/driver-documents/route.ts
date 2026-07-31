import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { driverDocuments, users } from "@/db/schema";
import { eq, and, lt, gte, isNull, desc } from "drizzle-orm";

/*
 * Driver Documents API
 * GET /api/driver-documents — list with compliance status
 * POST /api/driver-documents — create/update document
 * DELETE /api/driver-documents — delete document
 */

function calcStatus(expiresAt: Date | null): string {
  if (!expiresAt) return "valid";
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days <= 7) return "expiring_7d";
  if (days <= 30) return "expiring_30d";
  return "valid";
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const driverId = searchParams.get("driverId");
  const type = searchParams.get("type");
  const compliance = searchParams.get("compliance"); // "alerts" — only expiring/expired

  let query = db
    .select({
      id: driverDocuments.id,
      driverId: driverDocuments.driverId,
      type: driverDocuments.type,
      fileUrl: driverDocuments.fileUrl,
      issuedAt: driverDocuments.issuedAt,
      expiresAt: driverDocuments.expiresAt,
      status: driverDocuments.status,
      notes: driverDocuments.notes,
      createdAt: driverDocuments.createdAt,
      driverFirstName: users.firstName,
      driverLastName: users.lastName,
      driverEmail: users.email,
    })
    .from(driverDocuments)
    .leftJoin(users, eq(driverDocuments.driverId, users.id))
    .where(eq(driverDocuments.orgId, user.orgId))
    .orderBy(desc(driverDocuments.createdAt));

  const docs = await query;

  // Calculate real-time status
  const enriched = docs.map(doc => ({
    ...doc,
    computedStatus: calcStatus(doc.expiresAt),
    daysUntilExpiry: doc.expiresAt
      ? Math.ceil((new Date(doc.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  }));

  // Filter by driver
  let filtered = driverId ? enriched.filter(d => d.driverId === driverId) : enriched;

  // Filter by type
  if (type) filtered = filtered.filter(d => d.type === type);

  // Filter for compliance alerts only
  if (compliance === "alerts") {
    filtered = filtered.filter(d => ["expired", "expiring_7d", "expiring_30d", "missing"].includes(d.computedStatus));
  }

  // Stats
  const stats = {
    total: enriched.length,
    valid: enriched.filter(d => d.computedStatus === "valid").length,
    expiring_30d: enriched.filter(d => d.computedStatus === "expiring_30d").length,
    expiring_7d: enriched.filter(d => d.computedStatus === "expiring_7d").length,
    expired: enriched.filter(d => d.computedStatus === "expired").length,
  };

  return NextResponse.json({ documents: filtered, stats });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, driverId, type, fileUrl, issuedAt, expiresAt, notes } = body;

  if (!driverId || !type) {
    return NextResponse.json({ error: "driverId and type are required" }, { status: 400 });
  }

  const status = calcStatus(expiresAt ? new Date(expiresAt) : null);

  if (id) {
    // Update
    const [updated] = await db.update(driverDocuments).set({
      type,
      fileUrl,
      issuedAt: issuedAt ? new Date(issuedAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: status as any,
      notes,
      updatedAt: new Date(),
    }).where(and(eq(driverDocuments.id, id), eq(driverDocuments.orgId, user.orgId))).returning();

    return NextResponse.json({ document: updated });
  } else {
    // Create
    const [created] = await db.insert(driverDocuments).values({
      orgId: user.orgId,
      driverId,
      type: type as any,
      fileUrl: fileUrl || "/uploads/placeholder.pdf",
      issuedAt: issuedAt ? new Date(issuedAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: status as any,
      notes,
      createdBy: user.id,
    }).returning();

    return NextResponse.json({ document: created });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.delete(driverDocuments).where(and(eq(driverDocuments.id, id), eq(driverDocuments.orgId, user.orgId)));

  return NextResponse.json({ success: true });
}