import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { invoices, organizations, customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * PDF Generation for Invoices
 *
 * Generates HTML invoice that can be printed as PDF.
 * Returns HTML content that browser can print/save as PDF.
 *
 * GET /api/invoices/pdf?id=xxx — generate invoice HTML
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("id");
  if (!invoiceId) return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });

  const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.orgId, user.orgId))).limit(1);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId)).limit(1);

  let customer = null;
  if (invoice.customerId) {
    const [c] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
    customer = c;
  }

  const html = generateInvoiceHTML(invoice, org, customer);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.html"`,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateInvoiceHTML(invoice: any, org: any, customer: any) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 28px; font-weight: 700; color: #533afd; }
    .invoice-title { font-size: 36px; font-weight: 300; color: #533afd; }
    .company-info { text-align: right; }
    .company-name { font-size: 18px; font-weight: 600; }
    .company-detail { font-size: 13px; color: #666; margin-top: 4px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
    .value { font-size: 15px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f6f9fc; text-align: left; padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #e5edf5; }
    td { padding: 12px 16px; border-bottom: 1px solid #e5edf5; font-size: 14px; }
    .totals { margin-top: 30px; text-align: right; }
    .total-row { display: flex; justify-content: flex-end; gap: 40px; padding: 8px 0; font-size: 14px; }
    .total-row.grand { font-size: 20px; font-weight: 600; border-top: 2px solid #533afd; padding-top: 12px; margin-top: 8px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status.paid { background: #dcfce7; color: #166534; }
    .status.unpaid { background: #fef2f2; color: #991b1b; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5edf5; text-align: center; font-size: 12px; color: #999; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🚛 ${org?.name || "TowHub"}</div>
      <div style="font-size: 13px; color: #666; margin-top: 4px;">Towing Services</div>
    </div>
    <div style="text-align: right;">
      <div class="invoice-title">INVOICE</div>
      <div style="font-size: 14px; color: #666; margin-top: 8px;">#${invoice.invoiceNumber}</div>
      <div style="margin-top: 8px;">
        <span class="status ${invoice.status === 'paid' ? 'paid' : 'unpaid'}">${invoice.status.toUpperCase()}</span>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="section">
      <div class="section-title">Bill To</div>
      <div class="value">${customer?.name || "Customer"}</div>
      ${customer?.email ? `<div class="company-detail">${customer.email}</div>` : ""}
      ${customer?.phone ? `<div class="company-detail">${customer.phone}</div>` : ""}
      ${customer?.address ? `<div class="company-detail">${customer.address}</div>` : ""}
    </div>
    <div class="section" style="text-align: right;">
      <div class="section-title">Invoice Details</div>
      <div class="value">Date: ${new Date(invoice.createdAt).toLocaleDateString()}</div>
      <div class="company-detail">Due: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Upon receipt"}</div>
      ${invoice.paidAt ? `<div class="company-detail">Paid: ${new Date(invoice.paidAt).toLocaleDateString()}</div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Towing Services</td>
        <td style="text-align: right;">$${invoice.subtotal.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Subtotal:</span><span>$${invoice.subtotal.toFixed(2)}</span></div>
    ${invoice.tax > 0 ? `<div class="total-row"><span>Tax:</span><span>$${invoice.tax.toFixed(2)}</span></div>` : ""}
    ${invoice.discount > 0 ? `<div class="total-row"><span>Discount:</span><span>-$${invoice.discount.toFixed(2)}</span></div>` : ""}
    <div class="total-row grand"><span>Total:</span><span>$${invoice.total.toFixed(2)}</span></div>
  </div>

  ${invoice.notes ? `<div style="margin-top: 30px;"><div class="section-title">Notes</div><div style="font-size: 13px; color: #666;">${invoice.notes}</div></div>` : ""}

  <div class="footer">
    <div>${org?.name || "TowHub"} • ${org?.phone || ""} • ${org?.email || ""}</div>
    <div style="margin-top: 4px;">Thank you for your business!</div>
  </div>

  <script>window.print();</script>
</body>
</html>`;
}
