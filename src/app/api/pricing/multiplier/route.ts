import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * GET /api/pricing/multiplier
 * Returns the current effective pricing multiplier based on org settings + current time
 */

interface PricingRule {
  id: string;
  name: string;
  type: "time_range" | "day_of_week" | "date_range";
  multiplier: number;
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  days?: number[];
  startDate?: string;
  endDate?: string;
}

function getCurrentMultiplier(rules: PricingRule[]): { multiplier: number; activeRules: string[] } {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay();
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const monthDay = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  let maxMult = 1;
  const activeRules: string[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    let applies = false;

    if (rule.type === "time_range" && rule.startTime && rule.endTime) {
      if (rule.startTime <= rule.endTime) {
        applies = timeStr >= rule.startTime && timeStr <= rule.endTime;
      } else {
        // Overnight range (e.g. 18:00 - 06:00)
        applies = timeStr >= rule.startTime || timeStr <= rule.endTime;
      }
    }

    if (rule.type === "day_of_week" && rule.days) {
      applies = rule.days.includes(day);
    }

    if (rule.type === "date_range" && rule.startDate && rule.endDate) {
      if (rule.startDate <= rule.endDate) {
        applies = monthDay >= rule.startDate && monthDay <= rule.endDate;
      } else {
        // Cross-year range (e.g. 12-20 - 01-02)
        applies = monthDay >= rule.startDate || monthDay <= rule.endDate;
      }
    }

    if (applies && rule.multiplier > maxMult) {
      maxMult = rule.multiplier;
      activeRules.push(rule.name);
    }
  }

  return { multiplier: maxMult, activeRules };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [org] = await db.select({ settings: organizations.settings }).from(organizations).where(eq(organizations.id, user.orgId)).limit(1);
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const settings = org.settings as Record<string, unknown> | null;
  const rules: PricingRule[] = (settings?.pricingRules as PricingRule[]) || [];

  const { multiplier, activeRules } = getCurrentMultiplier(rules);

  return NextResponse.json({
    multiplier,
    activeRules,
    isSurge: multiplier > 1,
    surgePercent: Math.round((multiplier - 1) * 100),
    rules: rules.filter(r => r.enabled),
  });
}
