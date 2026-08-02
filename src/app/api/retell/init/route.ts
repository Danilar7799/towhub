import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Retell AI First-Time Setup
 * POST /api/retell/init — save Retell config to first org (no auth required for initial setup)
 */

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { apiKey, agentId, phoneNumber } = body;

  if (!apiKey || !agentId) {
    return NextResponse.json({ error: "apiKey and agentId required" }, { status: 400 });
  }

  // Get first org
  const orgs = await db.select().from(organizations).limit(1);
  if (orgs.length === 0) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  const org = orgs[0];
  const currentSettings = (org.settings as Record<string, unknown>) || {};

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/api/retell/webhook`;

  await db.update(organizations).set({
    settings: {
      ...currentSettings,
      retellConfig: {
        apiKey,
        agentId,
        phoneNumber: phoneNumber || "",
        webhookUrl,
      },
    },
    updatedAt: new Date(),
  }).where(eq(organizations.id, org.id));

  return NextResponse.json({
    success: true,
    organization: org.name,
    retellConfig: {
      agentId,
      phoneNumber: phoneNumber || "(not set)",
      webhookUrl,
    },
  });
}