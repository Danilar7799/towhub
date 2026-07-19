import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Integrations Hub API
 * GET  /api/integrations — list all integrations and their status
 * POST /api/integrations — configure an integration (save credentials, toggle)
 *
 * Supported platforms:
 * - Auctions: Copart, IAA, Manheim, ADESA, BacklotCars, Pipeline
 * - Roadside: HONK, Urgently, Agero/Swoop, Quest
 * - CRM/Accounting: QuickBooks, Salesforce
 * - Communication: Twilio, Bland.ai, Google Business
 */

interface Integration {
  id: string;
  name: string;
  category: "auction" | "roadside" | "crm" | "communication" | "accounting";
  icon: string;
  description: string;
  website: string;
  connected: boolean;
  status: "connected" | "not_connected" | "error" | "pending";
  configFields: { key: string; label: string; type: "text" | "password" | "url" | "select"; placeholder?: string; options?: string[] }[];
}

const AVAILABLE_INTEGRATIONS: Omit<Integration, "connected" | "status">[] = [
  // ===== AUCTION PLATFORMS =====
  {
    id: "copart",
    name: "Copart",
    category: "auction",
    icon: "🔨",
    description: "Auto auction platform — bid on salvage, clean title, and dealer vehicles. Access 200,000+ vehicles daily.",
    website: "https://www.copart.com",
    configFields: [
      { key: "memberId", label: "Member ID", type: "text", placeholder: "Your Copart member ID" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "Copart API key" },
    ],
  },
  {
    id: "iaa",
    name: "IAA (Insurance Auto Auctions)",
    category: "auction",
    icon: "🚗",
    description: "Insurance auto auctions — salvage vehicles from insurance companies. 250+ locations.",
    website: "https://www.iaai.com",
    configFields: [
      { key: "buyerId", label: "Buyer ID", type: "text", placeholder: "Your IAA buyer number" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "IAA API key" },
    ],
  },
  {
    id: "manheim",
    name: "Manheim (Cox Automotive)",
    category: "auction",
    icon: "🏷️",
    description: "Wholesale auto auction — the largest in North America. 8M+ vehicles annually.",
    website: "https://www.manheim.com",
    configFields: [
      { key: "clientId", label: "Client ID", type: "text", placeholder: "Manheim client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "Manheim client secret" },
      { key: "auctionLocation", label: "Default Auction", type: "text", placeholder: "e.g. Manheim Orlando" },
    ],
  },
  {
    id: "adesa",
    name: "ADESA (OPENLANE)",
    category: "auction",
    icon: "🌐",
    description: "Online and physical auto auctions. Part of KAR Global. Access dealer-only and public auctions.",
    website: "https://adesa.com",
    configFields: [
      { key: "dealerId", label: "Dealer ID", type: "text", placeholder: "ADESA dealer number" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "ADESA API key" },
    ],
  },
  {
    id: "backlotcars",
    name: "BacklotCars",
    category: "auction",
    icon: "📸",
    description: "Online-only wholesale auto auction. HD photos, 360° views, no auction fees for sellers.",
    website: "https://www.backlotcars.com",
    configFields: [
      { key: "email", label: "Account Email", type: "text", placeholder: "your@email.com" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "BacklotCars API key" },
    ],
  },
  {
    id: "pipeline",
    name: "Pipeline (Auto Auction)",
    category: "auction",
    icon: "🏗️",
    description: "Auto auction aggregator — connects to 150+ auctions nationwide. One API to bid everywhere.",
    website: "https://www.pipelineauctions.com",
    configFields: [
      { key: "accountNumber", label: "Account Number", type: "text", placeholder: "Pipeline account #" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "Pipeline API key" },
    ],
  },

  // ===== ROADSIDE ASSISTANCE PLATFORMS =====
  {
    id: "honk",
    name: "HONK",
    category: "roadside",
    icon: "📯",
    description: "Roadside assistance dispatch platform — get tow requests from HONK's network of 75M+ drivers.",
    website: "https://www.honkforhelp.com",
    configFields: [
      { key: "partnerId", label: "Partner ID", type: "text", placeholder: "HONK partner ID" },
      { key: "apiSecret", label: "API Secret", type: "password", placeholder: "HONK API secret" },
      { key: "serviceArea", label: "Service Area ZIP", type: "text", placeholder: "90001" },
    ],
  },
  {
    id: "urgently",
    name: "Urgently",
    category: "roadside",
    icon: "⚡",
    description: "Roadside assistance platform powered by USAA, Allstate, and major insurers. Premium dispatch network.",
    website: "https://www.geturgently.com",
    configFields: [
      { key: "providerId", label: "Provider ID", type: "text", placeholder: "Urgently provider ID" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "Urgently API key" },
    ],
  },
  {
    id: "agero",
    name: "Agero / Swoop",
    category: "roadside",
    icon: "🛡️",
    description: "Largest roadside assistance provider in North America. Dispatches for 100+ insurance/automotive brands.",
    website: "https://www.agero.com",
    configFields: [
      { key: "networkId", label: "Network ID", type: "text", placeholder: "Agero network ID" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "Agero API key" },
    ],
  },
  {
    id: "quest",
    name: "Quest Towing Solutions",
    category: "roadside",
    icon: "🗺️",
    description: "National towing dispatch network. Contracts with AAA, insurance companies, and motor clubs.",
    website: "https://www.questsolutions.com",
    configFields: [
      { key: "vendorId", label: "Vendor ID", type: "text", placeholder: "Quest vendor ID" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "Quest API key" },
    ],
  },

  // ===== COMMUNICATION =====
  {
    id: "twilio",
    name: "Twilio",
    category: "communication",
    icon: "📱",
    description: "SMS and voice notifications to customers. Send job updates, ETAs, and invoices via text.",
    website: "https://www.twilio.com",
    configFields: [
      { key: "accountSid", label: "Account SID", type: "text", placeholder: "ACxxxx" },
      { key: "authToken", label: "Auth Token", type: "password", placeholder: "Twilio auth token" },
      { key: "phoneNumber", label: "Phone Number", type: "text", placeholder: "+1-555-000-0000" },
    ],
  },
  {
    id: "bland",
    name: "Bland.ai (AI Dispatcher)",
    category: "communication",
    icon: "🤖",
    description: "AI phone agent that answers calls, captures job details, and dispatches drivers automatically 24/7.",
    website: "https://www.bland.ai",
    configFields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "Bland.ai API key" },
      { key: "phoneNumber", label: "Phone Number", type: "text", placeholder: "+1-555-000-0000" },
    ],
  },
  {
    id: "google_business",
    name: "Google Business Profile",
    category: "communication",
    icon: "🔵",
    description: "Connect your Google Business listing. Auto-respond to messages, capture leads from Google Maps.",
    website: "https://business.google.com",
    configFields: [
      { key: "businessUrl", label: "Business URL", type: "url", placeholder: "https://maps.google.com/..." },
    ],
  },

  // ===== ACCOUNTING =====
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    category: "accounting",
    icon: "📊",
    description: "Sync invoices, expenses, and payments with QuickBooks. Auto-create journal entries.",
    website: "https://quickbooks.intuit.com",
    configFields: [
      { key: "companyId", label: "Company ID", type: "text", placeholder: "QuickBooks company ID" },
      { key: "clientId", label: "Client ID", type: "text", placeholder: "OAuth client ID" },
      { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "OAuth client secret" },
    ],
  },
];

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const settings = (org?.settings as Record<string, Record<string, string>>) || {};
  const integrationsConfig = settings.integrations || {};

  const integrations: Integration[] = AVAILABLE_INTEGRATIONS.map(int => {
    const config = integrationsConfig[int.id];
    return {
      ...int,
      connected: !!config && Object.keys(config).length > 0,
      status: config ? "connected" : "not_connected",
    };
  });

  return NextResponse.json({ integrations });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { integrationId, config, disconnect } = body;
  if (!integrationId) return NextResponse.json({ error: "integrationId required" }, { status: 400 });

  const intDef = AVAILABLE_INTEGRATIONS.find(i => i.id === integrationId);
  if (!intDef) return NextResponse.json({ error: "Unknown integration" }, { status: 400 });

  const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const currentSettings = (org?.settings as Record<string, unknown>) || {};
  const integrations = (currentSettings.integrations as Record<string, Record<string, string>>) || {};

  if (disconnect) {
    delete integrations[integrationId];
  } else {
    // Validate required fields
    const missing = intDef.configFields.filter(f => !config?.[f.key]);
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.map(f => f.label).join(", ")}` }, { status: 400 });
    }
    integrations[integrationId] = config;
  }

  await db.update(organizations).set({
    settings: { ...currentSettings, integrations },
    updatedAt: new Date(),
  }).where(eq(organizations.id, user.orgId));

  return NextResponse.json({
    ok: true,
    message: disconnect
      ? `Disconnected from ${intDef.name}`
      : `Connected to ${intDef.name}!`,
  });
}
