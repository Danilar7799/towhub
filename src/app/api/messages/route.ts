import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { messages, users, organizations } from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

/*
 * In-app Messaging with Auto-translation
 *
 * POST /api/messages — send message
 * GET /api/messages?conversationId=xxx — get conversation
 * GET /api/messages/conversations — list all conversations
 *
 * Auto-translation: detects language and translates to recipient's preferred language.
 * Uses simple translation API or falls back to original text.
 */

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");

  if (conversationId) {
    // Get messages in conversation
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    return NextResponse.json({ messages: msgs });
  }

  // List conversations for this user
  const convos = await db.select().from(messages)
    .where(or(eq(messages.senderId, user.id), eq(messages.receiverId, user.id)))
    .orderBy(desc(messages.createdAt));

  // Group by conversation
  const conversationMap = new Map<string, typeof convos>();
  for (const msg of convos) {
    if (!conversationMap.has(msg.conversationId)) conversationMap.set(msg.conversationId, []);
    conversationMap.get(msg.conversationId)!.push(msg);
  }

  const conversations = Array.from(conversationMap.entries()).map(([id, msgs]) => ({
    id,
    lastMessage: msgs[0],
    unreadCount: msgs.filter(m => m.receiverId === user.id && !m.isRead).length,
    participants: [...new Set(msgs.map(m => m.senderId))],
  }));

  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { receiverId, jobId, text: messageText, conversationId } = await req.json();
  if (!messageText) return NextResponse.json({ error: "Message text required" }, { status: 400 });

  // Get receiver's preferred language
  const [receiver] = await db.select().from(users).where(eq(users.id, receiverId)).limit(1);
  const receiverLang = (receiver as typeof receiver & { preferredLanguage?: string })?.preferredLanguage || "en";
  const senderLang = (user as typeof user & { preferredLanguage?: string })?.preferredLanguage || "en";

  // Auto-translate if languages differ
  let translatedText = messageText;
  let detectedLanguage = senderLang;

  if (receiverLang !== senderLang) {
    translatedText = await translateText(messageText, senderLang, receiverLang);
  }

  const convoId = conversationId || [user.id, receiverId].sort().join("_");

  const [message] = await db.insert(messages).values({
    conversationId: convoId,
    senderId: user.id,
    receiverId,
    jobId: jobId || null,
    text: messageText,
    translatedText: translatedText !== messageText ? translatedText : null,
    detectedLanguage,
    targetLanguage: receiverLang,
    isTranslated: translatedText !== messageText,
  }).returning();

  return NextResponse.json({ message });
}

// Simple translation using LibreTranslate (free) or Google Translate
async function translateText(text: string, from: string, to: string): Promise<string> {
  try {
    // Try LibreTranslate (free, self-hosted)
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: from, target: to }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.translatedText || text;
    }
  } catch {}

  // Fallback: return original
  return text;
}
