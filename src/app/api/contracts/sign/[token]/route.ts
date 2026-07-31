import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contracts } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * Contract Signing API
 * GET /api/contracts/sign/[token] — get contract for signing
 * POST /api/contracts/sign/[token] — submit signature
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Token is the contract ID (simplified — in production use a signed token)
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, token))
    .limit(1);

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  return NextResponse.json({
    contract: {
      id: contract.id,
      title: contract.title,
      contractType: contract.contractType,
      terms: contract.terms,
      startDate: contract.startDate,
      endDate: contract.endDate,
      partyName: contract.title, // Simplified
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { signerName, signatureData, signedAt } = body;

  if (!signerName || !signatureData) {
    return NextResponse.json({ error: "signerName and signatureData required" }, { status: 400 });
  }

  // Find contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, token))
    .limit(1);

  if (!contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  // Update contract with signature
  await db.update(contracts).set({
    status: "active",
    notes: `${contract.notes || ""}\n\nSigned by: ${signerName}\nSigned at: ${signedAt}\nSignature: ${signatureData.substring(0, 100)}...`,
    updatedAt: new Date(),
  }).where(eq(contracts.id, token));

  return NextResponse.json({
    success: true,
    message: "Contract signed successfully",
  });
}