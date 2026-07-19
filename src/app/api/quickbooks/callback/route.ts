import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * QuickBooks OAuth2 Callback
 * GET /api/quickbooks/callback?code=xxx&state=orgId_timestamp
 *
 * Exchanges authorization code for access + refresh tokens
 * Stores tokens in organization settings.integrations.quickbooks
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=integrations&error=missing_params", req.url));
  }

  const orgId = state.split("_")[0];
  if (!orgId) {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=integrations&error=invalid_state", req.url));
  }

  try {
    const clientId = process.env.QB_CLIENT_ID;
    const clientSecret = process.env.QB_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/api/quickbooks/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL("/dashboard/settings?tab=integrations&error=server_config", req.url));
    }

    // Exchange code for tokens
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://oauth.platform.intuit.com/oauth2/tokens/bearer", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("QB token exchange failed:", errText);
      return NextResponse.redirect(new URL("/dashboard/settings?tab=integrations&error=token_exchange", req.url));
    }

    const tokenData = await tokenRes.json();

    // Store credentials in org settings
    const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const integrations = (currentSettings.integrations as Record<string, Record<string, string>>) || {};

    integrations.quickbooks = {
      clientId,
      clientSecret,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      companyId: realmId || "",
      expiresIn: String(tokenData.expires_in),
      connectedAt: new Date().toISOString(),
    };

    await db.update(organizations).set({
      settings: { ...currentSettings, integrations },
      updatedAt: new Date(),
    }).where(eq(organizations.id, orgId));

    return NextResponse.redirect(new URL("/dashboard/settings?tab=integrations&success=quickbooks", req.url));
  } catch (e) {
    console.error("QB callback error:", e);
    return NextResponse.redirect(new URL("/dashboard/settings?tab=integrations&error=unknown", req.url));
  }
}
