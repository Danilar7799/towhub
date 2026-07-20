import { db } from "@/db";
import { users, notifications, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Create a notification for all users in an organization.
 * Also sends browser push notifications to subscribed users.
 */
export async function notifyOrg(orgId: string, type: "lead" | "job" | "payment" | "system", title: string, message: string, link?: string) {
  try {
    // Get all active users in the org
    const orgUsers = await db.select({ id: users.id }).from(users).where(eq(users.orgId, orgId));

    // Create in-app notification for each user
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

    // Send browser push notifications
    try {
      const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
      const settings = (org?.settings as Record<string, unknown>) || {};
      const pushSubscriptions = (settings.pushSubscriptions as { userId: string; endpoint: string; keys: Record<string, string> }[]) || [];

      // Send to subscribed users in this org
      for (const sub of pushSubscriptions) {
        const isOrgUser = orgUsers.some(u => u.id === sub.userId);
        if (!isOrgUser || !sub.endpoint) continue;

        try {
          // Dynamic import to avoid bundling web-push when not needed
          const webPush = await import("web-push").catch(() => null);
          if (!webPush) continue;

          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

          if (!vapidPublicKey || !vapidPrivateKey) continue;

          webPush.setVapidDetails("mailto:support@towhub.com", vapidPublicKey, vapidPrivateKey);

          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys } as { endpoint: string; keys: { p256dh: string; auth: string } },
            JSON.stringify({
              title,
              body: message,
              url: link || "/dashboard",
              tag: `towhub-${type}`,
            })
          );
        } catch (e) {
          // Push failed silently — in-app notification still works
          console.warn(`Push notification failed for user ${sub.userId}:`, e);
        }
      }
    } catch (e) {
      // Push setup failed — in-app notifications still work
      console.warn("Push notification setup failed:", e);
    }
  } catch (e) {
    console.error("Failed to create notifications:", e);
  }
}
