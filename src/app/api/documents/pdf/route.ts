import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { jobs, organizations, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/*
 * PDF Documents API
 * GET /api/documents/pdf?type=bol&jobId=xxx — Bill of Lading
 * GET /api/documents/pdf?type=release&jobId=xxx — Release Form
 * GET /api/documents/pdf?type=auction&jobId=xxx — Auction Package
 */

function generateBOL(job: Record<string, unknown>, org: Record<string, unknown>): string {
  const j = job as any;
  const o = org as any;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: 'Source Sans 3', Arial, sans-serif; font-size: 12px; color: #061b31; margin: 40px; }
    h1 { font-size: 22px; font-weight: 300; letter-spacing: -0.3px; margin-bottom: 4px; }
    h2 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; color: #533afd; text-transform: uppercase; letter-spacing: 0.05em; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #533afd; padding-bottom: 16px; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: 300; color: #533afd; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .field { margin-bottom: 8px; }
    .label { font-size: 10px; color: #64748d; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
    .value { font-size: 13px; font-weight: 500; }
    .signature-box { border: 1px solid #e5edf5; border-radius: 4px; height: 80px; margin-top: 8px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5edf5; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print { body { margin: 20px; } }
  </style></head><body>
    <div class="header">
      <div>
        <div class="logo">${o.name || "TowHub"}</div>
        <div style="font-size: 11px; color: #64748d;">Bill of Lading</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; color: #64748d;">BOL #</div>
        <div style="font-size: 14px; font-weight: 600;">${String(j.id).slice(0, 8).toUpperCase()}</div>
        <div style="font-size: 11px; color: #64748d; margin-top: 4px;">${new Date(j.createdAt).toLocaleDateString()}</div>
      </div>
    </div>

    <h2>Carrier Information</h2>
    <div class="info-grid">
      <div class="field"><div class="label">Company</div><div class="value">${o.name || "—"}</div></div>
      <div class="field"><div class="label">USDOT</div><div class="value">${o.settings?.usdot || "—"}</div></div>
      <div class="field"><div class="label">Address</div><div class="value">${o.settings?.address || "—"}</div></div>
      <div class="field"><div class="label">Phone</div><div class="value">${o.settings?.phone || "—"}</div></div>
    </div>

    <h2>Shipper / Customer</h2>
    <div class="info-grid">
      <div class="field"><div class="label">Name</div><div class="value">${j.customerName || "—"}</div></div>
      <div class="field"><div class="label">Phone</div><div class="value">${j.customerPhone || "—"}</div></div>
    </div>

    <h2>Vehicle Description</h2>
    <div class="info-grid">
      <div class="field"><div class="label">Year/Make/Model</div><div class="value">${[j.towVehicleYear, j.towVehicleMake, j.towVehicleModel].filter(Boolean).join(" ") || "—"}</div></div>
      <div class="field"><div class="label">Color</div><div class="value">${j.towVehicleColor || "—"}</div></div>
      <div class="field"><div class="label">License Plate</div><div class="value">${j.towVehiclePlate || "—"}</div></div>
      <div class="field"><div class="label">VIN</div><div class="value">${j.towVehicleVin || "—"}</div></div>
    </div>

    <h2>Transport Details</h2>
    <div class="info-grid">
      <div class="field"><div class="label">Origin</div><div class="value">${j.pickupAddress || "—"}</div></div>
      <div class="field"><div class="label">Destination</div><div class="value">${j.destinationAddress || "—"}</div></div>
      <div class="field"><div class="label">Estimated Miles</div><div class="value">${j.estimatedMiles || "—"}</div></div>
      <div class="field"><div class="label">Service Type</div><div class="value">${j.serviceType || "Standard Tow"}</div></div>
    </div>

    <h2>Charges</h2>
    <div class="info-grid">
      <div class="field"><div class="label">Base Rate</div><div class="value">$${j.baseRate || "0.00"}</div></div>
      <div class="field"><div class="label">Mileage</div><div class="value">$${j.mileageRate || "0.00"}/mi</div></div>
      <div class="field"><div class="label">Total</div><div class="value" style="font-size: 16px; color: #533afd;">$${j.totalAmount || "0.00"}</div></div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px;">
      <div>
        <div class="label">Shipper Signature</div>
        <div class="signature-box"></div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Date: _______________</div>
      </div>
      <div>
        <div class="label">Carrier Signature</div>
        <div class="signature-box"></div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Date: _______________</div>
      </div>
    </div>

    <div class="footer">
      This Bill of Lading is a legally binding document. Generated by TowHub — ${new Date().toLocaleString()}
    </div>
  </body></html>`;
}

function generateRelease(job: Record<string, unknown>, org: Record<string, unknown>): string {
  const j = job as any;
  const o = org as any;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: 'Source Sans 3', Arial, sans-serif; font-size: 12px; color: #061b31; margin: 40px; line-height: 1.6; }
    h1 { font-size: 20px; font-weight: 300; letter-spacing: -0.3px; border-bottom: 2px solid #533afd; padding-bottom: 12px; }
    h2 { font-size: 13px; font-weight: 600; margin: 20px 0 8px; color: #533afd; text-transform: uppercase; }
    .field { margin-bottom: 6px; }
    .label { font-size: 10px; color: #64748d; text-transform: uppercase; }
    .value { font-weight: 500; }
    .signature-box { border: 1px solid #e5edf5; border-radius: 4px; height: 60px; margin-top: 8px; }
    .legal { font-size: 11px; color: #64748d; margin: 16px 0; }
    @media print { body { margin: 20px; } }
  </style></head><body>
    <h1>Vehicle Release Form</h1>
    <p style="font-size: 11px; color: #64748d;">${o.name || "TowHub"} • ${o.settings?.address || ""}</p>

    <h2>Job Information</h2>
    <div class="field"><span class="label">Job ID: </span><span class="value">#${String(j.id).slice(0, 8).toUpperCase()}</span> • <span class="label">Date: </span><span class="value">${new Date(j.createdAt).toLocaleDateString()}</span></div>

    <h2>Vehicle Owner</h2>
    <div class="field"><span class="label">Name: </span><span class="value">${j.customerName || "—"}</span></div>
    <div class="field"><span class="label">Phone: </span><span class="value">${j.customerPhone || "—"}</span></div>

    <h2>Vehicle</h2>
    <div class="field"><span class="label">Vehicle: </span><span class="value">${[j.towVehicleYear, j.towVehicleMake, j.towVehicleModel].filter(Boolean).join(" ") || "—"}</span></div>
    <div class="field"><span class="label">Plate: </span><span class="value">${j.towVehiclePlate || "—"}</span> • <span class="label">Color: </span><span class="value">${j.towVehicleColor || "—"}</span></div>

    <h2>Release Statement</h2>
    <p class="legal">I, the undersigned, hereby authorize the release of the above-described vehicle from the possession of ${o.name || "the towing company"}. I confirm that I am the legal owner or authorized representative of said vehicle. I acknowledge that the vehicle is being released in its current condition and release ${o.name || "the towing company"} from any further liability related to this tow service.</p>

    <h2>Charges</h2>
    <div class="field"><span class="label">Total: </span><span class="value" style="font-size: 16px; color: #533afd;">$${j.totalAmount || "0.00"}</span> • <span class="label">Paid: </span><span class="value">${j.isPaid ? "Yes" : "No"}</span></div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px;">
      <div>
        <div class="label">Owner Signature</div>
        <div class="signature-box"></div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Print Name: _______________</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Date: _______________</div>
      </div>
      <div>
        <div class="label">Authorized By</div>
        <div class="signature-box"></div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Print Name: _______________</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Date: _______________</div>
      </div>
    </div>
  </body></html>`;
}

function generateAuction(job: Record<string, unknown>, org: Record<string, unknown>): string {
  const j = job as any;
  const o = org as any;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: 'Source Sans 3', Arial, sans-serif; font-size: 12px; color: #061b31; margin: 40px; }
    h1 { font-size: 20px; font-weight: 300; border-bottom: 2px solid #533afd; padding-bottom: 12px; }
    h2 { font-size: 13px; font-weight: 600; margin: 20px 0 8px; color: #533afd; text-transform: uppercase; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .field { margin-bottom: 6px; }
    .label { font-size: 10px; color: #64748d; text-transform: uppercase; letter-spacing: 0.08em; }
    .value { font-weight: 500; }
    .photo-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 12px 0; }
    .photo-placeholder { border: 1px dashed #e5edf5; border-radius: 4px; height: 120px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5edf5; font-size: 10px; color: #94a3b8; }
    @media print { body { margin: 20px; } }
  </style></head><body>
    <h1>Auction Package</h1>
    <p style="font-size: 11px; color: #64748d;">Prepared by ${o.name || "TowHub"} • ${new Date().toLocaleDateString()}</p>

    <h2>Vehicle Information</h2>
    <div class="info-grid">
      <div class="field"><div class="label">Year/Make/Model</div><div class="value">${[j.towVehicleYear, j.towVehicleMake, j.towVehicleModel].filter(Boolean).join(" ") || "—"}</div></div>
      <div class="field"><div class="label">Color</div><div class="value">${j.towVehicleColor || "—"}</div></div>
      <div class="field"><div class="label">License Plate</div><div class="value">${j.towVehiclePlate || "—"}</div></div>
      <div class="field"><div class="label">VIN</div><div class="value">${j.towVehicleVin || "—"}</div></div>
      <div class="field"><div class="label">Odometer</div><div class="value">${j.odometer || "—"}</div></div>
      <div class="field"><div class="label">Condition</div><div class="value">${j.vehicleCondition || "—"}</div></div>
    </div>

    <h2>Vehicle Photos</h2>
    <div class="photo-grid">
      <div class="photo-placeholder">Front</div>
      <div class="photo-placeholder">Rear</div>
      <div class="photo-placeholder">Driver Side</div>
      <div class="photo-placeholder">Passenger Side</div>
      <div class="photo-placeholder">Interior</div>
      <div class="photo-placeholder">Damage</div>
    </div>

    <h2>Tow Details</h2>
    <div class="info-grid">
      <div class="field"><div class="label">Pickup Location</div><div class="value">${j.pickupAddress || "—"}</div></div>
      <div class="field"><div class="label">Tow Date</div><div class="value">${new Date(j.createdAt).toLocaleDateString()}</div></div>
      <div class="field"><div class="label">Reason for Tow</div><div class="value">${j.notes?.split("\n")[0] || "—"}</div></div>
      <div class="field"><div class="label">Storage Location</div><div class="value">${j.storageAddress || o.settings?.address || "—"}</div></div>
    </div>

    <h2>Owner Information</h2>
    <div class="info-grid">
      <div class="field"><div class="label">Owner Name</div><div class="value">${j.customerName || "Unknown"}</div></div>
      <div class="field"><div class="label">Phone</div><div class="value">${j.customerPhone || "—"}</div></div>
    </div>

    <h2>Liens & Notices</h2>
    <div class="field"><div class="label">Lien Sale Notice Sent</div><div class="value">☐ Yes  ☐ No</div></div>
    <div class="field"><div class="label">Notice Date</div><div class="value">_______________</div></div>
    <div class="field"><div class="label">Auction Eligible Date</div><div class="value">_______________</div></div>

    <div class="footer">
      This document is prepared for auction purposes. All information is provided as-is. Generated by TowHub — ${new Date().toLocaleString()}
    </div>
  </body></html>`;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "bol";
  const jobId = searchParams.get("jobId");

  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const [org] = await db.select().from(organizations).where(eq(organizations.id, job.orgId)).limit(1);

  let html = "";
  let filename = "";

  switch (type) {
    case "bol":
      html = generateBOL(job, org || {});
      filename = `BOL-${String(jobId).slice(0, 8)}.html`;
      break;
    case "release":
      html = generateRelease(job, org || {});
      filename = `Release-${String(jobId).slice(0, 8)}.html`;
      break;
    case "auction":
      html = generateAuction(job, org || {});
      filename = `Auction-${String(jobId).slice(0, 8)}.html`;
      break;
    default:
      return NextResponse.json({ error: "Invalid type. Use: bol, release, auction" }, { status: 400 });
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}