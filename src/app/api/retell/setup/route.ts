import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import Retell from "retell-sdk";

/*
 * Retell AI Setup API
 * POST /api/retell/setup — configure Retell for organization
 * GET /api/retell/setup — get Retell config
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const retellConfig = (settings.retellConfig as Record<string, unknown>) || {};

  return NextResponse.json({
    config: {
      apiKey: retellConfig.apiKey ? "••••••••" : null,
      agentId: retellConfig.agentId || null,
      phoneNumber: retellConfig.phoneNumber || null,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/api/retell/webhook`,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { apiKey, agentId, phoneNumber } = body;

  if (!apiKey) return NextResponse.json({ error: "apiKey required" }, { status: 400 });

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/api/retell/webhook`;

  // Validate API key by listing agents
  try {
    const client = new Retell({ apiKey });
    await client.agent.list();
    console.log("[Retell Setup] API key valid");
  } catch (err) {
    return NextResponse.json({ error: "Invalid Retell API key" }, { status: 400 });
  }

  // Note: Webhook must be registered manually in Retell Dashboard
  // URL: https://towhub.vercel.app/api/retell/webhook
  // Events: call_ended, call_analyzed

  // Update org settings
  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const currentSettings = (org?.settings as Record<string, unknown>) || {};

  await db.update(organizations).set({
    settings: {
      ...currentSettings,
      retellConfig: {
        apiKey,
        agentId: agentId || null,
        phoneNumber: phoneNumber || null,
        webhookUrl,
      },
    },
    updatedAt: new Date(),
  }).where(eq(organizations.id, user.orgId));

  return NextResponse.json({
    success: true,
    message: "Retell AI configured successfully!",
    config: {
      agentId,
      phoneNumber,
      webhookUrl,
    },
  });
}