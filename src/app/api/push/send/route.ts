import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations, jobs, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@towhub.app";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId || !["owner", "admin", "dispatcher"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: PushPayload & { 
      targetUserIds?: string[]; 
      targetRoles?: string[];
      jobId?: string;
    } = await req.json();

    const { targetUserIds, targetRoles, jobId, ...payload } = body;

    // Get organization with push subscriptions
    const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const pushSubscriptions = (currentSettings.pushSubscriptions as Array<Record<string, unknown>>) || [];

    if (pushSubscriptions.length === 0) {
      return NextResponse.json({ error: "No push subscriptions", sent: 0 });
    }

    // Determine target users
    let targetUsers: Array<{ id: string; role: string }> = [];
    
    if (targetUserIds?.length) {
      const found = await db.select({ id: users.id, role: users.role }).from(users).where(and(eq(users.orgId, user.orgId), inArray(users.id, targetUserIds)));
      targetUsers = found;
    } else if (targetRoles?.length) {
      const found = await db.select({ id: users.id, role: users.role }).from(users).where(and(eq(users.orgId, user.orgId), inArray(users.role, targetRoles as ("super_admin" | "owner" | "admin" | "dispatcher" | "driver")[])));
      targetUsers = found;
    } else if (jobId) {
      // Get driver assigned to job
      const [job] = await db.select({ assignedDriverId: jobs.assignedDriverId }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
      if (job?.assignedDriverId) {
        const [driver] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, job.assignedDriverId)).limit(1);
        if (driver) targetUsers = [driver];
      }
    } else {
      // Default: all active drivers + dispatchers
      const found = await db.select({ id: users.id, role: users.role }).from(users).where(and(eq(users.orgId, user.orgId), eq(users.isActive, true), inArray(users.role, ["driver", "dispatcher", "admin", "owner"])));
      targetUsers = found;
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ error: "No target users found", sent: 0 });
    }

    // Filter subscriptions for target users
    const targetUserIdsSet = new Set(targetUsers.map(u => u.id));
    const targetSubscriptions = pushSubscriptions.filter(s => targetUserIdsSet.has(s.userId as string));

    if (targetSubscriptions.length === 0) {
      return NextResponse.json({ error: "No push subscriptions for target users", sent: 0 });
    }

    // Send push notifications
    const pushPromises = targetSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: sub.keys as { p256dh: string; auth: string },
          },
          JSON.stringify(payload)
        );
        return { success: true, endpoint: sub.endpoint };
      } catch (err: unknown) {
        const error = err as { statusCode?: number };
        // Remove expired/invalid subscriptions
        if (error.statusCode === 404 || error.statusCode === 410) {
          // Will clean up after
          return { success: false, endpoint: sub.endpoint, expired: true };
        }
        console.error("[Push Send] Failed:", err);
        return { success: false, endpoint: sub.endpoint, error: String(err) };
      }
    });

    const results = await Promise.all(pushPromises);
    const sent = results.filter(r => r.success).length;
    const expired = results.filter(r => r.expired).map(r => r.endpoint);

    // Clean up expired subscriptions
    if (expired.length > 0) {
      const filtered = pushSubscriptions.filter(s => !expired.includes(s.endpoint as string));
      await db.update(organizations).set({
        settings: { ...currentSettings, pushSubscriptions: filtered },
        updatedAt: new Date(),
      }).where(eq(organizations.id, user.orgId));
    }

    return NextResponse.json({ 
      success: true, 
      sent, 
      total: targetSubscriptions.length,
      expired: expired.length,
    });
  } catch (err) {
    console.error("[Push Send] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}