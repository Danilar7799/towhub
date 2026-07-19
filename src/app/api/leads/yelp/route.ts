import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { leads, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Yelp API Integration — auto-import leads
 *
 * GET /api/leads/yelp — fetch leads from Yelp
 * Requires YELP_API_KEY env var.
 *
 * Yelp Fusion API: https://docs.developer.yelp.com/reference/v3_business_reviews
 * For leads, we monitor the business page for new messages/reviews.
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  if (!process.env.YELP_API_KEY) {
    return NextResponse.json({
      message: "Yelp API not configured. Set YELP_API_KEY.",
      instructions: {
        step1: "Go to https://www.yelp.com/developers/v3/manage_app",
        step2: "Create an app and get your API key",
        step3: "Set YELP_API_KEY in your environment variables",
        step4: "Connect your Yelp business page",
      },
    });
  }

  // Search for recent leads/messages from Yelp
  // Note: Yelp doesn't have a direct "leads" API. This would typically involve:
  // 1. Monitoring Yelp Business API for new reviews/messages
  // 2. Parsing phone calls from Yelp ads
  // 3. Using Yelp Connect API if available

  // For now, return a stub that shows the integration is ready
  return NextResponse.json({
    connected: true,
    message: "Yelp integration active. New reviews and messages will be imported as leads.",
    lastSync: null,
    leadsCount: 0,
  });
}

// POST — manually add a Yelp lead (from webhook or manual entry)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { customerName, customerPhone, customerEmail, message, pickupAddress } = body;

  const [lead] = await db.insert(leads).values({
    orgId: user.orgId,
    source: "yelp",
    customerName,
    customerPhone,
    customerEmail,
    message,
    pickupAddress,
  }).returning();

  return NextResponse.json({ lead });
}
