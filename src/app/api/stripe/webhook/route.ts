import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Stripe Webhook — subscription management
 * POST /api/stripe/webhook — handle Stripe events
 *
 * Events handled:
 * - checkout.session.completed — new subscription
 * - customer.subscription.updated — plan change
 * - customer.subscription.deleted — cancellation
 * - invoice.payment_failed — payment issue
 */

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

const PLAN_MAP: Record<string, { name: string; maxDrivers: number; maxJobs: number; features: string[] }> = {
  starter: {
    name: "Starter",
    maxDrivers: 3,
    maxJobs: 100,
    features: ["basic_dispatch", "call_logs", "invoicing"],
  },
  professional: {
    name: "Professional",
    maxDrivers: 15,
    maxJobs: 500,
    features: ["ai_dispatcher", "motor_clubs", "sms", "reports", "compliance"],
  },
  enterprise: {
    name: "Enterprise",
    maxDrivers: 999,
    maxJobs: 9999,
    features: ["everything", "priority_support", "custom_integrations", "white_label"],
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    // In production, verify signature with Stripe SDK
    // const event = stripe.webhooks.constructEvent(body, sig!, STRIPE_WEBHOOK_SECRET);

    // For now, parse the event directly
    const event = JSON.parse(body);
    const { type, data } = event;

    console.log(`[Stripe] Event: ${type}`);

    switch (type) {
      case "checkout.session.completed": {
        const session = data.object;
        const orgId = session.metadata?.org_id;
        const planId = session.metadata?.plan || "starter";

        if (!orgId) break;

        const plan = PLAN_MAP[planId] || PLAN_MAP.starter;

        const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
        const settings = (org?.settings as Record<string, unknown>) || {};

        await db.update(organizations).set({
          settings: {
            ...settings,
            subscription: {
              plan: planId,
              planName: plan.name,
              maxDrivers: plan.maxDrivers,
              maxJobs: plan.maxJobs,
              features: plan.features,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              status: "active",
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
          status: "approved",
          updatedAt: new Date(),
        }).where(eq(organizations.id, orgId));

        console.log(`[Stripe] Subscription activated: ${planId} for org ${orgId}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = data.object;
        const orgId = sub.metadata?.org_id;

        if (!orgId) break;

        const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
        const settings = (org?.settings as Record<string, unknown>) || {};
        const subscription = (settings.subscription as Record<string, unknown>) || {};

        await db.update(organizations).set({
          settings: {
            ...settings,
            subscription: {
              ...subscription,
              status: sub.status,
              currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          },
          updatedAt: new Date(),
        }).where(eq(organizations.id, orgId));

        console.log(`[Stripe] Subscription updated: ${sub.status} for org ${orgId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = data.object;
        const orgId = sub.metadata?.org_id;

        if (!orgId) break;

        const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
        const settings = (org?.settings as Record<string, unknown>) || {};

        await db.update(organizations).set({
          settings: {
            ...settings,
            subscription: {
              plan: "free",
              planName: "Free",
              maxDrivers: 1,
              maxJobs: 10,
              features: [],
              status: "cancelled",
            },
          },
          updatedAt: new Date(),
        }).where(eq(organizations.id, orgId));

        console.log(`[Stripe] Subscription cancelled for org ${orgId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = data.object;
        const orgId = invoice.metadata?.org_id;

        if (!orgId) break;

        const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
        const settings = (org?.settings as Record<string, unknown>) || {};
        const subscription = (settings.subscription as Record<string, unknown>) || {};

        await db.update(organizations).set({
          settings: {
            ...settings,
            subscription: {
              ...subscription,
              status: "past_due",
            },
          },
          updatedAt: new Date(),
        }).where(eq(organizations.id, orgId));

        console.log(`[Stripe] Payment failed for org ${orgId}`);
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Stripe] Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}