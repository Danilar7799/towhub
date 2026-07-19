import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Save onboarding data to org settings
  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const currentSettings = (org.settings as Record<string, unknown>) || {};
  const updatedSettings = {
    ...currentSettings,
    onboarding: {
      ...body,
      completedAt: new Date().toISOString(),
      completed: true,
    },
    // Generate upsell recommendations based on answers
    upsellRecommendations: generateUpsells(body),
  };

  await db.update(organizations).set({ settings: updatedSettings, updatedAt: new Date() }).where(eq(organizations.id, user.orgId));

  return NextResponse.json({ success: true, message: "Onboarding completed!" });
}

function generateUpsells(form: Record<string, unknown>) {
  const upsells = [];

  if (!form.needsAiDispatcher) {
    upsells.push({ feature: "ai_dispatcher", title: "AI Dispatcher", desc: "Never miss a call — AI answers 24/7", priority: "high", price: "$99/mo" });
  }
  if (!form.needsLeadCapture) {
    upsells.push({ feature: "lead_capture", title: "Lead Capture", desc: "Auto-import leads from Yelp & Thumbtack", priority: "high", price: "Included" });
  }
  if (!form.needsAiDocuments) {
    upsells.push({ feature: "ai_documents", title: "AI Documents", desc: "Auto-generate invoices and police forms", priority: "medium", price: "$49/mo" });
  }
  if (!form.hasImpoundLot && form.hasPoliceRotation) {
    upsells.push({ feature: "impound_lot", title: "Impound Management", desc: "Track stored vehicles and generate auction listings", priority: "medium", price: "$49/mo" });
  }
  if (!form.hasWebsite) {
    upsells.push({ feature: "website", title: "Website + Lead Forms", desc: "Professional website with lead capture forms", priority: "medium", price: "$199 one-time" });
  }
  if (!form.hasSubcontractors && parseInt(form.fleetSize as string) < 5) {
    upsells.push({ feature: "subcontractors", title: "Subcontractor Network", desc: "Scale without buying more trucks", priority: "low", price: "Free" });
  }
  if (!form.needsCashCalls) {
    upsells.push({ feature: "cash_calls", title: "Cash Call Processing", desc: "Handle cash customers for % commission", priority: "low", price: "8%" });
  }

  return upsells;
}
