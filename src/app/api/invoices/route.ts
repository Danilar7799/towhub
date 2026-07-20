import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { invoices, jobs, customers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const baseWhere = status
    ? and(eq(invoices.orgId, user.orgId), eq(invoices.status, status as "draft" | "sent" | "paid" | "overdue" | "cancelled"))
    : eq(invoices.orgId, user.orgId);

  const pagination = parsePagination(searchParams);

  // Fetch invoices
  const data = await db.select().from(invoices).where(baseWhere).orderBy(desc(invoices.createdAt));

  // Enrich with job + customer data
  const enriched = await Promise.all(data.map(async (inv) => {
    let jobInfo: any = null;
    let customerInfo: any = null;

    if (inv.jobId) {
      const [job] = await db.select().from(jobs).where(eq(jobs.id, inv.jobId)).limit(1);
      if (job) {
        jobInfo = {
          pickupAddress: job.pickupAddress,
          destinationAddress: job.destinationAddress,
          vehicle: [job.towVehicleYear, job.towVehicleMake, job.towVehicleModel].filter(Boolean).join(" "),
          vehicleColor: job.towVehicleColor,
          vehiclePlate: job.towVehiclePlate,
          source: job.source,
          status: job.status,
        };
        // Get customer from job
        if (job.customerName) {
          customerInfo = { name: job.customerName, phone: job.customerPhone, email: job.customerEmail };
        }
      }
    }

    if (inv.customerId && !customerInfo) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, inv.customerId)).limit(1);
      if (cust) customerInfo = { name: cust.name, phone: cust.phone, email: cust.email, company: cust.company };
    }

    return {
      ...inv,
      customerName: customerInfo?.name || null,
      customerPhone: customerInfo?.phone || null,
      customerEmail: customerInfo?.email || null,
      customerCompany: customerInfo?.company || null,
      jobPickup: jobInfo?.pickupAddress || null,
      jobDestination: jobInfo?.destinationAddress || null,
      jobVehicle: jobInfo?.vehicle || null,
      jobVehicleColor: jobInfo?.vehicleColor || null,
      jobVehiclePlate: jobInfo?.vehiclePlate || null,
      jobSource: jobInfo?.source || null,
      jobStatus: jobInfo?.status || null,
    };
  }));

  return NextResponse.json({ invoices: enriched });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { jobId, customerId, subtotal, tax, discount, notes, dueDate, customerName, customerPhone, customerEmail } = body;
  if (!subtotal) return NextResponse.json({ error: "Subtotal required" }, { status: 400 });

  const total = (parseFloat(subtotal) || 0) + (parseFloat(tax) || 0) - (parseFloat(discount) || 0);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const invoiceNumber = `INV-${dateStr}-${rand}`;

  const [invoice] = await db.insert(invoices).values({
    orgId: user.orgId, jobId, customerId, invoiceNumber,
    subtotal: parseFloat(subtotal), tax: parseFloat(tax || "0"), discount: parseFloat(discount || "0"),
    total, notes, customerName, customerPhone, customerEmail,
    dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 86400000),
  }).returning();

  return NextResponse.json({ invoice });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Whitelist safe fields
  const allowed: Record<string, unknown> = {};
  for (const key of ["status", "subtotal", "tax", "discount", "total", "paidAmount", "notes", "dueDate", "paymentMethod", "customerName", "customerPhone", "customerEmail"]) {
    if (key in updates) allowed[key] = updates[key];
  }

  if (allowed.status === "paid") { (allowed as any).paidAt = new Date(); (allowed as any).paidAmount = (allowed as any).paidAmount || updates.total; }
  if (allowed.status === "sent") (allowed as any).sentAt = new Date();

  const [updated] = await db.update(invoices).set({ ...allowed, updatedAt: new Date() }).where(and(eq(invoices.id, id), eq(invoices.orgId, user.orgId))).returning();
  return NextResponse.json({ invoice: updated });
}
