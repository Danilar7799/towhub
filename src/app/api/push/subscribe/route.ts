import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Web Push Subscription API
 * POST /api/push/subscribe — save push subscription
 * POST /api/push/send — send push notification (internal)
 *
 * Requires VAPID keys: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { subscription } = body;

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Store subscription in org settings
  const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const pushSubscriptions = (settings.pushSubscriptions as Record<string, unknown>[]) || [];

  // Add or update subscription
  const existing = pushSubscriptions.findIndex((s: Record<string, unknown>) => s.userId === user.id);
  const entry = {
    userId: user.id,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    createdAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    pushSubscriptions[existing] = entry;
  } else {
    pushSubscriptions.push(entry);
  }

  await db.update(organizations).set({
    settings: { ...settings, pushSubscriptions },
    updatedAt: new Date(),
  }).where(eq(organizations.id, user.orgId));

  return NextResponse.json({ ok: true, message: "Push notifications enabled" });
}
