import { db } from "@/db";
import { invoices, jobs, organizations, customers } from "@/db/schema";
import { eq, and, desc, like } from "drizzle-orm";

/**
 * Auto-generate invoice number in format INV-YYYYMMDD-XXXX
 * where XXXX is a zero-padded sequential number for that day.
 */
async function generateInvoiceNumber(orgId: string): Promise<string> {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");

  const prefix = `INV-${dateStr}-`;

  // Find the highest existing invoice number for this org on this date
  const [lastInvoice] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(
      and(
        eq(invoices.orgId, orgId),
        like(invoices.invoiceNumber, `${prefix}%`)
      )
    )
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  let nextSeq = 1;
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoiceNumber.split("-").pop() ?? "0", 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  return `${prefix}${nextSeq.toString().padStart(4, "0")}`;
}

/**
 * Find or create a customer record for the given job's customer info.
 * Returns the customer id, or null if no customer name is available.
 */
async function findOrCreateCustomer(
  orgId: string,
  customerName: string | null,
  customerEmail: string | null,
  customerPhone: string | null
): Promise<string | null> {
  if (!customerName) return null;

  // Try to find existing customer by name + org
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(eq(customers.orgId, orgId), eq(customers.name, customerName))
    )
    .limit(1);

  if (existing) return existing.id;

  // Create new customer
  const [created] = await db
    .insert(customers)
    .values({
      orgId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    })
    .returning({ id: customers.id });

  return created.id;
}

/**
 * Get the tax rate from organization settings.
 * Expects org.settings.taxRate as a percentage (e.g. 8.5 for 8.5%).
 * Defaults to 0 if not configured.
 */
async function getOrgTaxRate(orgId: string): Promise<number> {
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) return 0;

  const settings = org.settings as Record<string, unknown> | null;
  if (settings && typeof settings === "object" && "taxRate" in settings) {
    const rate = Number(settings.taxRate);
    return isNaN(rate) ? 0 : rate;
  }

  return 0;
}

/**
 * Auto-create an invoice for a completed job.
 *
 * - Skips creation if an invoice already exists for this job.
 * - Uses the job's totalAmount as subtotal.
 * - Applies org-configured tax rate.
 * - Generates an INV-YYYYMMDD-XXXX invoice number.
 * - Links or creates a customer record.
 *
 * @returns The created invoice, or the existing invoice if one was already linked.
 */
export async function autoCreateInvoice(
  orgId: string,
  jobId: string
) {
  // 1) Check if invoice already exists for this job
  const [existingInvoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), eq(invoices.jobId, jobId)))
    .limit(1);

  if (existingInvoice) {
    return existingInvoice;
  }

  // 2) Get the job details
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.orgId, orgId)))
    .limit(1);

  if (!job) {
    throw new Error(`Job ${jobId} not found for org ${orgId}`);
  }

  const subtotal = job.totalAmount ?? 0;

  // 3) Get org settings for tax rate
  const taxRatePercent = await getOrgTaxRate(orgId);
  const tax = Math.round(subtotal * (taxRatePercent / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  // 4) Generate invoice number
  const invoiceNumber = await generateInvoiceNumber(orgId);

  // 5) Find or create the customer record
  const customerId = await findOrCreateCustomer(
    orgId,
    job.customerName,
    job.customerEmail,
    job.customerPhone
  );

  // Due date: 30 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  // 6) Create the invoice
  const [invoice] = await db
    .insert(invoices)
    .values({
      orgId,
      jobId,
      customerId,
      invoiceNumber,
      status: "draft",
      subtotal,
      tax,
      discount: 0,
      total,
      paidAmount: 0,
      paymentMethod: job.paymentMethod ?? null,
      notes: `Auto-generated invoice for job ${jobId}`,
      dueDate,
    })
    .returning();

  return invoice;
}
