import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { customers, jobs, vehicles, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";

/*
 * CSV Import API
 * POST /api/import
 * FormData: file (CSV), type: "customers" | "jobs" | "fleet" | "drivers"
 * Returns: { imported: number, skipped: number, errors: string[] }
 */

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    if (values.length !== headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = values[j]; });
    rows.push(row);
  }
  return rows;
}

// Field aliases — map common CSV headers to our schema
const CUSTOMER_MAP: Record<string, string> = {
  name: "name", "customer name": "name", "full name": "name",
  email: "email", "e-mail": "email", "email address": "email",
  phone: "phone", "phone number": "phone", mobile: "phone", cell: "phone",
  company: "company", "company name": "company", business: "company",
  address: "address", street: "address", "street address": "address",
  city: "city", state: "state", zip: "zip", "zip code": "zip", zipcode: "zip", "postal code": "zip",
  notes: "notes", comment: "notes", comments: "notes",
};

const JOB_MAP: Record<string, string> = {
  "customer name": "customerName", customer: "customerName", name: "customerName",
  "customer phone": "customerPhone", phone: "customerPhone",
  "customer email": "customerEmail", email: "customerEmail",
  pickup: "pickupAddress", "pickup address": "pickupAddress", "from": "pickupAddress", origin: "pickupAddress",
  destination: "destinationAddress", "destination address": "destinationAddress", "to": "destinationAddress", dropoff: "destinationAddress",
  make: "towVehicleMake", "vehicle make": "towVehicleMake",
  model: "towVehicleModel", "vehicle model": "towVehicleModel",
  year: "towVehicleYear", "vehicle year": "towVehicleYear",
  color: "towVehicleColor", "vehicle color": "towVehicleColor",
  plate: "towVehiclePlate", "license plate": "towVehiclePlate", "plate number": "towVehiclePlate",
  miles: "estimatedMiles", "estimated miles": "estimatedMiles", distance: "estimatedMiles",
  "base rate": "baseRate", base: "baseRate", "base price": "baseRate",
  "mileage rate": "mileageRate", "per mile": "mileageRate",
  total: "totalAmount", amount: "totalAmount", "total amount": "totalAmount", price: "totalAmount",
  notes: "notes", description: "notes", comments: "notes",
  status: "status",
  date: "createdAt", "created date": "createdAt", "job date": "createdAt",
};

const FLEET_MAP: Record<string, string> = {
  name: "name", "truck name": "name", "vehicle name": "name", unit: "name",
  type: "type", "vehicle type": "type",
  make: "make", manufacturer: "make",
  model: "model",
  year: "year",
  plate: "licensePlate", "license plate": "licensePlate", "plate number": "licensePlate",
  color: "color",
  vin: "vin", "vin number": "vin",
  capacity: "capacityLbs", "capacity lbs": "capacityLbs", "towing capacity": "capacityLbs",
  mileage: "mileage", odometer: "mileage",
};

const DRIVER_MAP: Record<string, string> = {
  "first name": "firstName", firstname: "firstName", "first": "firstName",
  "last name": "lastName", lastname: "lastName", "last": "lastName", surname: "lastName",
  name: "fullName", "full name": "fullName",
  email: "email", "email address": "email",
  phone: "phone", "phone number": "phone", mobile: "phone",
  role: "role",
  password: "password",
};

