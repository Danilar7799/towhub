import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invoices, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Stripe Webhook — handles payment confirmations
 *
 * POST /api/payments/webhook
 * Stripe sends events when payment succeeds/fails
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    // If Stripe is configured, verify signature
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && sig) {
      const stripe = (await import("stripe")).default;
      const client = new stripe(process.env.STRIPE_SECRET_KEY);

      let event;
      try {
        event = client.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as { metadata?: { invoiceId?: string } };
        const invoiceId = session.metadata?.invoiceId;

        if (invoiceId) {
          await db.update(invoices).set({
            status: "paid",
            paidAt: new Date(),
            paidAmount: (await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1))[0]?.total || 0,
          }).where(eq(invoices.id, invoiceId));
        }
      }

      return NextResponse.json({ received: true });
    }

    // Manual payment confirmation (no Stripe)
    const { invoiceId, amount, method } = JSON.parse(body);
    if (invoiceId) {
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
      if (inv) {
        await db.update(invoices).set({
          status: "paid",
          paidAt: new Date(),
          paidAmount: amount || inv.total,
          paymentMethod: method || "manual",
        }).where(eq(invoices.id, invoiceId));

        // Mark associated job as paid
        if (inv.jobId) {
          await db.update(jobs).set({ isPaid: true, paymentMethod: method || "manual" }).where(eq(jobs.id, inv.jobId));
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
