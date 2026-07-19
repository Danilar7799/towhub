import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs, expenses, leads, vehicles, users, customers, invoices, impoundVehicles } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = user.orgId;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  // Run queries in parallel
  const [allJobs, allExpenses, allLeads, allVehicles, allDrivers, allCustomers, allInvoices, storedVehicles] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.orgId, orgId)),
    db.select().from(expenses).where(and(eq(expenses.orgId, orgId), gte(expenses.date, thirtyDaysAgo))),
    db.select().from(leads).where(and(eq(leads.orgId, orgId), gte(leads.createdAt, thirtyDaysAgo))),
    db.select().from(vehicles).where(eq(vehicles.orgId, orgId)),
    db.select().from(users).where(and(eq(users.orgId, orgId), eq(users.role, "driver"))),
    db.select().from(customers).where(eq(customers.orgId, orgId)),
    db.select().from(invoices).where(eq(invoices.orgId, orgId)),
    db.select().from(impoundVehicles).where(and(eq(impoundVehicles.orgId, orgId), eq(impoundVehicles.status, "stored"))),
  ]);

  const completed = allJobs.filter(j => j.status === "completed");
  const thisWeek = completed.filter(j => new Date(j.completedAt || j.createdAt) >= sevenDaysAgo);
  const thisMonth = completed.filter(j => new Date(j.completedAt || j.createdAt) >= thirtyDaysAgo);

  const totalRevenue = completed.reduce((s, j) => s + (j.totalAmount || 0), 0);
  const monthRevenue = thisMonth.reduce((s, j) => s + (j.totalAmount || 0), 0);
  const weekRevenue = thisWeek.reduce((s, j) => s + (j.totalAmount || 0), 0);
  const totalExpenses = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  // Driver performance
  const driverStats = allDrivers.map(d => {
    const driverJobs = completed.filter(j => j.assignedDriverId === d.id);
    const driverRevenue = driverJobs.reduce((s, j) => s + (j.totalAmount || 0), 0);
    return { id: d.id, name: `${d.firstName} ${d.lastName}`, jobs: driverJobs.length, revenue: driverRevenue };
  }).sort((a, b) => b.revenue - a.revenue);

  // Lead conversion
  const convertedLeads = allLeads.filter(l => l.status === "accepted").length;
  const leadConversion = allLeads.length > 0 ? (convertedLeads / allLeads.length * 100) : 0;

  // Revenue by source
  const sourceRevenue: Record<string, number> = {};
  completed.forEach(j => { sourceRevenue[j.source] = (sourceRevenue[j.source] || 0) + (j.totalAmount || 0); });

  // Daily revenue for chart (last 7 days)
  const dailyRevenue = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86400000);
    const dayStr = day.toDateString();
    const dayJobs = completed.filter(j => new Date(j.completedAt || j.createdAt).toDateString() === dayStr);
    dailyRevenue.push({ date: day.toLocaleDateString("en-US", { weekday: "short" }), revenue: dayJobs.reduce((s, j) => s + (j.totalAmount || 0), 0), jobs: dayJobs.length });
  }

  // Unpaid invoices
  const unpaidInvoices = allInvoices.filter(i => ["sent", "overdue"].includes(i.status));
  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.total - (i.paidAmount || 0)), 0);

  return NextResponse.json({
    overview: {
      totalJobs: allJobs.length,
      completedJobs: completed.length,
      activeJobs: allJobs.filter(j => ["pending", "assigned", "en_route", "on_scene", "towing"].includes(j.status)).length,
      totalRevenue,
      monthRevenue,
      weekRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      totalVehicles: allVehicles.length,
      activeDrivers: allDrivers.length,
      totalCustomers: allCustomers.length,
      pendingLeads: allLeads.filter(l => l.status === "new").length,
      leadConversion: Math.round(leadConversion),
      storedVehicles: storedVehicles.length,
      unpaidInvoices: unpaidTotal,
    },
    driverPerformance: driverStats,
    sourceRevenue,
    dailyRevenue,
    recentJobs: allJobs.slice(0, 10),
  });
}
