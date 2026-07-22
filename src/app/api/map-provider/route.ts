import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Map Provider Settings — super admin can switch between OSRM and Google Maps
 *
 * GET /api/map-provider — get current settings
 * POST /api/map-provider — update settings (super admin only)
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const mapProvider = (settings.mapProvider as Record<string, unknown>) || {};

  return NextResponse.json({
    provider: mapProvider.provider || "osrm",
    providers: {
      osrm: {
        name: "OSRM (OpenStreetMap)",
        description: "Free, no API key needed. Uses OpenStreetMap data.",
        requiresKey: false,
        status: "active",
      },
      google: {
        name: "Google Maps",
        description: "Most accurate routes, real-time traffic. Requires API key.",
        requiresKey: true,
        hasKey: !!process.env.GOOGLE_MAPS_API_KEY,
        status: process.env.GOOGLE_MAPS_API_KEY ? "active" : "needs_key",
      },
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { provider, orgId } = await req.json();

  if (!["osrm", "google"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider. Use 'osrm' or 'google'" }, { status: 400 });
  }

  // If orgId provided, update specific org. Otherwise update all.
  if (orgId) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const settings = (org.settings as Record<string, unknown>) || {};
    await db.update(organizations).set({
      settings: { ...settings, mapProvider: { provider } },
      updatedAt: new Date(),
    }).where(eq(organizations.id, orgId));
  } else {
    // Update global setting (stored in first org or env)
    const allOrgs = await db.select().from(organizations);
    for (const org of allOrgs) {
      const settings = (org.settings as Record<string, unknown>) || {};
      await db.update(organizations).set({
        settings: { ...settings, mapProvider: { provider } },
        updatedAt: new Date(),
      }).where(eq(organizations.id, org.id));
    }
  }

  return NextResponse.json({ success: true, provider, message: `Map provider set to ${provider}` });
}