function mapRow(row: Record<string, string>, fieldMap: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const mappedKey = fieldMap[key.toLowerCase()];
    if (mappedKey && value) mapped[mappedKey] = value;
  }
  return mapped;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string;

  if (!file || !type) return NextResponse.json({ error: "file and type required" }, { status: 400 });
  if (!["customers", "jobs", "fleet", "drivers"].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Use: customers, jobs, fleet, drivers" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    if (type === "customers") {
      for (const row of rows) {
        const m = mapRow(row, CUSTOMER_MAP);
        if (!m.name) { skipped++; errors.push(`Skipped row: missing name`); continue; }
        try {
          await db.insert(customers).values({ orgId: user.orgId, name: m.name, email: m.email || null, phone: m.phone || null, company: m.company || null, address: m.address || null, city: m.city || null, state: m.state || null, zip: m.zip || null, notes: m.notes || null });
          imported++;
        } catch (e) { skipped++; errors.push(`Error importing "${m.name}": ${e}`); }
      }
    } else if (type === "jobs") {
      for (const row of rows) {
        const m = mapRow(row, JOB_MAP);
        if (!m.pickupAddress) { skipped++; errors.push(`Skipped row: missing pickup address`); continue; }
        try {
          const totalAmount = m.totalAmount ? parseFloat(m.totalAmount) : (parseFloat(m.baseRate || "0") + parseFloat(m.estimatedMiles || "0") * parseFloat(m.mileageRate || "0"));
          await db.insert(jobs).values({
            orgId: user.orgId,
            customerName: m.customerName || null,
            customerPhone: m.customerPhone || null,
            customerEmail: m.customerEmail || null,
            pickupAddress: m.pickupAddress,
            destinationAddress: m.destinationAddress || null,
            towVehicleMake: m.towVehicleMake || null,
            towVehicleModel: m.towVehicleModel || null,
            towVehicleYear: m.towVehicleYear ? parseInt(m.towVehicleYear) : null,
            towVehicleColor: m.towVehicleColor || null,
            towVehiclePlate: m.towVehiclePlate || null,
            estimatedMiles: m.estimatedMiles ? parseFloat(m.estimatedMiles) : null,
            baseRate: m.baseRate ? parseFloat(m.baseRate) : null,
            mileageRate: m.mileageRate ? parseFloat(m.mileageRate) : null,
            totalAmount: totalAmount || null,
            notes: m.notes || null,
            status: (m.status as "pending" | "assigned" | "en_route" | "on_scene" | "towing" | "completed" | "cancelled") || "completed",
            source: "manual",
          });
          imported++;
        } catch (e) { skipped++; errors.push(`Error importing job: ${e}`); }
      }
    } else if (type === "fleet") {
      for (const row of rows) {
        const m = mapRow(row, FLEET_MAP);
        if (!m.name) { skipped++; errors.push(`Skipped row: missing name`); continue; }
        try {
          await db.insert(vehicles).values({
            orgId: user.orgId,
            name: m.name,
            type: (m.type as "flatbed" | "wheel_lift" | "heavy_duty" | "medium_duty" | "motorcycle" | "other") || "flatbed",
            make: m.make || null,
            model: m.model || null,
            year: m.year ? parseInt(m.year) : null,
            licensePlate: m.licensePlate || null,
            color: m.color || null,
            vin: m.vin || null,
            capacityLbs: m.capacityLbs ? parseInt(m.capacityLbs) : null,
            mileage: m.mileage ? parseInt(m.mileage) : 0,
          });
          imported++;
        } catch (e) { skipped++; errors.push(`Error importing "${m.name}": ${e}`); }
      }
    } else if (type === "drivers") {
      for (const row of rows) {
        const m = mapRow(row, DRIVER_MAP);
        // Support "full name" or "first + last"
        let firstName = m.firstName || "";
        let lastName = m.lastName || "";
        if (m.fullName && !firstName) {
          const parts = m.fullName.split(" ");
          firstName = parts[0] || "";
          lastName = parts.slice(1).join(" ") || "";
        }
        if (!firstName || !m.email) { skipped++; errors.push(`Skipped row: missing name or email`); continue; }
        try {
          const password = m.password || Math.random().toString(36).slice(-10);
          const passwordHash = await hashPassword(password);
          await db.insert(users).values({
            orgId: user.orgId,
            email: m.email,
            passwordHash,
            firstName,
            lastName,
            phone: m.phone || null,
            role: (m.role as "driver" | "dispatcher" | "admin") || "driver",
          });
          imported++;
        } catch (e) { skipped++; errors.push(`Error importing "${firstName}": ${e}`); }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: rows.length,
      errors: errors.slice(0, 20), // limit error messages
      message: `✅ Imported ${imported} ${type}. ${skipped > 0 ? `⚠️ ${skipped} skipped.` : ""}`,
    });
  } catch (e) {
    return NextResponse.json({ error: `Import failed: ${e}` }, { status: 500 });
  }
}
