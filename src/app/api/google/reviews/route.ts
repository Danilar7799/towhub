import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Google Business Profile Integration
 * POST /api/google/reviews — auto-reply to reviews
 * GET /api/google/reviews — list reviews
 * POST /api/google/webhook — receive new review notifications
 *
 * Requires Google Business Profile API credentials
 */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

interface GoogleReview {
  reviewId: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
}

// Auto-reply templates based on star rating
const REPLY_TEMPLATES: Record<string, (name: string) => string> = {
  FIVE: (name) => `Thank you so much, ${name}! We're thrilled you had a great experience with Pacific Towing. Your safety and satisfaction are our top priorities. We're always here if you need us! — Pacific Towing & Recovery Team`,
  FOUR: (name) => `Thank you for your feedback, ${name}! We appreciate you choosing Pacific Towing. We're always working to improve our service. If there's anything we can do better, please don't hesitate to reach out. — Pacific Towing & Recovery Team`,
  THREE: (name) => `Thank you for your review, ${name}. We appreciate your feedback and take it seriously. We'd love to learn more about your experience — please call us at (253) 350-3874 so we can address any concerns. — Pacific Towing & Recovery Team`,
  TWO: (name) => `We're sorry to hear about your experience, ${name}. This doesn't meet our standards. Please contact us directly at (253) 350-3874 so we can make this right. — Pacific Towing & Recovery Team`,
  ONE: (name) => `We sincerely apologize for your experience, ${name}. This is not the level of service we strive for. Please reach out to us at (253) 350-3874 — we want to understand what happened and make it right. — Pacific Towing & Recovery Team`,
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, reviewId, customReply } = body;

  if (action === "auto_reply") {
    // Auto-reply to a specific review
    const [org] = await db.select().from(organizations).where(eq(organizations.id, user.orgId || "")).limit(1);
    const googleConfig = (org?.settings as Record<string, unknown>)?.googleBusiness as Record<string, unknown>;

    if (!googleConfig?.locationId) {
      return NextResponse.json({ error: "Google Business Profile not configured" }, { status: 400 });
    }

    // In production, call Google Business Profile API
    // POST https://mybusiness.googleapis.com/v4/{locationId}/reviews/{reviewId}/reply
    return NextResponse.json({
      success: true,
      message: "Auto-reply sent",
      reviewId,
    });
  }

  if (action === "custom_reply") {
    if (!customReply || !reviewId) {
      return NextResponse.json({ error: "reviewId and customReply required" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Custom reply sent",
      reviewId,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // In production, fetch reviews from Google Business Profile API
  // GET https://mybusiness.googleapis.com/v4/{locationId}/reviews

  return NextResponse.json({
    reviews: [],
    totalReviewCount: 0,
    averageRating: 0,
    message: "Connect Google Business Profile to see reviews",
  });
}