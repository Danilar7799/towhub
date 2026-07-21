import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Multi-location Management
 *
 * Each org can have multiple yards/locations:
 * - Main office
 * - Impound lots (multiple)
 * - Satellite offices
 *
 * GET /api/locations — list locations
 * POST /api/locations — add location
 * PUT /api/locations — update location
 */

interface Location {
  id: string;
  name: string;
  type: string; // office, impound_lot, satellite
  address: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
  phone?: string;
  capacity?: number;
  isActive: boolean;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const locations = ((settings.locations as Location[]) || []);

  return NextResponse.json({ locations });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, type, address, city, state, zip, lat, lng, phone, capacity } = body;
  if (!name || !address) return NextResponse.json({ error: "Name and address required" }, { status: 400 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const locations = ((settings.locations as Location[]) || []);

  const newLocation: Location = {
    id: `loc_${Date.now()}`,
    name, type: type || "office", address, city, state, zip, lat, lng, phone, capacity, isActive: true,
  };

  locations.push(newLocation);

  await db.update(organizations).set({
    settings: { ...settings, locations },
    updatedAt: new Date(),
  }).where(eq(organizations.id, user.orgId));

  return NextResponse.json({ location: newLocation });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, ...updates } = await req.json();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const locations = ((settings.locations as Location[]) || []);

  const idx = locations.findIndex(l => l.id === id);
  if (idx === -1) return NextResponse.json({ error: "Location not found" }, { status: 404 });

  locations[idx] = { ...locations[idx], ...updates };

  await db.update(organizations).set({
    settings: { ...settings, locations },
    updatedAt: new Date(),
  }).where(eq(organizations.id, user.orgId));

  return NextResponse.json({ location: locations[idx] });
}
