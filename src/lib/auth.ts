import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "towhub-secret";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  orgId: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("towhub_token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (!user || !user.isActive) return null;

  let org = null;
  if (user.orgId) {
    const [orgData] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, user.orgId))
      .limit(1);
    org = orgData;
  }

  return { ...user, organization: org };
}

export function requireAuth(handler: Function) {
  return async (req: Request, ctx?: unknown) => {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, ctx, user);
  };
}

export function requireRole(...roles: string[]) {
  return (handler: Function) => {
    return async (req: Request, ctx?: unknown) => {
      const user = await getCurrentUser();
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!roles.includes(user.role)) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      return handler(req, ctx, user);
    };
  };
}
