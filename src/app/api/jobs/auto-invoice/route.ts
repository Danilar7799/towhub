import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, invoices, organizations, customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Auto-invoice — creates invoice automatically when job is completed
 *
 * POST /api/jobs/auto-invoice
 * { jobId }
 *
 * Called automatically when job status changes to "completed".
 * Creates an invoice with job details.
 */

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "completed") return NextResponse.json({ error: "Job must be completed" }, { status: 400 });

  // Check if invoice already exists for this job
  const existing = await db.select().from(invoices).where(eq(invoices.jobId, jobId)).limit(1);
  if (existing.length > 0) return NextResponse.json({ invoice: existing[0], message: "Invoice already exists" });

  // Find or create customer
  let customerId = null;
  if (job.customerPhone || job.customerEmail) {
    const existingCustomers = await db.select().from(customers).where(eq(customers.orgId, job.orgId)).limit(100);
    const match = existingCustomers.find(c =>
      (job.customerPhone && c.phone === job.customerPhone) ||
      (job.customerEmail && c.email === job.customerEmail)
    );

    if (match) {
      customerId = match.id;
      // Update customer stats
      await db.update(customers).set({
        totalJobs: (match.totalJobs || 0) + 1,
        totalSpent: (match.totalSpent || 0) + (job.totalAmount || 0),
        updatedAt: new Date(),
      }).where(eq(customers.id, match.id));
    } else if (job.customerName) {
      // Create new customer
      const [newCustomer] = await db.insert(customers).values({
        orgId: job.orgId,
        name: job.customerName,
        phone: job.customerPhone,
        email: job.customerEmail,
        totalJobs: 1,
        totalSpent: job.totalAmount || 0,
      }).returning();
      customerId = newCustomer.id;
    }
  }

  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  const subtotal = job.totalAmount || 0;
  const taxRate = 0; // Could be configurable per org
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const [invoice] = await db.insert(invoices).values({
    orgId: job.orgId,
    jobId: job.id,
    customerId,
    invoiceNumber,
    subtotal,
    tax,
    total,
    status: "draft",
    dueDate: new Date(Date.now() + 30 * 86400000), // 30 days
  }).returning();

  return NextResponse.json({
    invoice,
    customer: customerId ? "linked" : "none",
    message: `Invoice ${invoiceNumber} created for $${total.toFixed(2)}`,
  });
}
