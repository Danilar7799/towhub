import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Stripe billing integration
 * 
 * Plans:
 * - Starter: $0/month + 15% commission on leads
 * - Professional: $99/month + 10% commission
 * - Enterprise: Custom pricing
 *
 * This endpoint returns plan info and creates Stripe checkout sessions.
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

  // Free plan — just update org settings
  if (plan === "starter") {
    await db.update(organizations).set({
      settings: {
        ...((await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1))[0]?.settings as Record<string, unknown> || {}),
        plan: "starter",
      },
      updatedAt: new Date(),
    }).where(eq(organizations.id, user.orgId));

    return NextResponse.json({
      plan: selectedPlan,
      message: "Switched to Starter plan (Free).",
    });
  }

  // If Stripe is configured, create checkout session
  if (process.env.STRIPE_SECRET_KEY && selectedPlan.stripePriceId) {
    try {
      const stripe = (await import("stripe")).default;
      const client = new stripe(process.env.STRIPE_SECRET_KEY);

      const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);

      const session = await client.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{
          price: selectedPlan.stripePriceId,
          quantity: 1,
        }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/dashboard/billing?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/dashboard/billing?canceled=true`,
        customer_email: user.email,
        metadata: {
          orgId: user.orgId,
          plan: plan,
        },
        subscription_data: {
          metadata: {
            orgId: user.orgId,
            plan: plan,
          },
        },
      });

      return NextResponse.json({
        checkoutUrl: session.url,
        plan: selectedPlan,
      });
    } catch (err) {
      console.error("Stripe checkout error:", err);
      return NextResponse.json({
        plan: selectedPlan,
        message: "Stripe error. Contact support to upgrade.",
        error: String(err),
      });
    }
  }

  // If no Stripe key, simulate upgrade for demo
  await db.update(organizations).set({
    settings: {
      ...((await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1))[0]?.settings as Record<string, unknown> || {}),
      plan: plan,
    },
    updatedAt: new Date(),
  }).where(eq(organizations.id, user.orgId));

  return NextResponse.json({
    plan: selectedPlan,
    message: `${selectedPlan.name} plan activated! ${selectedPlan.price ? `$${selectedPlan.price}/month` : "Custom pricing"}.`,
  });
}