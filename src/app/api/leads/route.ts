import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { leads, jobs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET - List leads for org
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const status = searchParams.get("status");

  const allLeads = await db.select().from(leads)
    .where(eq(leads.orgId, user.orgId))
    .orderBy(desc(leads.createdAt));

  return NextResponse.json({ leads: allLeads });
}

// POST - Create lead (from Yelp/Thumbtack webhooks or manual)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, source, externalId, customerName, customerPhone, customerEmail, message, pickupAddress, destinationAddress, estimatedValue } = body;

    if (!orgId || !source) {
      return NextResponse.json({ error: "orgId and source required" }, { status: 400 });
    }

    const [lead] = await db.insert(leads).values({
      orgId,
      source,
      externalId,
      customerName,
      customerPhone,
      customerEmail,
      message,
      pickupAddress,
      destinationAddress,
      estimatedValue,
    }).returning();

    return NextResponse.json({ lead });
  } catch (err) {
    console.error("Lead create error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update lead status / convert to job
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status, notes, convertToJob } = body;

  if (!id) return NextResponse.json({ error: "Lead ID required" }, { status: 400 });

  if (convertToJob) {
    // Get lead data
    const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.orgId, user.orgId))).limit(1);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    // Create job from lead
    const [job] = await db.insert(jobs).values({
      orgId: user.orgId,
      customerName: lead.customerName,
      customerPhone: lead.customerPhone,
      customerEmail: lead.customerEmail,
      pickupAddress: lead.pickupAddress || "TBD",
      destinationAddress: lead.destinationAddress,
      source: lead.source as "manual" | "phone" | "yelp" | "thumbtack" | "google" | "ai_dispatcher" | "app",
      notes: lead.message,
    }).returning();

    // Update lead
    await db.update(leads)
      .set({ status: "accepted", convertedJobId: job.id, updatedAt: new Date() })
      .where(eq(leads.id, id));

    return NextResponse.json({ job, lead: { ...lead, status: "accepted", convertedJobId: job.id } });
  }

  const [updated] = await db.update(leads)
    .set({ status: status as "new" | "contacted" | "quoted" | "accepted" | "declined" | "expired", notes, respondedAt: status !== "new" ? new Date() : undefined, updatedAt: new Date() })
    .where(and(eq(leads.id, id), eq(leads.orgId, user.orgId)))
    .returning();

  return NextResponse.json({ lead: updated });
}
