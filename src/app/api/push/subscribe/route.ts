import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@towhub.app";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function GET() {
  if (!vapidPublicKey) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey: vapidPublicKey });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subscription, userAgent, deviceType } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

        // Store subscription in org settings
        const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
        const currentSettings = (org?.settings as Record<string, unknown>) || {};
        let pushSubscriptions = (currentSettings.pushSubscriptions as Array<Record<string, unknown>>) || [];

        // Check if subscription already exists (by endpoint)
        const existingIndex = pushSubscriptions.findIndex(s => s.endpoint === subscription.endpoint);

        const subRecord = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userId: user.id,
      userAgent: userAgent || navigator?.userAgent || "unknown",
      deviceType: deviceType || "web",
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      pushSubscriptions[existingIndex] = subRecord;
    } else {
      pushSubscriptions.push(subRecord);
    }

    // Keep only last 10 subscriptions per user
    const userSubs = pushSubscriptions.filter(s => s.userId === user.id);
    if (userSubs.length > 10) {
      const toRemove = userSubs.slice(0, userSubs.length - 10).map(s => s.endpoint);
      pushSubscriptions = pushSubscriptions.filter(s => !toRemove.includes(s.endpoint));
    }

    await db.update(organizations).set({
      settings: { ...currentSettings, pushSubscriptions },
      updatedAt: new Date(),
    }).where(eq(organizations.id, user.orgId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Push Subscribe] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");
    
    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const pushSubscriptions = (currentSettings.pushSubscriptions as Array<Record<string, unknown>>) || [];

    const filtered = pushSubscriptions.filter(s => s.endpoint !== endpoint);

    await db.update(organizations).set({
      settings: { ...currentSettings, pushSubscriptions: filtered },
      updatedAt: new Date(),
    }).where(eq(organizations.id, user.orgId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Push Unsubscribe] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}