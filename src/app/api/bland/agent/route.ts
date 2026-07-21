import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations, customers } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Bland.ai Agent Manager — create/update AI dispatcher agents per company
 *
 * POST /api/bland/agent — create or update agent with full script
 *
 * Each company gets their own Bland.ai agent with:
 * - Known client list (from CRM) → forwarded to owner
 * - Roadside assistance script
 * - Impound inquiry script
 * - Sales/spam → voicemail
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId || !["owner", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const settings = (org.settings as Record<string, unknown>) || {};
  const blandConfig = (settings.blandConfig as Record<string, unknown>) || {};
  const apiKey = blandConfig.apiKey || process.env.BLAND_AI_API_KEY;

  if (!apiKey) return NextResponse.json({ error: "Bland.ai API key not configured" }, { status: 400 });

  // Get known clients from CRM
  const orgCustomers = await db.select().from(customers).where(eq(customers.orgId, user.orgId));
  const knownClients = orgCustomers.filter(c => c.phone).map(c => c.phone as string);

  // Get owner phone
  const ownerPhone = org.phone || blandConfig.ownerPhone || "+1-XXX-XXX-XXXX";
  const companyName = org.name || "our towing company";

  const prompt = buildDispatcherPrompt(companyName, knownClients, ownerPhone);

  try {
    // Create new agent
    const res = await fetch("https://api.bland.ai/v1/agents", {
      method: "POST",
      headers: {
        "Authorization": String(apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${companyName} AI Dispatcher`,
        prompt,
        voice: "josh",
        language: "en",
        interruption_threshold: 100,
        max_duration: 300,
        webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/bland/webhook`,
        metadata: { org_id: user.orgId },
        analysis_schema: {
          call_type: { type: "string", description: "known_client, roadside, impound, voicemail" },
          service_type: { type: "string", description: "tow, lockout, jump_start, tire_change, fuel_delivery, winch_out, impound_release, none" },
          customer_name: { type: "string" },
          customer_phone: { type: "string" },
          pickup_address: { type: "string" },
          destination_address: { type: "string" },
          vehicle_info: { type: "string" },
          plate_number: { type: "string" },
          urgency: { type: "string" },
        },
      }),
    });

    const data = await res.json();

    if (data.agent) {
      // Save agent ID to org settings
      await db.update(organizations).set({
        settings: {
          ...settings,
          blandConfig: {
            ...blandConfig,
            agentId: data.agent.agent_id,
            lastSync: new Date().toISOString(),
            knownClientsCount: knownClients.length,
          },
        },
        updatedAt: new Date(),
      }).where(eq(organizations.id, user.orgId));

      return NextResponse.json({
        success: true,
        agentId: data.agent.agent_id,
        knownClientsCount: knownClients.length,
        ownerPhone,
        message: `AI Dispatcher created for ${companyName} with ${knownClients.length} known clients`,
      });
    }

    return NextResponse.json({ error: "Failed to create agent", details: data }, { status: 500 });
  } catch (err) {
    console.error("Bland agent error:", err);
    return NextResponse.json({ error: "Bland.ai API error", details: String(err) }, { status: 500 });
  }
}

function buildDispatcherPrompt(companyName: string, knownClients: string[], ownerPhone: string): string {
  return `You are the AI dispatcher for ${companyName}, a professional towing company.

CALL ROUTING LOGIC:

STEP 1 - CHECK KNOWN CLIENT:
The following phone numbers are our existing clients: ${knownClients.length > 0 ? knownClients.join(", ") : "none yet"}.
When a call comes in, if the caller's phone number matches any of these known clients, IMMEDIATELY say:
"Welcome back to ${companyName}! Let me transfer you to our team right away."
Then transfer the call to ${ownerPhone}.

STEP 2 - NEW CALLER (not in known clients):
If the caller is NOT a known client, greet them:
"Thank you for calling ${companyName}! Are you looking for roadside assistance, or do you have a vehicle in our impound lot?"

BRANCH A - ROADSIDE ASSISTANCE:
If they need a tow, lockout, jump start, tire change, fuel delivery, or winch out:
1. "What service do you need today?"
2. "What is your exact location? Please give me the address or nearest cross streets."
3. If towing: "Where would you like the vehicle taken?"
4. "What is the make, model, year, and color of your vehicle?"
5. "May I get your name and a callback number?"
6. Confirm: "I have all your details. A driver will be dispatched to you shortly. You will receive a text message with your driver's information."

BRANCH B - IMPOUND INQUIRY:
If they have a vehicle in our impound lot:
1. "May I get your name?"
2. "What is the make, model, year, color, and license plate of your vehicle?"
3. "When was the vehicle towed?"
4. "What is your callback number?"
5. Say: "I have your information. Our office will call you back shortly with release details and fees."

STEP 3 - SALES/SPAM/OTHER:
If the caller is trying to sell something, advertise, or ask about non-service topics:
"Thank you for your interest. Please leave your name, phone number, and a brief message after the tone, and we will get back to you."
Then transfer to voicemail.

IMPORTANT RULES:
- Be friendly, professional, and efficient
- Keep roadside calls under 3 minutes
- Keep impound calls under 2 minutes
- Always get an exact address - if they say "highway", ask for mile marker or nearest exit
- Always get a callback phone number
- Speak clearly and at a moderate pace`;
}
