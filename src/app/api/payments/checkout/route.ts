import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { invoices, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Stripe Payment Integration
 *
 * Creates checkout sessions for invoices.
 * Requires STRIPE_SECRET_KEY env var.
 *
 * Flow:
 * 1. Company creates invoice
 * 2. Generate Stripe checkout link
 * 3. Customer pays via Stripe
 * 4. Webhook confirms payment → update invoice status
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invoiceId } = await req.json();
  if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

  const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId))).limit(1);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);

  // If Stripe is configured, create checkout session
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = (await import("stripe")).default;
      const client = new stripe(process.env.STRIPE_SECRET_KEY);

      const session = await client.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
              description: `Towing services - ${org?.name || "TowHub"}`,
            },
            unit_amount: Math.round(invoice.total * 100), // cents
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices?success=${invoiceId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices?cancelled=${invoiceId}`,
        metadata: { invoiceId: invoice.id, orgId: user.orgId },
      });

      return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id });
    } catch (err) {
      console.error("Stripe error:", err);
      return NextResponse.json({ error: "Stripe error", details: String(err) }, { status: 500 });
    }
  }

  // If no Stripe, return a mock payment link
  return NextResponse.json({
    checkoutUrl: null,
    message: "Stripe not configured. Set STRIPE_SECRET_KEY to enable payments.",
    invoice: { id: invoice.id, number: invoice.invoiceNumber, total: invoice.total },
  });
}
