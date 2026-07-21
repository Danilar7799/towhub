import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { leads, jobs, organizations } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

/*
 * Motor Club Integration — AAA, Agero, Quest, etc.
 *
 * Motor clubs send job requests via:
 * 1. API webhook (preferred)
 * 2. Email parsing
 * 3. Manual entry
 *
 * POST /api/motor-clubs/lead — receive motor club job request
 * GET /api/motor-clubs — list motor club leads
 */

const MOTOR_CLUBS = {
  aaa: { name: "AAA", color: "#cc0000", icon: "🔴" },
  agero: { name: "Agero", color: "#003366", icon: "🔵" },
  quest: { name: "Quest Towing", color: "#006633", icon: "🟢" },
  urgent: { name: "Urgent.ly", color: "#ff6600", icon: "🟠" },
  honk: { name: "Honk", color: "#ffcc00", icon: "🟡" },
  other: { name: "Other Club", color: "#666666", icon: "⚫" },
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const club = searchParams.get("club");

  let conditions = [eq(leads.orgId, user.orgId)];
  if (club) conditions.push(eq(leads.source, `motor_club_${club}`));

  const motorClubLeads = await db.select().from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt));

  return NextResponse.json({
    leads: motorClubLeads,
    clubs: MOTOR_CLUBS,
    stats: {
      total: motorClubLeads.length,
      byClub: Object.fromEntries(
        Object.keys(MOTOR_CLUBS).map(c => [c, motorClubLeads.filter(l => l.source === `motor_club_${c}`).length])
      ),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { orgId, club, customerName, customerPhone, customerEmail, pickupAddress, destinationAddress, vehicleInfo, message, estimatedValue, priority, callbackUrl } = body;

  if (!orgId || !club) return NextResponse.json({ error: "orgId and club required" }, { status: 400 });

  const [lead] = await db.insert(leads).values({
    orgId,
    source: `motor_club_${club}`,
    externalId: body.externalId || null,
    customerName,
    customerPhone,
    customerEmail,
    message: [
      message,
      vehicleInfo ? `Vehicle: ${vehicleInfo}` : null,
      priority ? `Priority: ${priority}` : null,
      callbackUrl ? `Callback: ${callbackUrl}` : null,
    ].filter(Boolean).join("\n"),
    pickupAddress,
    destinationAddress,
    estimatedValue,
  }).returning();

  return NextResponse.json({ success: true, leadId: lead.id, message: `Motor club lead from ${club} received` });
}
