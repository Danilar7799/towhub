import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET — list notifications for current user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.select().from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return NextResponse.json({ notifications: items });
}

// PUT — mark as read
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.markAllRead) {
    await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, body.id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "id or markAllRead required" }, { status: 400 });
}

// POST — create notification (internal use)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, orgId, type, title, message, link } = body;

  if (!userId || !type || !title) {
    return NextResponse.json({ error: "userId, type, title required" }, { status: 400 });
  }

  const [notification] = await db.insert(notifications).values({
    userId,
    orgId: orgId || null,
    type,
    title,
    message: message || "",
    link: link || null,
  }).returning();

  // Try browser push notification
  try {
    await sendPushNotification(userId, title, message || "", link);
  } catch {}

  return NextResponse.json({ notification });
}

// Send browser push notification
async function sendPushNotification(userId: string, title: string, body: string, url?: string) {
  // Web Push requires VAPID keys and subscription storage
  // For now, we rely on in-app polling
  // TODO: implement web-push when VAPID keys are configured
}
