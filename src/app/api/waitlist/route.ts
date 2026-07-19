import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { waitlist } from "@/db/schema";

// POST - Submit waitlist application
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyName, contactName, email, phone, city, state, fleetSize, yearsInBusiness, servicesOffered, monthlyTowVolume, website, googleBusinessUrl, message } = body;

    if (!companyName || !contactName || !email || !phone || !city || !state) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [entry] = await db.insert(waitlist).values({
      companyName,
      contactName,
      email,
      phone,
      city,
      state,
      fleetSize: fleetSize ? parseInt(fleetSize) : null,
      yearsInBusiness: yearsInBusiness ? parseInt(yearsInBusiness) : null,
      servicesOffered: servicesOffered || [],
      monthlyTowVolume: monthlyTowVolume ? parseInt(monthlyTowVolume) : null,
      website,
      googleBusinessUrl,
      message,
    }).returning();

    return NextResponse.json({ success: true, id: entry.id, message: "Application submitted! We'll review and get back to you." });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - List all waitlist entries (admin only)
export async function GET() {
  try {
    const entries = await db.select().from(waitlist).orderBy(waitlist.createdAt);
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("Waitlist GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
