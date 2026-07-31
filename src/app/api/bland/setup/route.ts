import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Bland.ai Setup API
 * POST /api/bland/setup
 * Body: { apiKey, agentId, phoneNumber, orgSlug? }
 *
 * This endpoint configures Bland.ai for an organization.
 * Only use during initial setup.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, agentId, phoneNumber, orgSlug } = body;

    if (!apiKey || !agentId || !phoneNumber) {
      return NextResponse.json({ error: "apiKey, agentId, and phoneNumber are required" }, { status: 400 });
    }

    // Find or create organization
    let org;
    if (orgSlug) {
      [org] = await db.select().from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
    }

    if (!org) {
      // Get first org
      const orgs = await db.select().from(organizations).limit(1);
      org = orgs[0];
    }

    if (!org) {
      return NextResponse.json({ error: "No organization found. Create one first." }, { status: 404 });
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/api/bland/webhook`;

    const blandConfig = {
      apiKey,
      phoneNumber,
      agentId,
      webhookUrl,
      dispatchSettings: {
        forcedDispatch: false,
        autoAssign: true,
        maxWaitMinutes: 5,
        retryOnDecline: true,
      },
      qcSettings: {
        enabled: true,
        delayMinutes: 30,
        askSatisfaction: true,
        askReview: true,
      },
    };

    // Update organization
    await db.update(organizations).set({
      blandPhoneNumber: phoneNumber,
      settings: {
        ...(org.settings as Record<string, unknown>),
        blandConfig,
      },
      updatedAt: new Date(),
    }).where(eq(organizations.id, org.id));

    // Also configure the webhook on Bland.ai side
    try {
      await fetch(`https://api.bland.ai/v1/agents/${agentId}`, {
        method: "PATCH",
        headers: {
          "Authorization": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook: webhookUrl,
        }),
      });
    } catch (e) {
      console.log("Could not auto-configure Bland webhook:", e);
    }

    return NextResponse.json({
      success: true,
      organization: org.name,
      blandConfig: {
        agentId,
        phoneNumber,
        webhookUrl,
      },
      message: "Bland.ai configured successfully! Test by calling the phone number.",
    });
  } catch (err) {
    console.error("Bland setup error:", err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    instructions: "POST to this endpoint with your Bland.ai credentials",
    requiredFields: ["apiKey", "agentId", "phoneNumber"],
    example: {
      apiKey: "org_xxxxx",
      agentId: "776ac8ef-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      phoneNumber: "+12536501545",
    },
  });
}