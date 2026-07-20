import { db } from "@/db";
import { users, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Create a notification for all users in an organization
 * Used when new leads, jobs, payments come in
 */
export async function notifyOrg(orgId: string, type: "lead" | "job" | "payment" | "system", title: string, message: string, link?: string) {
  try {
    // Get all active users in the org
    const orgUsers = await db.select({ id: users.id }).from(users).where(eq(users.orgId, orgId));

    // Create notification for each user
    for (const u of orgUsers) {
      await db.insert(notifications).values({
        userId: u.id,
        orgId,
        type,
        title,
        message,
        link: link || null,
      });
    }
  } catch (e) {
    console.error("Failed to create notifications:", e);
  }
}
