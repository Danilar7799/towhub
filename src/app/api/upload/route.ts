import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { documents, driverDocuments, vehicleDocuments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * Document Upload API
 * POST /api/upload?type=documents|driver_documents|vehicle_documents
 * multipart/form-data: file, name, description, type, jobId, vehicleId, customerId, driverId
 * 
 * Returns: { ok: true, document: {...}, fileUrl: string }
 */

// In production: use S3/R2 presigned PUT URL
// For now: save to local /public/uploads (dev only)
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const docType = searchParams.get("type") || "documents"; // documents | driver_documents | vehicle_documents

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const documentType = formData.get("documentType") as string; // enum value
    const jobId = formData.get("jobId") as string;
    const vehicleId = formData.get("vehicleId") as string;
    const customerId = formData.get("customerId") as string;
    const driverId = formData.get("driverId") as string;

    if (!file || !name || !documentType) {
      return NextResponse.json({ error: "file, name, and documentType are required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type ${file.type} not allowed` }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    // Ensure upload dir exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Generate unique filename
    const ext = file.name.split(".").pop() || "";
    const fileName = `${randomUUID()}.${ext}`;
    const filePath = join(UPLOAD_DIR, fileName);
    const fileUrl = `/uploads/${fileName}`;

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Create DB record
    let doc;
    if (docType === "driver_documents") {
      const [created] = await db.insert(driverDocuments).values({
        orgId: user.orgId,
        driverId: driverId || user.id,
        type: documentType as any,
        fileUrl,
        issuedAt: new Date(), // could parse from form
        createdBy: user.id,
      }).returning();
      doc = created;
    } else if (docType === "vehicle_documents") {
      const [created] = await db.insert(vehicleDocuments).values({
        orgId: user.orgId,
        vehicleId: vehicleId!,
        type: documentType as any,
        fileUrl,
        issuedAt: new Date(),
        createdBy: user.id,
      }).returning();
      doc = created;
    } else {
      const [created] = await db.insert(documents).values({
        orgId: user.orgId,
        type: documentType as any,
        name,
        description: description || null,
        fileUrl,
        mimeType: file.type,
        size: file.size,
        jobId: jobId || null,
        vehicleId: vehicleId || null,
        customerId: customerId || null,
        driverId: driverId || null,
        createdBy: user.id,
      }).returning();
      doc = created;
    }

    return NextResponse.json({ ok: true, document: doc, fileUrl });
  } catch (err) {
    console.error("[Upload] Error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}