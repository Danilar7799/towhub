import { db } from "@/db";
import { customers, jobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Auto-create or update customer record when a job is created/completed.
 * Matches by phone number (primary) or email (secondary).
 */
export async function autoCreateCustomer(orgId: string, jobData: {
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  totalAmount?: number | null;
}) {
  if (!jobData.customerName && !jobData.customerPhone && !jobData.customerEmail) return null;

  try {
    let existing = null;

    // Try to find by phone
    if (jobData.customerPhone) {
      const [byPhone] = await db.select().from(customers).where(
        and(eq(customers.orgId, orgId), eq(customers.phone, jobData.customerPhone))
      ).limit(1);
      existing = byPhone;
    }

    // Try by email if not found by phone
    if (!existing && jobData.customerEmail) {
      const [byEmail] = await db.select().from(customers).where(
        and(eq(customers.orgId, orgId), eq(customers.email, jobData.customerEmail))
      ).limit(1);
      existing = byEmail;
    }

    if (existing) {
      // Update existing customer stats
      await db.update(customers).set({
        totalJobs: (existing.totalJobs || 0) + 1,
        totalSpent: (existing.totalSpent || 0) + (jobData.totalAmount || 0),
        // Update name if we have a better one
        ...(jobData.customerName && !existing.name ? { name: jobData.customerName } : {}),
        updatedAt: new Date(),
      }).where(eq(customers.id, existing.id));
      return existing;
    }

    // Create new customer
    const [newCustomer] = await db.insert(customers).values({
      orgId,
      name: jobData.customerName || "Walk-in Customer",
      phone: jobData.customerPhone || null,
      email: jobData.customerEmail || null,
      totalJobs: 1,
      totalSpent: jobData.totalAmount || 0,
    }).returning();

    return newCustomer;
  } catch (e) {
    console.error("autoCreateCustomer error:", e);
    return null;
  }
}
