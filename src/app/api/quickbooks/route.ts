import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * QuickBooks OAuth Integration
 * GET /api/quickbooks/connect — start OAuth flow
 * GET /api/quickbooks/callback — handle OAuth callback
 * POST /api/quickbooks/sync — sync invoices/expenses
 * GET /api/quickbooks/status — check connection status
 */

const QB_CLIENT_ID = process.env.QB_CLIENT_ID || "";
const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET || "";
const QB_REDIRECT_URI = process.env.QB_REDIRECT_URI || "https://towhub.vercel.app/api/quickbooks/callback";
const QB_SCOPE = "com.intuit.quickbooks.accounting";
const QB_ENVIRONMENT = process.env.QB_ENVIRONMENT || "production";

const QB_AUTH_URL = QB_ENVIRONMENT === "sandbox"
  ? "https://appcenter.intuit.com/connect/oauth2"
  : "https://appcenter.intuit.com/connect/oauth2";

const QB_TOKEN_URL = QB_ENVIRONMENT === "sandbox"
  ? "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
  : "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export async function GET(req: NextRequest) {
  const { searchParams, pathname } = new URL(req.url);
  const action = searchParams.get("action") || "connect";

  // /api/quickbooks/connect — start OAuth
  if (pathname.endsWith("/connect") || action === "connect") {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const state = Buffer.from(JSON.stringify({ orgId: user.orgId, ts: Date.now() })).toString("base64");
    const authUrl = `${QB_AUTH_URL}?client_id=${QB_CLIENT_ID}&redirect_uri=${encodeURIComponent(QB_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(QB_SCOPE)}&state=${state}`;

    return NextResponse.redirect(authUrl);
  }

  // /api/quickbooks/callback — handle OAuth callback
  if (pathname.endsWith("/callback")) {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const realmId = searchParams.get("realmId");

    if (!code || !state) {
      return NextResponse.redirect("/dashboard/quickbooks?error=missing_params");
    }

    try {
      const { orgId } = JSON.parse(Buffer.from(state, "base64").toString());

      // Exchange code for tokens
      const tokenRes = await fetch(QB_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: QB_REDIRECT_URI,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.access_token) {
        // Save tokens to org settings
        const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
        const settings = (org?.settings as Record<string, unknown>) || {};

        await db.update(organizations).set({
          settings: {
            ...settings,
            quickbooks: {
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              realmId,
              expiresAt: Date.now() + (tokenData.expires_in * 1000),
              connectedAt: new Date().toISOString(),
            },
          },
          updatedAt: new Date(),
        }).where(eq(organizations.id, orgId));

        return NextResponse.redirect("/dashboard/quickbooks?success=connected");
      }

      return NextResponse.redirect("/dashboard/quickbooks?error=token_failed");
    } catch {
      return NextResponse.redirect("/dashboard/quickbooks?error=callback_failed");
    }
  }

  // /api/quickbooks/status — check connection
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId || "")).limit(1);
  const qb = (org?.settings as Record<string, unknown>)?.quickbooks as Record<string, unknown>;

  return NextResponse.json({
    connected: !!qb?.accessToken,
    realmId: qb?.realmId || null,
    connectedAt: qb?.connectedAt || null,
    expiresAt: qb?.expiresAt || null,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId || "")).limit(1);
  const qb = (org?.settings as Record<string, unknown>)?.quickbooks as Record<string, unknown>;

  if (!qb?.accessToken) {
    return NextResponse.json({ error: "QuickBooks not connected" }, { status: 400 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "sync_invoices") {
    // Fetch invoices from QuickBooks
    const res = await fetch(`https://quickbooks.api.intuit.com/v3/company/${qb.realmId}/query?query=SELECT * FROM Invoice MAXRESULTS 100`, {
      headers: {
        "Authorization": `Bearer ${qb.accessToken}`,
        "Accept": "application/json",
      },
    });
    const data = await res.json();
    return NextResponse.json({ success: true, invoices: data.QueryResponse?.Invoice || [] });
  }

  if (action === "sync_expenses") {
    const res = await fetch(`https://quickbooks.api.intuit.com/v3/company/${qb.realmId}/query?query=SELECT * FROM Purchase MAXRESULTS 100`, {
      headers: {
        "Authorization": `Bearer ${qb.accessToken}`,
        "Accept": "application/json",
      },
    });
    const data = await res.json();
    return NextResponse.json({ success: true, expenses: data.QueryResponse?.Purchase || [] });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}