import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { contracts, customers, subcontractors, organizations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/*
 * PDF Generation for Contracts
 * GET /api/contracts/[id]/pdf — generate contract HTML (print-to-PDF)
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [contract] = await db
    .select({
      id: contracts.id,
      contractType: contracts.contractType,
      status: contracts.status,
      title: contracts.title,
      description: contracts.description,
      terms: contracts.terms,
      ratePerMile: contracts.ratePerMile,
      flatRate: contracts.flatRate,
      monthlyRetainer: contracts.monthlyRetainer,
      commission: contracts.commission,
      startDate: contracts.startDate,
      endDate: contracts.endDate,
      renewalDate: contracts.renewalDate,
      notifyDaysBefore: contracts.notifyDaysBefore,
      isAutoRenew: contracts.isAutoRenew,
      notes: contracts.notes,
      documentUrl: contracts.documentUrl,
      createdAt: contracts.createdAt,
      updatedAt: contracts.updatedAt,
      // Party info
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerAddress: customers.address,
      customerCity: customers.city,
      customerState: customers.state,
      customerZip: customers.zip,
      subcontractorName: subcontractors.companyName,
      subcontractorEmail: subcontractors.email,
      subcontractorPhone: subcontractors.phone,
      subcontractorAddress: subcontractors.address,
      subcontractorCity: subcontractors.city,
      subcontractorState: subcontractors.state,
      subcontractorZip: subcontractors.zip,
      // Org info
      orgName: organizations.name,
      orgAddress: organizations.address,
      orgCity: organizations.city,
      orgState: organizations.state,
      orgZip: organizations.zip,
      orgPhone: organizations.phone,
      orgEmail: organizations.email,
    })
    .from(contracts)
    .leftJoin(customers, eq(contracts.customerId, customers.id))
    .leftJoin(subcontractors, eq(contracts.subcontractorId, subcontractors.id))
    .leftJoin(organizations, eq(contracts.orgId, organizations.id))
    .where(and(eq(contracts.id, id), eq(contracts.orgId, user.orgId)))
    .limit(1);

  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  const html = generateContractHTML(contract);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `inline; filename="contract-${contract.title.replace(/\s+/g, '-')}.html"`,
    },
  });
}

function generateContractHTML(c: any) {
  const STATUS_STYLES = {
    active: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
    expired: { bg: "#fef9c3", text: "#92400e", border: "#fde047" },
    terminated: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
    pending: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  };

  const party = c.contractType === "b2b" ? {
    name: c.subcontractorName || "—",
    email: c.subcontractorEmail || "—",
    phone: c.subcontractorPhone || "—",
    address: [c.subcontractorAddress, c.subcontractorCity, c.subcontractorState, c.subcontractorZip].filter(Boolean).join(", ") || "—",
  } : {
    name: c.customerName || "—",
    email: c.customerEmail || "—",
    phone: c.customerPhone || "—",
    address: [c.customerAddress, c.customerCity, c.customerState, c.customerZip].filter(Boolean).join(", ") || "—",
  };

  const s = STATUS_STYLES[c.status as keyof typeof STATUS_STYLES] || STATUS_STYLES.pending;

  const fmtDate = (d: string | Date | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contract ${c.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 40px; line-height: 1.6; }
    .header { display: flex; justify-content: space-between; margin-bottom: 32px; border-bottom: 2px solid #e5edf5; padding-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 700; color: #533afd; }
    .contract-title { font-size: 28px; font-weight: 300; color: #533afd; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .status-active { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .status-expired { background: #fef9c3; color: #92400e; border: 1px solid #fde047; }
    .status-terminated { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .status-pending { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 12px; border-bottom: 1px solid #e5edf5; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .label { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .value { font-size: 14px; font-weight: 500; color: #1a1a1a; }
    .party-box { background: #f8fafc; border: 1px solid #e5edf5; border-radius: 8px; padding: 16px; }
    .terms-box { background: #f6f9fc; border: 1px solid #e5edf5; border-radius: 8px; padding: 16px; font-size: 13px; color: #444; white-space: pre-wrap; }
    .rates-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .rates-table th { background: #f6f9fc; text-align: left; padding: 12px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #e5edf5; }
    .rates-table td { padding: 12px 16px; border-bottom: 1px solid #e5edf5; font-size: 14px; }
    .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5edf5; }
    .signature-block { text-align: center; }
    .signature-line { border-bottom: 1px solid #999; width: 240px; margin: 48px auto 8px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5edf5; text-align: center; font-size: 11px; color: #999; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🚛 ${c.orgName || 'TowHub'}</div>
      <div style="font-size: 12px; color: #666; margin-top: 4px;">Service Contract</div>
    </div>
    <div style="text-align: right;">
      <div class="contract-title">${c.contractType.toUpperCase()} CONTRACT</div>
      <div style="font-size: 13px; color: #666; margin-top: 8px;">${c.title}</div>
      <div style="margin-top: 12px;">
        <span class="status-badge ${c.status === 'active' ? 'status-active' : c.status === 'expired' ? 'status-expired' : c.status === 'terminated' ? 'status-terminated' : 'status-pending'}">${c.status.toUpperCase()}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Parties</div>
    <div class="grid">
      <div class="party-box">
        <div class="label">PROVIDER (TowHub Org)</div>
        <div class="value" style="margin-top: 4px;"><strong>${c.orgName || 'TowHub'}</strong></div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">${c.orgAddress || ''} ${c.orgCity || ''}, ${c.orgState || ''} ${c.orgZip || ''}</div>
        <div style="font-size: 12px; color: #666; margin-top: 2px;">${c.orgPhone || ''} | ${c.orgEmail || ''}</div>
      </div>
      <div class="party-box">
        <div class="label">${c.contractType === 'b2b' ? 'SUBCONTRACTOR' : 'CLIENT'}</div>
        <div class="value" style="margin-top: 4px;"><strong>${party.name}</strong></div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">${party.address}</div>
        <div style="font-size: 12px; color: #666; margin-top: 2px;">${party.phone} | ${party.email}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Contract Details</div>
    <div class="grid">
      <div>
        <div class="label">Type</div>
        <div class="value">${c.contractType.toUpperCase()}</div>
      </div>
      <div>
        <div class="label">Status</div>
        <div class="value">${c.status}</div>
      </div>
      <div>
        <div class="label">Start Date</div>
        <div class="value">${fmtDate(c.startDate)}</div>
      </div>
      <div>
        <div class="label">End Date</div>
        <div class="value">${fmtDate(c.endDate)}</div>
      </div>
      <div>
        <div class="label">Renewal Date</div>
        <div class="value">${fmtDate(c.renewalDate)}</div>
      </div>
      <div>
        <div class="label">Notify Before</div>
        <div class="value">${c.notifyDaysBefore} days</div>
      </div>
      <div>
        <div class="label">Auto Renew</div>
        <div class="value">${c.isAutoRenew ? 'Yes' : 'No'}</div>
      </div>
    </div>
  </div>

  ${(c.ratePerMile || c.flatRate || c.monthlyRetainer || c.commission) ? `
  <div class="section">
    <div class="section-title">Rates</div>
    <table class="rates-table">
      <thead>
        <tr>
          <th>Rate Type</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${c.ratePerMile ? `<tr><td>Per Mile</td><td>$${c.ratePerMile}/mi</td></tr>` : ''}
        ${c.flatRate ? `<tr><td>Flat Rate</td><td>$${c.flatRate}</td></tr>` : ''}
        ${c.monthlyRetainer ? `<tr><td>Monthly Retainer</td><td>$${c.monthlyRetainer}</td></tr>` : ''}
        ${c.commission ? `<tr><td>Commission</td><td>${c.commission}%</td></tr>` : ''}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${c.terms ? `
  <div class="section">
    <div class="section-title">Terms & Conditions</div>
    <div class="terms-box">${c.terms}</div>
  </div>
  ` : ''}

  ${c.notes ? `
  <div class="section">
    <div class="section-title">Notes</div>
    <div class="terms-box">${c.notes}</div>
  </div>
  ` : ''}

  <div class="signature-section">
    <div class="signature-block">
      <div class="signature-line"></div>
      <div><strong>${c.orgName || 'TowHub'}</strong></div>
      <div style="font-size: 11px; color: #666;">Authorized Signature</div>
      <div style="font-size: 11px; color: #999; margin-top: 4px;">Date: _______________</div>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <div><strong>${party.name}</strong></div>
      <div style="font-size: 11px; color: #666;">Authorized Signature</div>
      <div style="font-size: 11px; color: #999; margin-top: 4px;">Date: _______________</div>
    </div>
  </div>

  <div class="footer no-print">
    <div>${c.orgName || 'TowHub'} — Contract ${c.title}</div>
    <div style="margin-top: 4px;">Generated ${new Date().toLocaleString()} • Contract ID: ${c.id}</div>
  </div>

  <script>window.print();</script>
</body>
</html>`;
}

function fmtDate(d: string | Date | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}