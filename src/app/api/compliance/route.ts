import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations, vehicles, users } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";

/*
 * Insurance & Document Tracker
 *
 * GET /api/compliance?orgId=xxx — get all expiring documents
 * POST /api/compliance — update document info
 *
 * Tracks: vehicle insurance, driver licenses, org insurance, DOT/MC numbers
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const orgVehicles = await db.select().from(vehicles).where(eq(vehicles.orgId, user.orgId));
  const orgDrivers = await db.select().from(users).where(and(eq(users.orgId, user.orgId), eq(users.role, "driver")));

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 86400000);
  const sixtyDays = new Date(now.getTime() + 60 * 86400000);

  // Check org insurance
  const orgSettings = (org?.settings as Record<string, unknown>) || {};
  const insuranceExpiry = orgSettings.insuranceExpiry ? new Date(orgSettings.insuranceExpiry as string) : null;

  const alerts = [];

  if (insuranceExpiry) {
    if (insuranceExpiry < now) alerts.push({ type: "critical", entity: "Organization Insurance", message: "EXPIRED", expiry: insuranceExpiry });
    else if (insuranceExpiry < thirtyDays) alerts.push({ type: "warning", entity: "Organization Insurance", message: `Expires in ${Math.ceil((insuranceExpiry.getTime() - now.getTime()) / 86400000)} days`, expiry: insuranceExpiry });
  }

  // Check vehicle insurance (stored in vehicle settings)
  for (const v of orgVehicles) {
    const vSettings = (v as typeof v & { settings?: Record<string, unknown> }).settings || {};
    const vInsurance = vSettings.insuranceExpiry ? new Date(vSettings.insuranceExpiry as string) : null;
    if (vInsurance && vInsurance < thirtyDays) {
      alerts.push({
        type: vInsurance < now ? "critical" : "warning",
        entity: `Vehicle: ${v.name} (${v.licensePlate || "no plate"})`,
        message: vInsurance < now ? "Insurance EXPIRED" : `Expires in ${Math.ceil((vInsurance.getTime() - now.getTime()) / 86400000)} days`,
        expiry: vInsurance,
      });
    }
  }

  return NextResponse.json({
    alerts,
    summary: {
      totalAlerts: alerts.length,
      critical: alerts.filter(a => a.type === "critical").length,
      warnings: alerts.filter(a => a.type === "warning").length,
    },
  });
}
