import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month"; // week, month, all

  // Get all drivers in org
  const drivers = await db.select().from(users).where(and(eq(users.orgId, user.orgId), eq(users.role, "driver")));

  // Get all completed jobs
  const allJobs = await db.select().from(jobs).where(and(eq(jobs.orgId, user.orgId), eq(jobs.status, "completed"))).orderBy(desc(jobs.createdAt));

  // Filter by period
  const now = Date.now();
  const periodMs = period === "week" ? 7 * 86400000 : period === "month" ? 30 * 86400000 : Infinity;
  const filtered = allJobs.filter(j => (now - new Date(j.completedAt || j.createdAt).getTime()) < periodMs);

  // Calculate KPIs per driver
  const driverKPIs = drivers.map(d => {
    const driverJobs = filtered.filter(j => j.assignedDriverId === d.id);
    const revenue = driverJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
    const totalMiles = driverJobs.reduce((s, j) => s + (j.actualMiles || j.estimatedMiles || 0), 0);

    // Trip times
    const tripTimes = driverJobs.filter(j => j.completedAt && j.assignedAt).map(j => {
      return (new Date(j.completedAt!).getTime() - new Date(j.assignedAt!).getTime()) / 60000;
    });
    const avgTripTime = tripTimes.length > 0 ? tripTimes.reduce((s, t) => s + t, 0) / tripTimes.length : 0;

    return {
      id: d.id,
      name: `${d.firstName} ${d.lastName}`,
      email: d.email,
      totalTrips: driverJobs.length,
      totalRevenue: revenue,
      totalMiles: Math.round(totalMiles),
      avgTripMinutes: Math.round(avgTripTime),
      avgRevenuePerTrip: driverJobs.length > 0 ? Math.round(revenue / driverJobs.length) : 0,
      reviewsRequested: 0, // Will be populated from review tracking
      reviewsReceived: 0,
      qcScore: null, // Will be populated from QC callbacks
    };
  });

  // Sort by revenue (leaderboard)
  driverKPIs.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Add rankings
  driverKPIs.forEach((d, i) => { (d as typeof d & { rank: number }).rank = i + 1; });

  return NextResponse.json({
    period,
    drivers: driverKPIs,
    totals: {
      totalTrips: filtered.length,
      totalRevenue: filtered.reduce((s, j) => s + (j.totalAmount || 0), 0),
      totalMiles: Math.round(filtered.reduce((s, j) => s + (j.actualMiles || j.estimatedMiles || 0), 0)),
      activeDrivers: drivers.filter(d => driverKPIs.some(k => k.id === d.id && k.totalTrips > 0)).length,
    },
  });
}
