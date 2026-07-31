import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { inspections, jobs, users, vehicles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * PDF Generation for Inspections
 * GET /api/inspections/[id]/pdf — generate inspection report HTML (print-to-PDF)
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [inspection] = await db
    .select({
      id: inspections.id,
      jobId: inspections.jobId,
      vehicle: inspections.vehicle,
      date: inspections.date,
      status: inspections.status,
      exterior: inspections.exterior,
      interior: inspections.interior,
      damageNotes: inspections.damageNotes,
      odometer: inspections.odometer,
      fuelLevel: inspections.fuelLevel,
      hasSignature: inspections.hasSignature,
      createdBy: inspections.createdBy,
      createdAt: inspections.createdAt,
      // Job info
      jobPickup: jobs.pickupAddress,
      jobDestination: jobs.destinationAddress,
      // Driver info
      driverName: users.firstName,
      driverLastName: users.lastName,
    })
    .from(inspections)
    .leftJoin(jobs, eq(inspections.jobId, jobs.id))
    .leftJoin(users, eq(inspections.createdBy, users.id))
    .where(and(eq(inspections.id, id), eq(inspections.orgId, user.orgId)))
    .limit(1);

  if (!inspection) return NextResponse.json({ error: "Inspection not found" }, { status: 404 });

  const html = generateInspectionHTML(inspection);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="inspection-${id}.html"`,
    },
  });
}

function generateInspectionHTML(insp: any) {
  const STATUS_COLORS = {
    completed: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
    draft: { bg: "#fef9c3", text: "#92400e", border: "#fde047" },
  };
  const FUEL_LABELS = ["Empty", "¼", "½", "¾", "Full"];
  const s = STATUS_COLORS[insp.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.draft;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Inspection Report ${insp.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 40px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; margin-bottom: 32px; border-bottom: 2px solid #e5edf5; padding-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 700; color: #533afd; }
    .report-title { font-size: 28px; font-weight: 300; color: #533afd; }
    .company-info { text-align: right; }
    .company-name { font-size: 16px; font-weight: 600; }
    .company-detail { font-size: 12px; color: #666; margin-top: 4px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 12px; border-bottom: 1px solid #e5edf5; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .value { font-size: 14px; font-weight: 500; color: #1a1a1a; }
    .checklist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .checklist-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8fafc; border: 1px solid #e5edf5; border-radius: 8px; }
    .checklist-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .checklist-label { font-size: 13px; font-weight: 500; color: #1a1a1a; }
    .checklist-status { font-size: 11px; color: #666; margin-left: auto; text-transform: capitalize; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .notes-box { background: #f6f9fc; border: 1px solid #e5edf5; border-radius: 8px; padding: 16px; font-size: 13px; color: #444; white-space: pre-wrap; }
    .signature-box { border: 2px dashed #e5edf5; border-radius: 8px; min-height: 100px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 13px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5edf5; text-align: center; font-size: 11px; color: #999; }
    .status-completed { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .status-draft { background: #fef9c3; color: #92400e; border: 1px solid #fde047; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🚛 TowHub</div>
      <div style="font-size: 12px; color: #666; margin-top: 4px;">Vehicle Inspection Report</div>
    </div>
    <div style="text-align: right;">
      <div class="report-title">INSPECTION REPORT</div>
      <div style="font-size: 13px; color: #666; margin-top: 8px;">#${insp.id.slice(0, 8)}</div>
      <div style="margin-top: 12px;">
        <span class="status-badge ${insp.status === 'completed' ? 'status-completed' : 'status-draft'}">${insp.status.toUpperCase()}</span>
      </div>
    </div>
  </div>

  <div class="grid">
    <div class="section">
      <div class="section-title">Job & Vehicle</div>
      <div class="label">Job ID</div>
      <div class="value">${insp.jobId || '—'}</div>
      <div class="label" style="margin-top: 12px;">Vehicle</div>
      <div class="value">${insp.vehicle || '—'}</div>
      <div class="label" style="margin-top: 12px;">Date</div>
      <div class="value">${new Date(insp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
    </div>
    <div class="section">
      <div class="section-title">Location</div>
      <div class="label">Pickup</div>
      <div class="value">${insp.jobPickup || '—'}</div>
      <div class="label" style="margin-top: 12px;">Destination</div>
      <div class="value">${insp.jobDestination || '—'}</div>
    </div>
    <div class="section">
      <div class="section-title">Inspector</div>
      <div class="label">Name</div>
      <div class="value">${insp.driverName ? `${insp.driverName} ${insp.driverLastName}` : '—'}</div>
      <div class="label" style="margin-top: 12px;">Date</div>
      <div class="value">${new Date(insp.createdAt).toLocaleDateString()}</div>
      <div class="label" style="margin-top: 12px;">Status</div>
      <div class="value">${insp.status}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Vehicle Readings</div>
    <div class="grid-2">
      <div>
        <div class="label">Odometer</div>
        <div class="value">${insp.odometer || '—'}</div>
      </div>
      <div>
        <div class="label">Fuel Level</div>
        <div class="value">${insp.fuelLevel !== undefined ? ['Empty', '¼', '½', '¾', 'Full'][insp.fuelLevel] : '—'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Exterior Condition</div>
    <div class="checklist-grid">
      ${insp.exterior?.map((item: any) => `
        <div class="checklist-item">
          <span class="checklist-dot" style="background: ${item.status === 'good' ? '#10b981' : item.status === 'damaged' ? '#ef4444' : item.status === 'missing' ? '#f59e0b' : '#999'}"></span>
          <span class="checklist-label">${item.label}</span>
          <span class="checklist-status">${item.status || '—'}</span>
        </div>
      `).join('') || '<div class="checklist-item"><span class="checklist-label">No data</span></div>'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Interior Condition</div>
    <div class="checklist-grid">
      ${insp.interior?.map((item: any) => `
        <div class="checklist-item">
          <span class="checklist-dot" style="background: ${item.status === 'good' ? '#10b981' : item.status === 'damaged' ? '#ef4444' : item.status === 'missing' ? '#f59e0b' : '#999'}"></span>
          <span class="checklist-label">${item.label}</span>
          <span class="checklist-status">${item.status || '—'}</span>
        </div>
      `).join('') || '<div class="checklist-item"><span class="checklist-label">No data</span></div>'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Pre-Existing Damage Notes</div>
    <div class="notes-box">${insp.damageNotes || 'No damage notes recorded.'}</div>
  </div>

  <div class="section">
    <div class="section-title">Customer Signature</div>
    ${insp.hasSignature ? '<div class="signature-box" style="border-style: solid; border-color: #533afd; color: #533afd;">✓ Signature captured</div>' : '<div class="signature-box">No signature captured</div>'}
  </div>

  <div class="footer no-print">
    <div>TowHub — Vehicle Inspection Report</div>
    <div style="margin-top: 4px;">Generated ${new Date().toLocaleString()} • Report ID: ${insp.id}</div>
  </div>

  <script>window.print();</script>
</body>
</html>`;
}