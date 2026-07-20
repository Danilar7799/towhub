import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, invoices, customers } from "@/db/schema";
import { eq, or, and } from "drizzle-orm";

/*
 * Customer Tracking API — public endpoint (no auth required)
 *
 * GET /api/track?q=phone_or_id
 *   Returns a single job for quick tracking lookup
 *
 * POST /api/track
 *   Body: { phone, jobIdLast4 }
 *   Customer portal login — verifies phone + last 4 chars of any job ID
 *   Returns all jobs, invoices, and customer info for that phone number
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Query required" }, { status: 400 });

  // Search by phone number or job ID
  const results = await db.select().from(jobs).where(
    or(
      eq(jobs.customerPhone, q),
      eq(jobs.id, q),
    )
  ).limit(1);

  if (results.length === 0) {
    return NextResponse.json({ job: null, message: "No job found" });
  }

  const job = results[0];

  // Return limited info for customer
  return NextResponse.json({
    job: {
      id: job.id,
      status: job.status,
      pickupAddress: job.pickupAddress,
      destinationAddress: job.destinationAddress,
      totalAmount: job.totalAmount,
      isPaid: job.isPaid,
      towVehicleMake: job.towVehicleMake,
      towVehicleModel: job.towVehicleModel,
      towVehicleYear: job.towVehicleYear,
      towVehicleColor: job.towVehicleColor,
      towVehiclePlate: job.towVehiclePlate,
      createdAt: job.createdAt,
      estimatedArrival: job.estimatedArrival,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phone, jobIdLast4 } = body;

  if (!phone || !jobIdLast4) {
    return NextResponse.json({ error: "Phone number and last 4 characters of job ID are required" }, { status: 400 });
  }

  if (jobIdLast4.length < 4) {
    return NextResponse.json({ error: "Please enter at least 4 characters of your job ID" }, { status: 400 });
  }

  // Normalize phone — strip spaces, dashes, parens
  const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");

  // Find all jobs for this phone number
  const customerJobs = await db.select().from(jobs).where(
    eq(jobs.customerPhone, normalizedPhone)
  );

  if (customerJobs.length === 0) {
    // Try with original format too
    const altJobs = await db.select().from(jobs).where(eq(jobs.customerPhone, phone));
    if (altJobs.length === 0) {
      return NextResponse.json({ error: "No jobs found for this phone number" }, { status: 404 });
    }
    return verifyAndReturn(altJobs, jobIdLast4, normalizedPhone);
  }

  return verifyAndReturn(customerJobs, jobIdLast4, normalizedPhone);
}

async function verifyAndReturn(customerJobs: typeof jobs.$inferSelect[], jobIdLast4: string, phone: string) {
  // Verify that at least one job ID ends with the provided last 4 characters
  const matchingJob = customerJobs.find(j =>
    j.id.replace(/-/g, "").toLowerCase().endsWith(jobIdLast4.replace(/-/g, "").toLowerCase()) ||
    j.id.toLowerCase().endsWith(jobIdLast4.toLowerCase())
  );

  if (!matchingJob) {
    return NextResponse.json({ error: "No job matches those credentials. Check your job ID." }, { status: 401 });
  }

  // Get orgId from the first job to find invoices and customer record
  const orgId = customerJobs[0].orgId;

  // Find customer record by phone
  const [customerRecord] = await db.select().from(customers).where(
    and(eq(customers.phone, phone), eq(customers.orgId, orgId))
  ).limit(1);

  // Get all invoices for this customer (by customerId or by matching jobIds)
  const jobIds = customerJobs.map(j => j.id);

  let customerInvoices: (typeof invoices.$inferSelect)[] = [];
  if (customerRecord) {
    customerInvoices = await db.select().from(invoices).where(
      and(eq(invoices.customerId, customerRecord.id), eq(invoices.orgId, orgId))
    );
  }
  // Also get invoices linked directly to jobs
  for (const jobId of jobIds) {
    const jobInvoices = await db.select().from(invoices).where(
      and(eq(invoices.jobId, jobId), eq(invoices.orgId, orgId))
    );
    for (const inv of jobInvoices) {
      if (!customerInvoices.find(ci => ci.id === inv.id)) {
        customerInvoices.push(inv);
      }
    }
  }

  // Map jobs to safe public shape
  const safeJobs = customerJobs
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(job => ({
      id: job.id,
      status: job.status,
      customerName: job.customerName,
      pickupAddress: job.pickupAddress,
      destinationAddress: job.destinationAddress,
      totalAmount: job.totalAmount,
      isPaid: job.isPaid,
      paymentMethod: job.paymentMethod,
      towVehicleMake: job.towVehicleMake,
      towVehicleModel: job.towVehicleModel,
      towVehicleYear: job.towVehicleYear,
      towVehicleColor: job.towVehicleColor,
      towVehiclePlate: job.towVehiclePlate,
      assignedDriverId: job.assignedDriverId,
      estimatedArrival: job.estimatedArrival,
      notes: job.notes,
      createdAt: job.createdAt,
      assignedAt: job.assignedAt,
      enRouteAt: job.enRouteAt,
      onSceneAt: job.onSceneAt,
      towingAt: job.towingAt,
      completedAt: job.completedAt,
      cancelledAt: job.cancelledAt,
    }));

  // Map invoices to safe public shape
  const safeInvoices = customerInvoices.map(inv => ({
    id: inv.id,
    jobId: inv.jobId,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    subtotal: inv.subtotal,
    tax: inv.tax,
    discount: inv.discount,
    total: inv.total,
    paidAmount: inv.paidAmount,
    dueDate: inv.dueDate,
    paidAt: inv.paidAt,
    createdAt: inv.createdAt,
  }));

  return NextResponse.json({
    customer: customerRecord ? {
      id: customerRecord.id,
      name: customerRecord.name,
      phone: customerRecord.phone,
      email: customerRecord.email,
      address: customerRecord.address,
      city: customerRecord.city,
      state: customerRecord.state,
      zip: customerRecord.zip,
      totalJobs: customerRecord.totalJobs,
      isVip: customerRecord.isVip,
    } : {
      name: customerJobs[0].customerName,
      phone,
    },
    jobs: safeJobs,
    invoices: safeInvoices,
  });
}
