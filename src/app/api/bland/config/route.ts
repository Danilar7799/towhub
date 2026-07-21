import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Bland.ai Configuration per Company
 *
 * Each company configures their own:
 * - Bland.ai API key
 * - Phone number
 * - AI agent prompt
 * - Webhook URL
 * - Dispatch settings (forced, auto-assign, etc.)
 *
 * GET /api/bland/config — get config
 * POST /api/bland/config — save config
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const blandConfig = (settings.blandConfig as Record<string, unknown>) || {};

  return NextResponse.json({
    config: {
      apiKey: blandConfig.apiKey ? "••••••••" : null,
      phoneNumber: blandConfig.phoneNumber || org?.blandPhoneNumber || null,
      agentPrompt: blandConfig.agentPrompt || getDefaultPrompt(org?.name || "Your Towing Company"),
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/api/bland/webhook`,
      dispatchSettings: blandConfig.dispatchSettings || {
        forcedDispatch: false,
        autoAssign: true,
        maxWaitMinutes: 5,
        retryOnDecline: true,
      },
      qcSettings: blandConfig.qcSettings || {
        enabled: true,
        delayMinutes: 30,
        askSatisfaction: true,
        askReview: true,
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { apiKey, phoneNumber, agentPrompt, dispatchSettings, qcSettings } = body;

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};

  const blandConfig = {
    ...(settings.blandConfig as Record<string, unknown>),
    apiKey: apiKey || (settings.blandConfig as Record<string, unknown>)?.apiKey,
    phoneNumber: phoneNumber || (settings.blandConfig as Record<string, unknown>)?.phoneNumber,
    agentPrompt: agentPrompt || (settings.blandConfig as Record<string, unknown>)?.agentPrompt,
    dispatchSettings: dispatchSettings || (settings.blandConfig as Record<string, unknown>)?.dispatchSettings,
    qcSettings: qcSettings || (settings.blandConfig as Record<string, unknown>)?.qcSettings,
  };

  await db.update(organizations).set({
    settings: { ...settings, blandConfig },
    blandPhoneNumber: phoneNumber || org?.blandPhoneNumber,
    updatedAt: new Date(),
  }).where(eq(organizations.id, user.orgId));

  return NextResponse.json({ success: true, message: "Bland.ai configuration saved" });
}

function getDefaultPrompt(companyName: string) {
  return `You are an AI dispatcher for ${companyName}, a towing company. Your job is to:

1. Greet the caller professionally
2. Ask what type of service they need (tow, lockout, jump start, tire change, fuel delivery)
3. Get their exact location (address or cross streets)
4. If towing, ask where they want the vehicle taken
5. Get their vehicle information (make, model, year, color)
6. Get their name and phone number
7. Confirm the details and let them know a driver will be dispatched

Be friendly, professional, and efficient. Keep the call under 3 minutes if possible.

After collecting all information, say: "Thank you! I have all your details. A driver will be dispatched to you shortly. You'll receive a text message with your driver's information."

Important: Always get the exact address. If they say "on the highway", ask for mile marker or nearest exit.`;
}
