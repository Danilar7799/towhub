import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, customers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Bland.ai Dynamic Data Webhook
 *
 * Called by Bland.ai at the START of each call to get:
 * - Known client phone numbers (from CRM)
 * - Owner phone for transfers
 * - Company name
 *
 * This ensures the AI always has the latest client list
 * without needing to recreate the agent.
 *
 * Configure in Bland.ai agent settings:
 * "Dynamic Data Webhook URL": https://towhub.vercel.app/api/bland/dynamic-data
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = body.metadata?.org_id || body.org_id;

    if (!orgId) {
      return NextResponse.json({
        known_clients: [],
        owner_phone: "",
        company_name: "Towing Company",
      });
    }

    // Get org info
    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    if (!org) {
      return NextResponse.json({ known_clients: [], owner_phone: "", company_name: "Towing Company" });
    }

    // Get all customers with phone numbers
    const orgCustomers = await db.select().from(customers).where(eq(customers.orgId, orgId));
    const knownClients = orgCustomers
      .filter(c => c.phone)
      .map(c => c.phone as string);

    // Get owner phone
    const ownerPhone = org.phone || "";

    // Get org settings for bland config
    const settings = (org.settings as Record<string, unknown>) || {};
    const blandConfig = (settings.blandConfig as Record<string, unknown>) || {};

    return NextResponse.json({
      known_clients: knownClients,
      owner_phone: blandConfig.ownerPhone || ownerPhone,
      company_name: org.name,
      total_clients: knownClients.length,
    });
  } catch (err) {
    console.error("Bland dynamic data error:", err);
    return NextResponse.json({
      known_clients: [],
      owner_phone: "",
      company_name: "Towing Company",
    });
  }
}
