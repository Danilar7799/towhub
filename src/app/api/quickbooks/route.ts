import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations, invoices, expenses, customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * QuickBooks Integration API
 *
 * Supports:
 * - OAuth2 flow (connect/disconnect)
 * - Sync invoices → QBO
 * - Sync expenses → QBO
 * - Sync customers → QBO
 * - Import chart of accounts
 *
 * QuickBooks API docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/invoice
 */

const QB_BASE_URL = "https://quickbooks.api.intuit.com";
const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_DISCOVERY = "https://developer.api.intuit.com/.well-known/openid_configuration";

// Get stored QB credentials from org settings
async function getQBCredentials(orgId: string): Promise<Record<string, string> | null> {
  const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const settings = (org?.settings as Record<string, unknown>) || {};
  const integrations = (settings.integrations as Record<string, Record<string, string>>) || {};
  return integrations.quickbooks || null;
}

// Refresh access token
async function refreshAccessToken(config: { clientId: string; clientSecret: string; refreshToken: string }) {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const res = await fetch("https://oauth.platform.intuit.com/oauth2/tokens/bearer", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = await res.json();
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
}

// Make authenticated QB API call
async function qbApiCall(endpoint: string, accessToken: string, companyId: string, method = "GET", body?: unknown) {
  const res = await fetch(`${QB_BASE_URL}/v3/company/${companyId}/${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QB API error ${res.status}: ${text}`);
  }
  return res.json();
}

// === SYNC FUNCTIONS ===

async function syncInvoiceToQB(invoice: any, accessToken: string, companyId: string) {
  const qbInvoice = {
    Invoice: {
      DocNumber: invoice.invoiceNumber,
      TxnDate: invoice.createdAt?.slice(0, 10),
      DueDate: invoice.dueDate?.slice(0, 10),
      CustomerRef: { value: invoice.qbCustomerId || "1" },
      Line: [
        {
          Amount: invoice.subtotal,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            UnitPrice: invoice.subtotal,
            Qty: 1,
            Description: `TowHub Invoice ${invoice.invoiceNumber}`,
          },
        },
      ],
      TotalAmt: invoice.total,
      Balance: invoice.total - (invoice.paidAmount || 0),
    },
  };
  return qbApiCall("invoice", accessToken, companyId, "POST", qbInvoice);
}

async function syncExpenseToQB(expense: any, accessToken: string, companyId: string) {
  const qbExpense = {
    Purchase: {
      PaymentType: "Cash",
      TxnDate: expense.date?.slice(0, 10),
      TotalAmt: expense.amount,
      Line: [
        {
          Amount: expense.amount,
          DetailType: "AccountBasedExpenseLineDetail",
          Description: expense.description || `${expense.category} expense`,
          AccountBasedExpenseLineDetail: {
            AccountRef: { name: "Automobile", value: "82" },
          },
        },
      ],
    },
  };
  return qbApiCall("purchase", accessToken, companyId, "POST", qbExpense);
}

async function syncCustomerToQB(customer: any, accessToken: string, companyId: string) {
  const qbCustomer = {
    DisplayName: customer.name,
    GivenName: customer.name?.split(" ")[0],
    FamilyName: customer.name?.split(" ").slice(1).join(" "),
    PrimaryEmailAddr: customer.email ? { Address: customer.email } : undefined,
    PrimaryPhone: customer.phone ? { FreeFormNumber: customer.phone } : undefined,
    BillAddr: {
      City: customer.city,
      CountrySubDivisionCode: customer.state,
      PostalCode: customer.zip,
      Line1: customer.address,
    },
  };
  return qbApiCall("customer", accessToken, companyId, "POST", qbCustomer);
}

// === API ROUTES ===

