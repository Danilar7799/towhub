import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Audit Log — track all important actions
 *
 * Stored in org settings as a rolling log (last 500 entries)
 * Each entry: { action, entity, entityId, userId, details, timestamp }
 */

interface AuditEntry {
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  details: string;
  timestamp: string;
}

export async function logAudit(orgId: string, entry: Omit<AuditEntry, "timestamp">) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) return;

  const settings = (org.settings as Record<string, unknown>) || {};
  const auditLog = (settings.auditLog as AuditEntry[]) || [];

  auditLog.unshift({ ...entry, timestamp: new Date().toISOString() });

  // Keep last 500 entries
  const trimmed = auditLog.slice(0, 500);

  await db.update(organizations).set({
    settings: { ...settings, auditLog: trimmed },
    updatedAt: new Date(),
  }).where(eq(organizations.id, orgId));
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const settings = (org.settings as Record<string, unknown>) || {};
  const auditLog = ((settings.auditLog as AuditEntry[]) || []).slice(0, limit);

  return NextResponse.json({ auditLog, total: ((settings.auditLog as AuditEntry[]) || []).length });
}
