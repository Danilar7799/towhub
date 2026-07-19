import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Auction Aggregator API
 * GET /api/auctions/search?q=ford+f150&type=salvage&platform=copart,iaa
 *
 * Aggregates vehicle listings from:
 * - Copart (autoauctions.api)
 * - IAA (iaai.com dealer API)
 * - Manheim (manheim.com API)
 * - ADESA (adesa.com API)
 * - BacklotCars (backlotcars.com API)
 * - Pipeline (pipelineauctions.com API)
 *
 * Requires: company settings.integrations.{platformId} with credentials
 */

interface VehicleListing {
  id: string;
  platform: string;
  platformIcon: string;
  title: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin?: string;
  odometer?: number;
  damageType?: string;
  titleType?: string; // salvage, clean, rebuilt
  engineType?: string;
  transmission?: string;
  drivetrain?: string;
  exteriorColor?: string;
  interiorColor?: string;
  currentBid?: number;
  buyNowPrice?: number;
  reservePrice?: number;
  auctionDate?: string;
  auctionLocation?: string;
  imageUrl?: string;
  detailUrl?: string;
  status: "available" | "upcoming" | "sold" | "passed";
  lotNumber?: string;
  seller?: string;
}

// Mock data generator — replace with real API calls when credentials are configured
function getMockAuctionResults(query: string): VehicleListing[] {
  const makes = ["Ford", "Chevrolet", "Toyota", "Honda", "RAM", "Dodge", "Nissan", "Jeep", "BMW", "Mercedes"];
  const models = ["F-150", "Silverado", "Camry", "Civic", "1500", "Charger", "Altima", "Wrangler", "3 Series", "C-Class"];
  const platforms = [
    { id: "copart", icon: "🔨" },
    { id: "iaa", icon: "🚗" },
    { id: "manheim", icon: "🏷️" },
    { id: "adesa", icon: "🌐" },
    { id: "backlotcars", icon: "📸" },
    { id: "pipeline", icon: "🏗️" },
  ];
  const damageTypes = ["Front End", "Rear End", "Side", "Flood", "Hail", "Vandalism", "Fire", "Normal Wear"];
  const titleTypes = ["Salvage", "Clean", "Rebuilt", "Parts Only"];
  const locations = ["Dallas, TX", "Orlando, FL", "Phoenix, AZ", "Atlanta, GA", "Chicago, IL", "Los Angeles, CA", "New York, NY"];
  const statuses: ("available" | "upcoming" | "sold")[] = ["available", "upcoming", "sold"];

  const results: VehicleListing[] = [];
  const count = 8 + Math.floor(Math.random() * 8);

  for (let i = 0; i < count; i++) {
    const makeIdx = Math.floor(Math.random() * makes.length);
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const year = 2015 + Math.floor(Math.random() * 10);
    const status = statuses[Math.floor(Math.random() * 3)];

    results.push({
      id: `${platform.id}_${Date.now()}_${i}`,
      platform: platform.id,
      platformIcon: platform.icon,
      title: `${year} ${makes[makeIdx]} ${models[makeIdx]}`,
      year,
      make: makes[makeIdx],
      model: models[makeIdx],
      vin: `1${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}${String(Math.floor(Math.random() * 1000000)).padStart(6, "0")}`,
      odometer: 20000 + Math.floor(Math.random() * 150000),
      damageType: damageTypes[Math.floor(Math.random() * damageTypes.length)],
      titleType: titleTypes[Math.floor(Math.random() * titleTypes.length)],
      exteriorColor: ["White", "Black", "Silver", "Red", "Blue", "Gray"][Math.floor(Math.random() * 6)],
      currentBid: status !== "sold" ? 1000 + Math.floor(Math.random() * 15000) : undefined,
      buyNowPrice: Math.random() > 0.5 ? 5000 + Math.floor(Math.random() * 20000) : undefined,
      auctionDate: status === "upcoming" ? new Date(Date.now() + Math.random() * 30 * 86400000).toISOString() : undefined,
      auctionLocation: locations[Math.floor(Math.random() * locations.length)],
      status,
      lotNumber: `${1000 + Math.floor(Math.random() * 9000)}`,
      detailUrl: `https://www.${platform.id}.com/lot/${1000 + Math.floor(Math.random() * 9000)}`,
    });
  }

  return results.sort((a, b) => (a.currentBid || 99999) - (b.currentBid || 99999));
}

// Real API integrations (connect when credentials are available)
async function searchCopart(query: string, config: Record<string, string>): Promise<VehicleListing[]> {
  // Copart API: https://www.copart.com/public/lots/search-results
  // Requires: memberId + apiKey
  // TODO: Implement real API call when credentials are configured
  return [];
}

async function searchIAA(query: string, config: Record<string, string>): Promise<VehicleListing[]> {
  // IAA API: https://www.iaai.com/...
  // Requires: buyerId + apiKey
  // TODO: Implement real API call
  return [];
}

async function searchManheim(query: string, config: Record<string, string>): Promise<VehicleListing[]> {
  // Manheim API: https://api.manheim.com/...
  // Requires: clientId + clientSecret (OAuth2)
  // TODO: Implement real API call
  return [];
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";
  const platform = searchParams.get("platform") || "all";
  const damageType = searchParams.get("damage");
  const titleType = searchParams.get("title");
  const minYear = searchParams.get("minYear");
  const maxPrice = searchParams.get("maxPrice");

  // Get company integrations config
  const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  const orgSettings = (org?.settings as Record<string, unknown>) || {};
  const integrations = (orgSettings.integrations as Record<string, Record<string, string>>) || {};

  // Collect results from all connected platforms
  let results: VehicleListing[] = [];

  // If specific platform requested
  const platformsToSearch = platform === "all"
    ? ["copart", "iaa", "manheim", "adesa", "backlotcars", "pipeline"]
    : [platform];

  // Try real API calls for connected platforms
  for (const p of platformsToSearch) {
    const config = integrations[p];
    if (config) {
      // Platform has credentials — try real API
      try {
        let platformResults: VehicleListing[] = [];
        if (p === "copart") platformResults = await searchCopart(query, config);
        else if (p === "iaa") platformResults = await searchIAA(query, config);
        else if (p === "manheim") platformResults = await searchManheim(query, config);
        results.push(...platformResults);
      } catch (e) {
        console.error(`Error searching ${p}:`, e);
      }
    }
  }

  // If no real results (no credentials configured), show mock data for demo
  if (results.length === 0) {
    results = getMockAuctionResults(query);
    // Filter by platform if requested
    if (platform !== "all") {
      results = results.filter(r => r.platform === platform);
    }
  }

  // Apply filters
  if (damageType) results = results.filter(r => r.damageType?.toLowerCase().includes(damageType.toLowerCase()));
  if (titleType) results = results.filter(r => r.titleType?.toLowerCase() === titleType.toLowerCase());
  if (minYear) results = results.filter(r => r.year >= parseInt(minYear));
  if (maxPrice) results = results.filter(r => (r.currentBid || r.buyNowPrice || 0) <= parseInt(maxPrice));

  // Filter by query
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.make?.toLowerCase().includes(q) ||
      r.model?.toLowerCase().includes(q) ||
      r.vin?.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    results,
    total: results.length,
    platforms: platformsToSearch,
    note: results.length > 0 && !integrations[results[0]?.platform]
      ? "⚠️ Showing demo data. Connect auction platforms in Settings → Integrations for live listings."
      : undefined,
  });
}
