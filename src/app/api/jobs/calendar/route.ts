import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  const driverId = searchParams.get("driverId");
  const status = searchParams.get("status");

  let conditions = [eq(jobs.orgId, user.orgId)];

  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    conditions.push(gte(jobs.createdAt, start), lte(jobs.createdAt, end));
  }

  if (driverId) conditions.push(eq(jobs.assignedDriverId, driverId));
  if (status) conditions.push(eq(jobs.status, status as "pending" | "assigned" | "en_route" | "on_scene" | "towing" | "completed" | "cancelled"));

  const allJobs = await db.select().from(jobs).where(and(...conditions)).orderBy(desc(jobs.createdAt));

  // Group by date for calendar view
  const byDate: Record<string, typeof allJobs> = {};
  allJobs.forEach(j => {
    const date = new Date(j.createdAt).toISOString().split("T")[0];
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(j);
  });

  // Stats
  const completed = allJobs.filter(j => j.status === "completed");
  const totalRevenue = completed.reduce((s, j) => s + (j.totalAmount || 0), 0);
  const avgTripTime = completed.filter(j => j.completedAt && j.assignedAt).reduce((s, j) => {
    const duration = new Date(j.completedAt!).getTime() - new Date(j.assignedAt!).getTime();
    return s + duration;
  }, 0) / Math.max(completed.length, 1);

  return NextResponse.json({
    jobs: allJobs,
    calendar: byDate,
    stats: {
      total: allJobs.length,
      completed: completed.length,
      cancelled: allJobs.filter(j => j.status === "cancelled").length,
      totalRevenue,
      avgTripMinutes: Math.round(avgTripTime / 60000),
    },
  });
}
