import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users, organizations, notifications } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

/*
 * Broadcast Notifications API — Super Admin only
 *
 * POST /api/admin/broadcast — send targeted notification
 *
 * Targeting options:
 * - all: every user
 * - role: filter by role (owner, admin, dispatcher, driver)
 * - city: filter by org city
 * - state: filter by org state
 * - plan: filter by org plan (starter, professional, enterprise)
 * - company: specific org IDs
 * - specific: specific user IDs
 */

interface BroadcastRequest {
  title: string;
  message: string;
  type: "system" | "promo" | "update" | "warning";
  link?: string;
  targeting: {
    mode: "all" | "role" | "city" | "state" | "plan" | "company" | "specific";
    roles?: string[];
    cities?: string[];
    states?: string[];
    plans?: string[];
    companyIds?: string[];
    userIds?: string[];
  };
  priority: "low" | "medium" | "high" | "urgent";
  sendEmail?: boolean; // also send via email
  scheduledAt?: string; // schedule for later
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Get targeting stats
  if (action === "stats") {
    const allUsers = await db.select({
      role: users.role,
      count: sql<number>`count(*)`,
    }).from(users).groupBy(users.role);

    const orgsByState = await db.select({
      state: organizations.state,
      count: sql<number>`count(*)`,
    }).from(organizations).where(eq(organizations.status, "approved")).groupBy(organizations.state);

    const orgsByCity = await db.select({
      city: organizations.city,
      state: organizations.state,
      count: sql<number>`count(*)`,
    }).from(organizations).where(eq(organizations.status, "approved")).groupBy(organizations.city, organizations.state);

    return NextResponse.json({
      usersByRole: allUsers,
      orgsByState,
      orgsByCity,
      totalUsers: allUsers.reduce((s, r) => s + r.count, 0),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body: BroadcastRequest = await req.json();
  const { title, message, type, link, targeting, priority } = body;

  if (!title || !message) return NextResponse.json({ error: "title and message required" }, { status: 400 });

  // Resolve target users
  let targetUserIds: string[] = [];

  try {
    switch (targeting.mode) {
      case "all": {
        const allUsers = await db.select({ id: users.id }).from(users);
        targetUserIds = allUsers.map(u => u.id);
        break;
      }
      case "role": {
        if (!targeting.roles?.length) return NextResponse.json({ error: "roles required" }, { status: 400 });
        const roleUsers = await db.select({ id: users.id }).from(users).where(inArray(users.role, targeting.roles as ("owner" | "admin" | "dispatcher" | "driver" | "super_admin")[]));
        targetUserIds = roleUsers.map(u => u.id);
        break;
      }
      case "city": {
        if (!targeting.cities?.length) return NextResponse.json({ error: "cities required" }, { status: 400 });
        const cityOrgs = await db.select({ id: organizations.id }).from(organizations).where(inArray(organizations.city, targeting.cities));
        const cityOrgIds = cityOrgs.map(o => o.id);
        if (cityOrgIds.length > 0) {
          const cityUsers = await db.select({ id: users.id }).from(users).where(inArray(users.orgId, cityOrgIds));
          targetUserIds = cityUsers.map(u => u.id);
        }
        break;
      }
      case "state": {
        if (!targeting.states?.length) return NextResponse.json({ error: "states required" }, { status: 400 });
        const stateOrgs = await db.select({ id: organizations.id }).from(organizations).where(inArray(organizations.state, targeting.states));
        const stateOrgIds = stateOrgs.map(o => o.id);
        if (stateOrgIds.length > 0) {
          const stateUsers = await db.select({ id: users.id }).from(users).where(inArray(users.orgId, stateOrgIds));
          targetUserIds = stateUsers.map(u => u.id);
        }
        break;
      }
      case "company": {
        if (!targeting.companyIds?.length) return NextResponse.json({ error: "companyIds required" }, { status: 400 });
        const companyUsers = await db.select({ id: users.id }).from(users).where(inArray(users.orgId, targeting.companyIds));
        targetUserIds = companyUsers.map(u => u.id);
        break;
      }
      case "specific": {
        if (!targeting.userIds?.length) return NextResponse.json({ error: "userIds required" }, { status: 400 });
        targetUserIds = targeting.userIds;
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid targeting mode" }, { status: 400 });
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ error: "No users match the targeting criteria" }, { status: 400 });
    }

    // Create notifications for all target users (batch insert)
    const batchSize = 100;
    let created = 0;

    for (let i = 0; i < targetUserIds.length; i += batchSize) {
      const batch = targetUserIds.slice(i, i + batchSize);
      const values = batch.map(userId => ({
        userId,
        orgId: null as string | null,
        type: type as "lead" | "job" | "payment" | "system",
        title,
        message,
        link: link || null,
      }));

      try {
        await db.insert(notifications).values(values);
        created += batch.length;
      } catch (e) {
        console.error("Batch insert error:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Broadcast sent to ${created} users`,
      targeting: targeting.mode,
      recipientCount: created,
      priority,
    });
  } catch (e) {
    return NextResponse.json({ error: `Broadcast failed: ${e}` }, { status: 500 });
  }
}
