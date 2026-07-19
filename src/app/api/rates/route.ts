import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { rateSheets } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sheets = await db.select().from(rateSheets).where(eq(rateSheets.orgId, user.orgId));
  return NextResponse.json({ rateSheets: sheets });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, rates, afterHoursMultiplier, weekendMultiplier, holidayMultiplier } = body;
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const [sheet] = await db.insert(rateSheets).values({
    orgId: user.orgId, name, rates: rates || [
      { service: "light_duty", label: "Light Duty Tow", base: 75, perMile: 3.50, minCharge: 50 },
      { service: "medium_duty", label: "Medium Duty Tow", base: 125, perMile: 5.00, minCharge: 85 },
      { service: "heavy_duty", label: "Heavy Duty Tow", base: 250, perMile: 8.00, minCharge: 175 },
      { service: "flatbed", label: "Flatbed Tow", base: 95, perMile: 4.00, minCharge: 65 },
      { service: "motorcycle", label: "Motorcycle Tow", base: 50, perMile: 2.50, minCharge: 35 },
      { service: "lockout", label: "Lockout Service", base: 45, perMile: 0, minCharge: 45 },
      { service: "jumpstart", label: "Jump Start", base: 40, perMile: 0, minCharge: 40 },
      { service: "tire_change", label: "Tire Change", base: 35, perMile: 0, minCharge: 35 },
      { service: "fuel_delivery", label: "Fuel Delivery", base: 50, perMile: 2.00, minCharge: 50 },
      { service: "winch_out", label: "Winch Out", base: 100, perMile: 0, minCharge: 75 },
    ],
    afterHoursMultiplier, weekendMultiplier, holidayMultiplier,
  }).returning();

  return NextResponse.json({ rateSheet: sheet });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, ...updates } = await req.json();
  const [updated] = await db.update(rateSheets).set({ ...updates, updatedAt: new Date() }).where(and(eq(rateSheets.id, id), eq(rateSheets.orgId, user.orgId))).returning();
  return NextResponse.json({ rateSheet: updated });
}
