import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { invoices, organizations, customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Email Notifications via Resend
 *
 * POST /api/notifications/email
 * { type: "invoice" | "contract_reminder" | "welcome", invoiceId?, to?, subject?, body? }
 *
 * Sends email via Resend API. Requires RESEND_API_KEY env var.
 */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, invoiceId, to, subject, body } = await req.json();

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);

  let recipient = to;
  let emailSubject = subject;
  let emailBody = body;

  // Auto-generate content based on type
  if (type === "invoice" && invoiceId) {
    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId))).limit(1);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    let customer = null;
    if (invoice.customerId) {
      const [c] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
      customer = c;
    }

    recipient = recipient || customer?.email;
    emailSubject = emailSubject || `Invoice ${invoice.invoiceNumber} from ${org?.name || "TowHub"}`;
    emailBody = emailBody || [
      `<h2>Invoice ${invoice.invoiceNumber}</h2>`,
      `<p>Dear ${customer?.name || "Customer"},</p>`,
      `<p>Please find your invoice details below:</p>`,
      `<table style="border-collapse:collapse;width:100%">`,
      `<tr><td style="padding:8px;border:1px solid #e5edf5">Invoice Number</td><td style="padding:8px;border:1px solid #e5edf5"><strong>${invoice.invoiceNumber}</strong></td></tr>`,
      `<tr><td style="padding:8px;border:1px solid #e5edf5">Amount</td><td style="padding:8px;border:1px solid #e5edf5"><strong>$${invoice.total.toFixed(2)}</strong></td></tr>`,
      `<tr><td style="padding:8px;border:1px solid #e5edf5">Due Date</td><td style="padding:8px;border:1px solid #e5edf5">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Upon receipt"}</td></tr>`,
      `<tr><td style="padding:8px;border:1px solid #e5edf5">Status</td><td style="padding:8px;border:1px solid #e5edf5">${invoice.status.toUpperCase()}</td></tr>`,
      `</table>`,
      `<p style="margin-top:16px"><a href="${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/pdf?id=${invoice.id}" style="background:#533afd;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">View Invoice</a></p>`,
      `<p style="margin-top:24px;color:#666;font-size:13px">Thank you for your business!<br/>${org?.name || "TowHub"}</p>`,
    ].join("\n");
  }

  if (type === "welcome") {
    emailSubject = emailSubject || `Welcome to ${org?.name || "TowHub"}!`;
    emailBody = emailBody || `<h2>Welcome!</h2><p>Your account has been set up. You can now track your tows online.</p>`;
  }

  if (!recipient) return NextResponse.json({ error: "Recipient email required" }, { status: 400 });

  // If Resend is configured, send email
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${org?.name || "TowHub"} <noreply@towhub.vercel.app>`,
          to: recipient,
          subject: emailSubject,
          html: emailBody,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        return NextResponse.json({ success: true, emailId: data.id, to: recipient });
      }
      return NextResponse.json({ error: "Email failed", details: data }, { status: 500 });
    } catch (err) {
      console.error("Resend error:", err);
      return NextResponse.json({ error: "Email failed", details: String(err) }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: false,
    message: "Resend not configured. Set RESEND_API_KEY.",
    preview: { to: recipient, subject: emailSubject, html: emailBody?.slice(0, 200) },
  });
}
