import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Notifications Settings API
 * GET /api/notifications/settings — get settings
 * POST /api/notifications/settings — save settings
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const notifSettings = (settings.notifications as Record<string, unknown>) || {};

  return NextResponse.json({
    settings: {
      telegramChatId: notifSettings.telegramChatId || "",
      telegramEnabled: notifSettings.telegramEnabled || false,
      reportFrequency: notifSettings.reportFrequency || ["daily"],
      pushEnabled: notifSettings.pushEnabled || false,
      emailEnabled: notifSettings.emailEnabled || true,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { telegramChatId, telegramEnabled, reportFrequency, pushEnabled, emailEnabled } = body;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const currentSettings = (org?.settings as Record<string, unknown>) || {};

  await db.update(organizations).set({
    settings: {
      ...currentSettings,
      notifications: {
        telegramChatId: telegramChatId || "",
        telegramEnabled: telegramEnabled || false,
        reportFrequency: reportFrequency || ["daily"],
        pushEnabled: pushEnabled || false,
        emailEnabled: emailEnabled !== false,
      },
    },
    updatedAt: new Date(),
  }).where(eq(organizations.id, user.orgId));

  return NextResponse.json({ success: true });
}