// GET — Check QB connection status
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getQBCredentials(user.orgId);
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "auth_url") {
    // Generate OAuth2 authorization URL
    const clientId = config?.clientId || process.env.QB_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://towhub.vercel.app"}/api/quickbooks/callback`;
    if (!clientId) return NextResponse.json({ error: "QuickBooks Client ID not configured" }, { status: 400 });

    const scopes = "com.intuit.quickbooks.accounting openid profile email phone address";
    const state = `${user.orgId}_${Date.now()}`;
    const authUrl = `${QB_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;

    return NextResponse.json({ authUrl, connected: !!config?.accessToken });
  }

  if (action === "chart_of_accounts" && config?.accessToken) {
    try {
      const data = await qbApiCall("query?query=SELECT * FROM Account MAXRESULTS 100", config.accessToken, config.companyId);
      return NextResponse.json({ accounts: data.QueryResponse?.Account || [] });
    } catch (e) {
      return NextResponse.json({ error: `Failed to fetch accounts: ${e}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    connected: !!config?.accessToken,
    companyId: config?.companyId || null,
    lastSync: config?.lastSync || null,
  });
}

// POST — Sync data to QuickBooks
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getQBCredentials(user.orgId);
  if (!config?.accessToken) return NextResponse.json({ error: "QuickBooks not connected. Go to Settings → Integrations to connect." }, { status: 400 });

  const body = await req.json();
  const { syncType, ids } = body; // syncType: "invoices" | "expenses" | "customers" | "all"

  try {
    // Try to refresh token if needed
    let accessToken = config.accessToken;
    try {
      if (config.refreshToken) {
        const refreshed = await refreshAccessToken({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          refreshToken: config.refreshToken,
        });
        accessToken = refreshed.accessToken;
        // Update stored tokens
        const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
        const settings = (org?.settings as Record<string, unknown>) || {};
        const integrations = (settings.integrations as Record<string, Record<string, string>>) || {};
        integrations.quickbooks = { ...config, accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
        await db.update(organizations).set({ settings: { ...settings, integrations }, updatedAt: new Date() }).where(eq(organizations.id, user.orgId));
      }
    } catch (e) {
      console.warn("Token refresh failed, using existing token:", e);
    }

    const results = { synced: 0, errors: 0, details: [] as string[] };

    // Sync invoices
    if (syncType === "invoices" || syncType === "all") {
      const invoiceList = ids
        ? await db.select().from(invoices).where(and(eq(invoices.orgId, user.orgId)))
        : await db.select().from(invoices).where(and(eq(invoices.orgId, user.orgId), eq(invoices.status, "sent")));

      for (const inv of invoiceList) {
        try {
          await syncInvoiceToQB(inv, accessToken, config.companyId);
          results.synced++;
          results.details.push(`✅ Invoice ${inv.invoiceNumber} synced`);
        } catch (e) {
          results.errors++;
          results.details.push(`❌ Invoice ${inv.invoiceNumber}: ${e}`);
        }
      }
    }

    // Sync expenses
    if (syncType === "expenses" || syncType === "all") {
      const expenseList = await db.select().from(expenses).where(eq(expenses.orgId, user.orgId));
      for (const exp of expenseList) {
        try {
          await syncExpenseToQB(exp, accessToken, config.companyId);
          results.synced++;
          results.details.push(`✅ Expense $${exp.amount} synced`);
        } catch (e) {
          results.errors++;
          results.details.push(`❌ Expense $${exp.amount}: ${e}`);
        }
      }
    }

    // Sync customers
    if (syncType === "customers" || syncType === "all") {
      const customerList = await db.select().from(customers).where(eq(customers.orgId, user.orgId));
      for (const cust of customerList) {
        try {
          await syncCustomerToQB(cust, accessToken, config.companyId);
          results.synced++;
          results.details.push(`✅ Customer ${cust.name} synced`);
        } catch (e) {
          results.errors++;
          results.details.push(`❌ Customer ${cust.name}: ${e}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Sync complete: ${results.synced} synced, ${results.errors} errors`,
      ...results,
    });
  } catch (e) {
    return NextResponse.json({ error: `Sync failed: ${e}` }, { status: 500 });
  }
}
