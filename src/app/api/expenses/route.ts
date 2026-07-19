import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET - List expenses
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allExpenses = await db.select().from(expenses)
    .where(eq(expenses.orgId, user.orgId))
    .orderBy(desc(expenses.date));

  return NextResponse.json({ expenses: allExpenses });
}

// POST - Add expense
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { vehicleId, driverId, jobId, category, amount, description, date } = body;

  if (!category || !amount) {
    return NextResponse.json({ error: "Category and amount required" }, { status: 400 });
  }

  const [expense] = await db.insert(expenses).values({
    orgId: user.orgId,
    vehicleId,
    driverId,
    jobId,
    category,
    amount: parseFloat(amount),
    description,
    date: date ? new Date(date) : new Date(),
  }).returning();

  return NextResponse.json({ expense });
}
