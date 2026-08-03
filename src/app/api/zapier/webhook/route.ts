import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs, callLogs, organizations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/*
 * Zapier/Make Webhook Integration
 * POST /api/zapier/webhook — outgoing webhooks to Zapier/Make
 * GET /api/zapier/webhook — list available triggers
 *
 * Triggers: new_job, job_completed, new_call, new_invoice
 */

const ZAPIER_HOOKS: Record<string, string> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, hookUrl, orgId, data } = body;

    if (action === "register") {
      // Register a Zapier webhook URL
      if (!hookUrl || !orgId) {
        return NextResponse.json({ error: "hookUrl and orgId required" }, { status: 400 });
      }
      const key = `${orgId}:${Date.now()}`;
      ZAPIER_HOOKS[key] = hookUrl;
      return NextResponse.json({ success: true, key, message: "Webhook registered" });
    }

    if (action === "trigger") {
      // Trigger a webhook
      const { triggerType, payload } = data || {};
      if (!triggerType || !orgId) {
        return NextResponse.json({ error: "triggerType and orgId required" }, { status: 400 });
      }

      // Find registered hooks for this org
      const hooks = Object.entries(ZAPIER_HOOKS).filter(([k]) => k.startsWith(orgId));
      const results = [];

      for (const [key, url] of hooks) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trigger: triggerType,
              timestamp: new Date().toISOString(),
              data: payload,
            }),
          });
          results.push({ hook: key, status: res.status });
        } catch (err) {
          results.push({ hook: key, error: String(err) });
        }
      }

      return NextResponse.json({ success: true, triggered: results.length, results });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    triggers: [
      { type: "new_job", description: "When a new job is created" },
      { type: "job_status_changed", description: "When a job status changes" },
      { type: "job_completed", description: "When a job is completed" },
      { type: "new_call", description: "When an AI call is completed" },
      { type: "new_invoice", description: "When an invoice is created" },
      { type: "payment_received", description: "When a payment is received" },
      { type: "driver_assigned", description: "When a driver is assigned to a job" },
    ],
    webhook_url: "/api/zapier/webhook",
    instructions: "Create a Zap in Zapier.com → Webhooks by Zapier → Catch Hook → paste the URL above",
  });
}