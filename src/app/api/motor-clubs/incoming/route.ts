import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Motor Club API Integration
 * POST /api/motor-clubs/incoming — receive jobs from AAA, Agero, Honk, etc.
 * GET /api/motor-clubs — list configured motor clubs
 *
 * Motor clubs send job requests via webhook → auto-create jobs in TowHub
 */

interface MotorClubJob {
  club: string; // "aaa", "agero", "honk", "allstate", "geico"
  reference_number: string;
  member_name: string;
  member_phone: string;
  member_id?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_plate?: string;
  pickup_address: string;
  destination_address?: string;
  service_type: string; // "tow", "lockout", "jumpstart", "tire_change", "fuel"
  priority?: string; // "standard", "priority", "emergency"
  notes?: string;
  estimated_pay?: number;
}

const CLUB_CONFIG: Record<string, { name: string; color: string; prefix: string }> = {
  aaa: { name: "AAA", color: "#dc2626", prefix: "AAA" },
  agero: { name: "Agero", color: "#2563eb", prefix: "AGR" },
  honk: { name: "Honk", color: "#f59e0b", prefix: "HNK" },
  allstate: { name: "Allstate", color: "#1e40af", prefix: "AST" },
  geico: { name: "GEICO", color: "#15be53", prefix: "GEC" },
  statefarm: { name: "State Farm", color: "#dc2626", prefix: "SFM" },
  usaa: { name: "USAA", color: "#1e3a5f", prefix: "USA" },
  progressive: { name: "Progressive", color: "#3b82f6", prefix: "PRG" },
};

export async function POST(req: NextRequest) {
  try {
    const body: MotorClubJob = await req.json();
    const { club, reference_number, member_name, member_phone, pickup_address, destination_address, service_type, vehicle_year, vehicle_make, vehicle_model, vehicle_color, vehicle_plate, priority, notes, estimated_pay } = body;

    if (!club || !pickup_address || !member_name) {
      return NextResponse.json({ error: "club, pickup_address, member_name required" }, { status: 400 });
    }

    // Find org (first org or by API key)
    const orgs = await db.select().from(organizations).limit(1);
    if (orgs.length === 0) return NextResponse.json({ error: "No organization" }, { status: 404 });
    const org = orgs[0];

    const clubConfig = CLUB_CONFIG[club] || { name: club, color: "#64748d", prefix: club.slice(0, 3).toUpperCase() };

    // Create job
    const [job] = await db.insert(jobs).values({
      orgId: org.id,
      status: "pending",
      source: "motor_club",
      customerName: member_name,
      customerPhone: member_phone,
      pickupAddress: pickup_address,
      destinationAddress: destination_address,
      towVehicleMake: vehicle_make,
      towVehicleModel: vehicle_model,
      towVehicleYear: vehicle_year ? parseInt(vehicle_year) : undefined,
      towVehicleColor: vehicle_color,
      towVehiclePlate: vehicle_plate,
      totalAmount: estimated_pay,
      notes: `[${clubConfig.name}] Ref: ${reference_number}\nService: ${service_type}\nPriority: ${priority || "standard"}\n${notes || ""}`,
    }).returning();

    return NextResponse.json({
      success: true,
      jobId: job.id,
      club: clubConfig.name,
      reference: reference_number,
      message: `Job created from ${clubConfig.name} — ${member_name}`,
    });
  } catch (err: any) {
    console.error("[Motor Club] Error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    clubs: Object.entries(CLUB_CONFIG).map(([id, cfg]) => ({
      id,
      name: cfg.name,
      color: cfg.color,
      prefix: cfg.prefix,
    })),
    webhook_url: "/api/motor-clubs/incoming",
    supported_services: ["tow", "lockout", "jumpstart", "tire_change", "fuel", "winch"],
  });
}