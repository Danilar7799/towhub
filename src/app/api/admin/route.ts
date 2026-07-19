import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations, waitlist, users } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - Admin dashboard stats
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allOrgs = await db.select().from(organizations);
  const allWaitlist = await db.select().from(waitlist);
  const allUsers = await db.select().from(users);

  return NextResponse.json({
    stats: {
      totalOrgs: allOrgs.length,
      approvedOrgs: allOrgs.filter(o => o.status === "approved").length,
      pendingOrgs: allOrgs.filter(o => o.status === "pending").length,
      totalUsers: allUsers.length,
      waitlistEntries: allWaitlist.filter(w => !w.isApproved).length,
    },
    organizations: allOrgs,
    waitlist: allWaitlist,
  });
}
