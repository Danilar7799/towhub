import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { autoCreateInvoice } from "@/lib/auto-invoice";
import { autoCreateCustomer } from "@/lib/auto-customer";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";

// GET - List jobs for org
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const driverId = searchParams.get("driverId");

  let query = db.select().from(jobs).where(eq(jobs.orgId, user.orgId)).orderBy(desc(jobs.createdAt));

  if (status) {
    query = db.select().from(jobs).where(and(eq(jobs.orgId, user.orgId), eq(jobs.status, status as "pending" | "assigned" | "en_route" | "on_scene" | "towing" | "completed" | "cancelled"))).orderBy(desc(jobs.createdAt));
  }

  const pagination = parsePagination(searchParams);

  let data;
  let paginationMeta = null;

  if (pagination.page > 0) {
    // Paginated mode
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(eq(jobs.orgId, user.orgId));
    const total = Number(countResult[0]?.count ?? 0);
    data = await query.limit(pagination.limit).offset(pagination.offset);
    paginationMeta = buildPaginationMeta(pagination, total);
  } else {
    // Backward-compatible: return all
    data = await query;
  }

  return NextResponse.json({ jobs: data, ...(paginationMeta && { pagination: paginationMeta }) });
}

// POST - Create job
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    customerName, customerPhone, customerEmail,
    pickupAddress, pickupLat, pickupLng,
    destinationAddress, destinationLat, destinationLng,
    towVehicleMake, towVehicleModel, towVehicleYear, towVehicleColor, towVehiclePlate,
    estimatedMiles, baseRate, mileageRate, notes, source,
  } = body;

  if (!pickupAddress) {
    return NextResponse.json({ error: "Pickup address required" }, { status: 400 });
  }

  const totalAmount = (baseRate || 0) + (estimatedMiles || 0) * (mileageRate || 0);

  const [job] = await db.insert(jobs).values({
    orgId: user.orgId,
    customerName,
    customerPhone,
    customerEmail,
    pickupAddress,
    pickupLat,
    pickupLng,
    destinationAddress,
    destinationLat,
    destinationLng,
    towVehicleMake,
    towVehicleModel,
    towVehicleYear: towVehicleYear ? parseInt(towVehicleYear) : null,
    towVehicleColor,
    towVehiclePlate,
    estimatedMiles,
    baseRate,
    mileageRate,
    totalAmount,
    notes,
    source: source || "manual",
  }).returning();

  // Auto-create/update customer record
  await autoCreateCustomer(user.orgId, {
    customerName: customerName,
    customerPhone: customerPhone,
    customerEmail: customerEmail,
    totalAmount: totalAmount,
  });

  return NextResponse.json({ job });
}

// PUT - Update job (assign driver, change status, etc.)
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status, notes, dispatcherNotes, assignedDriverId, assignedVehicleId,
    customerName, customerPhone, customerEmail, isPaid, paymentMethod,
    baseRate, mileageRate, totalAmount, actualMiles } = body;

  if (!id) return NextResponse.json({ error: "Job ID required" }, { status: 400 });

  // Whitelist: only allow safe fields (no orgId, no createdAt manipulation)
  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (dispatcherNotes !== undefined) updates.dispatcherNotes = dispatcherNotes;
  if (assignedDriverId !== undefined) updates.assignedDriverId = assignedDriverId;
  if (assignedVehicleId !== undefined) updates.assignedVehicleId = assignedVehicleId;
  if (customerName !== undefined) updates.customerName = customerName;
  if (customerPhone !== undefined) updates.customerPhone = customerPhone;
  if (customerEmail !== undefined) updates.customerEmail = customerEmail;
  if (isPaid !== undefined) updates.isPaid = isPaid;
  if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
  if (baseRate !== undefined) updates.baseRate = baseRate;
  if (mileageRate !== undefined) updates.mileageRate = mileageRate;
  if (totalAmount !== undefined) updates.totalAmount = totalAmount;
  if (actualMiles !== undefined) updates.actualMiles = actualMiles;

  // Auto-set timestamps based on status
  const now = new Date();
  if (updates.status === "assigned") updates.assignedAt = now;
  if (updates.status === "en_route") updates.enRouteAt = now;
  if (updates.status === "on_scene") updates.onSceneAt = now;
  if (updates.status === "towing") updates.towingAt = now;
  if (updates.status === "completed") updates.completedAt = now;
  if (updates.status === "cancelled") updates.cancelledAt = now;

  const [updated] = await db.update(jobs)
    .set({ ...updates, updatedAt: now })
    .where(and(eq(jobs.id, id), eq(jobs.orgId, user.orgId)))
    .returning();

  // Auto-create invoice when job is completed
  if (updates.status === "completed" && updated) {
    try {
      await autoCreateInvoice(user.orgId, updated.id);
    } catch (err) {
      console.error("Failed to auto-create invoice:", err);
      // Don't fail the job update if invoice creation fails
    }
  }

  return NextResponse.json({ job: updated });
}
