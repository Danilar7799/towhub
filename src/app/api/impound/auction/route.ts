import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { auctionListings, impoundVehicles } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const eligible = searchParams.get("eligible"); // days threshold

  if (eligible) {
    // Find vehicles stored longer than threshold
    const threshold = new Date(Date.now() - parseInt(eligible) * 86400000);
    const stored = await db.select().from(impoundVehicles).where(and(eq(impoundVehicles.orgId, user.orgId), eq(impoundVehicles.status, "stored"), lte(impoundVehicles.storedAt, threshold)));
    return NextResponse.json({ eligibleVehicles: stored, count: stored.length });
  }

  const listings = await db.select().from(auctionListings).where(eq(auctionListings.orgId, user.orgId));
  return NextResponse.json({ listings });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, auctionDate, location, vehicleIds, notes } = body;

  const [listing] = await db.insert(auctionListings).values({
    orgId: user.orgId, title, description, auctionDate: auctionDate ? new Date(auctionDate) : undefined, location, vehicleIds: vehicleIds || [], notes,
  }).returning();

  return NextResponse.json({ listing });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await req.json();
  const [updated] = await db.update(auctionListings).set({ ...updates, updatedAt: new Date() }).where(and(eq(auctionListings.id, id), eq(auctionListings.orgId, user.orgId))).returning();
  return NextResponse.json({ listing: updated });
}
