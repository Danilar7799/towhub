import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { eq, and, desc, ilike, or, sql } from "drizzle-orm";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  let query = db.select().from(customers).where(eq(customers.orgId, user.orgId)).orderBy(desc(customers.createdAt));

  if (q) {
    query = db.select().from(customers).where(
      and(eq(customers.orgId, user.orgId), or(ilike(customers.name, `%${q}%`), ilike(customers.phone, `%${q}%`), ilike(customers.email, `%${q}%`)))
    ).orderBy(desc(customers.createdAt));
  }

  const pagination = parsePagination(searchParams);

  let data;
  let paginationMeta = null;

  if (pagination.page > 0) {
    const baseWhere = q
      ? and(eq(customers.orgId, user.orgId), or(ilike(customers.name, `%${q}%`), ilike(customers.phone, `%${q}%`), ilike(customers.email, `%${q}%`)))
      : eq(customers.orgId, user.orgId);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(customers).where(baseWhere);
    const total = Number(countResult[0]?.count ?? 0);
    data = await query.limit(pagination.limit).offset(pagination.offset);
    paginationMeta = buildPaginationMeta(pagination, total);
  } else {
    data = await query;
  }

  return NextResponse.json({ customers: data, ...(paginationMeta && { pagination: paginationMeta }) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, address, city, state, zip, company, notes } = body;
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const [customer] = await db.insert(customers).values({ orgId: user.orgId, name, email, phone, address, city, state, zip, company, notes }).returning();
  return NextResponse.json({ customer });
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const [updated] = await db.update(customers).set({ ...updates, updatedAt: new Date() }).where(and(eq(customers.id, id), eq(customers.orgId, user.orgId))).returning();
  return NextResponse.json({ customer: updated });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.delete(customers).where(and(eq(customers.id, id), eq(customers.orgId, user.orgId)));
  return NextResponse.json({ success: true });
}
