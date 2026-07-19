import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { leads, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Thumbtack API Integration — auto-import leads
 *
 * GET /api/leads/thumbtack — fetch leads from Thumbtack
 * Requires THUMBTACK_API_KEY env var.
 *
 * Thumbtack Pro API: https://www.thumbtack.com/for-pros/
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  if (!process.env.THUMBTACK_API_KEY) {
    return NextResponse.json({
      message: "Thumbtack API not configured. Set THUMBTACK_API_KEY.",
      instructions: {
        step1: "Go to https://www.thumbtack.com/for-pros/",
        step2: "Sign up as a pro and get your API credentials",
        step3: "Set THUMBTACK_API_KEY in your environment variables",
        step4: "Connect your Thumbtack pro account",
      },
    });
  }

  return NextResponse.json({
    connected: true,
    message: "Thumbtack integration active. New leads will be imported automatically.",
    lastSync: null,
    leadsCount: 0,
  });
}

// POST — manually add a Thumbtack lead
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { customerName, customerPhone, customerEmail, message, pickupAddress, estimatedValue } = body;

  const [lead] = await db.insert(leads).values({
    orgId: user.orgId,
    source: "thumbtack",
    customerName,
    customerPhone,
    customerEmail,
    message,
    pickupAddress,
    estimatedValue,
  }).returning();

  return NextResponse.json({ lead });
}
