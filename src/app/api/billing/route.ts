import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/*
 * Stripe billing integration
 * 
 * Plans:
 * - Starter: $0/month + 15% commission on leads
 * - Professional: $99/month + 10% commission
 * - Enterprise: Custom pricing
 *
 * This endpoint returns plan info and checkout URLs.
 * Real Stripe integration requires STRIPE_SECRET_KEY env var.
 */

const PLANS = {
  starter: {
    name: "Starter",
    price: 0,
    commission: 15,
    maxDrivers: 5,
    features: ["Basic dispatch", "GPS tracking", "Lead capture", "Email support"],
    stripePriceId: null, // Free tier
  },
  professional: {
    name: "Professional",
    price: 99,
    commission: 10,
    maxDrivers: 20,
    features: ["AI Dispatcher", "Google Business", "Advanced analytics", "Priority support", "Custom phone"],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || "price_professional_monthly",
  },
  enterprise: {
    name: "Enterprise",
    price: null, // Custom
    commission: 5,
    maxDrivers: -1, // Unlimited
    features: ["White-label", "Custom integrations", "Dedicated manager", "SLA", "API access"],
    stripePriceId: process.env.STRIPE_ENT_PRICE_ID || "price_enterprise_monthly",
  },
};

export async function GET() {
  return NextResponse.json({ plans: PLANS });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId || user.role !== "owner") {
    return NextResponse.json({ error: "Only org owners can change plans" }, { status: 403 });
  }

  const { plan } = await req.json();
  if (!PLANS[plan as keyof typeof PLANS]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const selectedPlan = PLANS[plan as keyof typeof PLANS];

  // If Stripe is configured, create checkout session
  if (process.env.STRIPE_SECRET_KEY && selectedPlan.stripePriceId) {
    // TODO: Create Stripe checkout session
    // const session = await stripe.checkout.sessions.create({...});
    return NextResponse.json({
      checkoutUrl: null, // Would be session.url
      plan: selectedPlan,
      message: "Stripe integration pending. Contact support to upgrade.",
    });
  }

  // If no Stripe, just return plan info
  return NextResponse.json({
    plan: selectedPlan,
    message: `${selectedPlan.name} plan selected. ${selectedPlan.price ? `$${selectedPlan.price}/month` : "Custom pricing"}.`,
  });
}
