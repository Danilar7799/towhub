import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs, expenses, customers, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * CSV Export — export data as CSV for reports
 *
 * GET /api/export?type=jobs&format=csv
 * Types: jobs, expenses, customers, invoices
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "jobs";

  let data: Record<string, unknown>[] = [];
  let headers: string[] = [];

  switch (type) {
    case "jobs":
      const allJobs = await db.select().from(jobs).where(eq(jobs.orgId, user.orgId));
      headers = ["ID", "Status", "Source", "Customer", "Phone", "Pickup", "Destination", "Amount", "Paid", "Created", "Completed"];
      data = allJobs.map(j => ({
        ID: j.id, Status: j.status, Source: j.source, Customer: j.customerName || "", Phone: j.customerPhone || "",
        Pickup: j.pickupAddress, Destination: j.destinationAddress || "", Amount: j.totalAmount || 0, Paid: j.isPaid ? "Yes" : "No",
        Created: j.createdAt, Completed: j.completedAt || "",
      }));
      break;

    case "expenses":
      const allExpenses = await db.select().from(expenses).where(eq(expenses.orgId, user.orgId));
      headers = ["ID", "Category", "Amount", "Description", "Date"];
      data = allExpenses.map(e => ({
        ID: e.id, Category: e.category, Amount: e.amount, Description: e.description || "", Date: e.date,
      }));
      break;

    case "customers":
      const allCustomers = await db.select().from(customers).where(eq(customers.orgId, user.orgId));
      headers = ["ID", "Name", "Email", "Phone", "Company", "City", "Total Jobs", "Total Spent", "VIP"];
      data = allCustomers.map(c => ({
        ID: c.id, Name: c.name, Email: c.email || "", Phone: c.phone || "", Company: c.company || "",
        City: c.city || "", "Total Jobs": c.totalJobs, "Total Spent": c.totalSpent, VIP: c.isVip ? "Yes" : "No",
      }));
      break;

    case "invoices":
      const allInvoices = await db.select().from(invoices).where(eq(invoices.orgId, user.orgId));
      headers = ["ID", "Number", "Status", "Subtotal", "Tax", "Discount", "Total", "Paid", "Due Date", "Created"];
      data = allInvoices.map(i => ({
        ID: i.id, Number: i.invoiceNumber, Status: i.status, Subtotal: i.subtotal, Tax: i.tax,
        Discount: i.discount, Total: i.total, Paid: i.paidAmount, "Due Date": i.dueDate || "", Created: i.createdAt,
      }));
      break;

    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // Generate CSV
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = String(row[h] || "").replace(/"/g, '""');
      return val.includes(",") || val.includes('"') ? `"${val}"` : val;
    }).join(","))
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-export.csv"`,
    },
  });
}
