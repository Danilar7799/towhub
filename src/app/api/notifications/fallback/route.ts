import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, users, jobs } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/*
 * Fallback Notification System
 *
 * POST /api/notifications/fallback
 * { orgId, reason, jobId?, message? }
 *
 * When the AI dispatcher can't get driver info or system fails,
 * this endpoint notifies all relevant parties:
 * - Owner (via Telegram/SMS)
 * - Dispatchers (via in-app)
 * - All online drivers (via push)
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, reason, jobId, message } = body;

    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    // Get owner and dispatchers
    const staff = await db.select().from(users).where(
      and(eq(users.orgId, orgId), eq(users.isActive, true))
    );
    const owners = staff.filter(u => u.role === "owner");
    const dispatchers = staff.filter(u => u.role === "dispatcher" || u.role === "admin");
    const drivers = staff.filter(u => u.role === "driver");

    const notifications = [];

    // Notify owners
    for (const owner of owners) {
      notifications.push({
        type: "owner_alert",
        userId: owner.id,
        channel: "telegram",
        message: `⚠️ ${org.name}: ${message || getDefaultMessage(reason)}`,
      });
    }

    // Notify dispatchers
    for (const dispatcher of dispatchers) {
      notifications.push({
        type: "dispatcher_alert",
        userId: dispatcher.id,
        channel: "in_app",
        message: `⚠️ ${message || getDefaultMessage(reason)}`,
      });
    }

    // Notify drivers (if no drivers available)
    if (reason === "no_drivers") {
      for (const driver of drivers) {
        notifications.push({
          type: "driver_alert",
          userId: driver.id,
          channel: "push",
          message: `🚨 New job waiting! No drivers available. Please go online if available.`,
        });
      }
    }

    // Log the fallback event
    console.log(`[FALLBACK] Org: ${org.name}, Reason: ${reason}, Notifications: ${notifications.length}`);

    return NextResponse.json({
      success: true,
      reason,
      notificationsSent: notifications.length,
      notified: {
        owners: owners.length,
        dispatchers: dispatchers.length,
        drivers: reason === "no_drivers" ? drivers.length : 0,
      },
    });
  } catch (err) {
    console.error("Fallback notification error:", err);
    return NextResponse.json({ error: "Notification failed" }, { status: 500 });
  }
}

function getDefaultMessage(reason: string): string {
  switch (reason) {
    case "no_drivers":
      return "No drivers available for incoming call. All drivers busy or offline.";
    case "system_error":
      return "System error during call. Manual dispatch required.";
    case "gps_stale":
      return "Driver GPS data is stale. Drivers may need to restart their app.";
    case "timeout":
      return "Call timed out. Customer may need callback.";
    default:
      return `Dispatch alert: ${reason}`;
  }
}
