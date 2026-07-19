import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const all = await db.select().from(invoices)
    .where(status ? and(eq(invoices.orgId, user.orgId), eq(invoices.status, status as "draft" | "sent" | "paid" | "overdue" | "cancelled")) : eq(invoices.orgId, user.orgId))
    .orderBy(desc(invoices.createdAt));

  return NextResponse.json({ invoices: all });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { jobId, customerId, subtotal, tax, discount, notes, dueDate, items } = body;
  if (!subtotal) return NextResponse.json({ error: "Subtotal required" }, { status: 400 });

  const total = (subtotal || 0) + (tax || 0) - (discount || 0);
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

  const [invoice] = await db.insert(invoices).values({
    orgId: user.orgId, jobId, customerId, invoiceNumber, subtotal, tax: tax || 0, discount: discount || 0, total, notes,
    dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 86400000),
  }).returning();

  return NextResponse.json({ invoice });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  if (updates.status === "paid") updates.paidAt = new Date();
  if (updates.status === "sent") updates.sentAt = new Date();

  const [updated] = await db.update(invoices).set({ ...updates, updatedAt: new Date() }).where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId))).returning();
  return NextResponse.json({ invoice: updated });
}
