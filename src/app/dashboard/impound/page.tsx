"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/lib/toast";

interface ImpoundVehicle {
  id: string; vehicleMake?: string; vehicleModel?: string; vehicleYear?: number; vehicleColor?: string;
  vehiclePlate?: string; vehicleVin?: string; ownerName?: string; ownerPhone?: string;
  lotSpot?: string; dailyRate: number; status: string; storedAt: string; totalCharges: number;
}
interface PoliceReport { id: string; impoundVehicleId: string; reportNumber?: string; department?: string; status: string; }
interface AuctionListing { id: string; title: string; auctionDate?: string; status: string; vehicleIds: string[]; }

export default function ImpoundPage() {
  const toast = useToast();
  const [vehicles, setVehicles] = useState<ImpoundVehicle[]>([]);
  const [reports, setReports] = useState<PoliceReport[]>([]);
  const [auctions, setAuctions] = useState<AuctionListing[]>([]);
  const [eligible, setEligible] = useState<ImpoundVehicle[]>([]);
  const [tab, setTab] = useState<"stored" | "released" | "police" | "auction">("stored");
  const [auctionDays, setAuctionDays] = useState(90);
  const [showPoliceForm, setShowPoliceForm] = useState<string | null>(null);
  const [policeForm, setPoliceForm] = useState({ department: "", officerName: "", officerBadge: "", reasonForTow: "", reportNumber: "", notes: "" });

  const loadVehicles = useCallback(async () => {
    const res = await fetch(`/api/impound?status=${tab === "police" || tab === "auction" ? "stored" : tab}`);
    const data = await res.json();
    setVehicles(data.vehicles || []);
  }, [tab]);

  const loadReports = async () => {
    const res = await fetch("/api/impound/police-reports");
    const data = await res.json();
    setReports(data.reports || []);
  };

  const loadEligible = async () => {
    const res = await fetch(`/api/impound/auction?eligible=${auctionDays}`);
    const data = await res.json();
    setEligible(data.eligibleVehicles || []);
  };

  useEffect(() => { loadVehicles(); loadReports(); loadEligible(); }, [loadVehicles, auctionDays]);

  const release = async (id: string) => {
    if (!confirm("Release this vehicle?")) return;
    await fetch("/api/impound", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "released" }) });
    loadVehicles();
  };

  const createPoliceReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPoliceForm) return;
    await fetch("/api/impound/police-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ impoundVehicleId: showPoliceForm, ...policeForm }) });
    setShowPoliceForm(null); setPoliceForm({ department: "", officerName: "", officerBadge: "", reasonForTow: "", reportNumber: "", notes: "" });
    loadReports();
  };

  const sendReport = async (id: string, method: string) => {
    await fetch("/api/impound/police-reports", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "sent", sentMethod: method }) });
    loadReports();
     toast.success(`Report sent via ${method}!`);
  };

  const createAuction = async () => {
    if (eligible.length === 0) return toast.error("No eligible vehicles for auction");
    await fetch("/api/impound/auction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      title: `Auction ${new Date().toLocaleDateString()}`,
      description: `${eligible.length} vehicles stored over ${auctionDays} days`,
      vehicleIds: eligible.map(v => v.id),
      location: "Main Lot",
    }) });
    loadVehicles(); loadEligible();
  };

  const daysStored = (d: string) => Math.ceil((Date.now() - new Date(d).getTime()) / 86400000);

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-[20px] font-semibold tracking-[-0.3px]">Impound Lot</h2><p className="text-[13px] text-[#64748d] mt-0.5">Storage tracking, police reports, auction management</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["stored", "released", "police", "auction"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded text-[12px] font-medium capitalize ${tab === t ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>{t === "police" ? "Police Reports" : t === "auction" ? "Auction" : t}</button>
        ))}
      </div>

      {/* Stored vehicles */}
      {tab === "stored" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Stored</div><div className="text-[28px] font-light">{vehicles.length}</div></div>
            <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Total Charges</div><div className="text-[28px] font-light">${vehicles.reduce((s, v) => s + (v.totalCharges || daysStored(v.storedAt) * v.dailyRate), 0).toFixed(0)}</div></div>
            <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Auction Eligible ({auctionDays}d+)</div><div className="text-[28px] font-light text-[#ea2261]">{eligible.length}</div></div>
          </div>

          {vehicles.length === 0 ? (
            <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center"><div className="text-[32px] mb-3 opacity-30">🅿️</div><div className="text-[14px] text-[#64748d]">No stored vehicles.</div></div>
          ) : vehicles.map(v => {
            const days = daysStored(v.storedAt);
            const charges = v.totalCharges || days * v.dailyRate;
            const hasReport = reports.some(r => r.impoundVehicleId === v.id);
            return (
              <div key={v.id} className="bg-white border border-[#e5edf5] rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[15px] font-semibold">{v.vehicleYear} {v.vehicleMake} {v.vehicleModel} {v.vehicleColor && `(${v.vehicleColor})`}</div>
                    <div className="text-[13px] text-[#64748d] mt-1 space-y-0.5">
                      {v.vehiclePlate && <div>Plate: <span className="font-mono">{v.vehiclePlate}</span></div>}
                      {v.vehicleVin && <div>VIN: <span className="font-mono">{v.vehicleVin}</span></div>}
                      {v.ownerName && <div>Owner: {v.ownerName} {v.ownerPhone && `• ${v.ownerPhone}`}</div>}
                      <div>Spot: {v.lotSpot || "—"} • Rate: ${v.dailyRate}/day</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[24px] font-light">${charges.toFixed(0)}</div>
                    <div className="text-[12px] text-[#64748d]">{days} days stored</div>
                    <div className="text-[11px] text-[#94a3b8]">{new Date(v.storedAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => release(v.id)} className="px-3 py-1.5 bg-[#15be53] text-white rounded text-[12px] font-medium">Release</button>
                  <button onClick={() => setShowPoliceForm(v.id)} className="px-3 py-1.5 bg-[#533afd] text-white rounded text-[12px] font-medium">{hasReport ? "View Report" : "Create Police Report"}</button>
                  {days >= auctionDays && <span className="px-3 py-1.5 bg-[#ea2261]/10 text-[#ea2261] rounded text-[12px] font-medium">Auction Eligible</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Released */}
      {tab === "released" && (
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          {vehicles.length === 0 ? <div className="p-12 text-center text-[13px] text-[#64748d]">No released vehicles.</div> : (
            <table className="w-full"><thead className="bg-[#f6f9fc]"><tr>{["Vehicle", "Plate", "Owner", "Days", "Charges", "Status"].map(h => <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#e5edf5]">{vehicles.map(v => <tr key={v.id}><td className="px-4 py-2.5 text-[13px]">{v.vehicleYear} {v.vehicleMake} {v.vehicleModel}</td><td className="px-4 py-2.5 font-mono text-[13px]">{v.vehiclePlate}</td><td className="px-4 py-2.5 text-[13px]">{v.ownerName}</td><td className="px-4 py-2.5 text-[13px]">{daysStored(v.storedAt)}</td><td className="px-4 py-2.5 text-[13px] font-medium">${(v.totalCharges || 0).toFixed(0)}</td><td className="px-4 py-2.5"><span className="text-[10px] bg-[#dcfce7] text-[#166534] px-1.5 py-0.5 rounded">Released</span></td></tr>)}</tbody></table>
          )}
        </div>
      )}

      {/* Police Reports */}
      {tab === "police" && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center"><div className="text-[32px] mb-3 opacity-30">🚔</div><div className="text-[14px] text-[#64748d]">No police reports yet. Create one from a stored vehicle.</div></div>
          ) : reports.map(r => (
            <div key={r.id} className="bg-white border border-[#e5edf5] rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-medium">Report #{r.reportNumber || r.id.slice(0, 8)}</div>
                  <div className="text-[12px] text-[#64748d]">Dept: {r.department || "—"} • Status: <span className="font-medium">{r.status}</span></div>
                </div>
                <div className="flex gap-2">
                  {r.status === "draft" && <>
                    <button onClick={() => sendReport(r.id, "email")} className="px-3 py-1.5 bg-[#533afd] text-white rounded text-[12px] font-medium">Send via Email</button>
                    <button onClick={() => sendReport(r.id, "fax")} className="px-3 py-1.5 bg-[#64748d] text-white rounded text-[12px] font-medium">Send via Fax</button>
                  </>}
                  {r.status === "sent" && <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-2 py-1 rounded font-medium">Sent ✓</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auction */}
      {tab === "auction" && (
        <div className="space-y-4">
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[14px] font-medium">Auction Eligibility</div>
                <div className="text-[12px] text-[#64748d]">Vehicles stored longer than threshold</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-[12px] text-[#64748d]">Days threshold:</label>
                  <input type="number" value={auctionDays} onChange={e => setAuctionDays(parseInt(e.target.value))} className="w-16 px-2 py-1 border border-[#e5edf5] rounded text-[13px] outline-none" />
                </div>
                <button onClick={createAuction} className="px-4 py-2 bg-[#ea2261] text-white rounded text-[12px] font-medium">Create Auction Listing</button>
              </div>
            </div>
            {eligible.length === 0 ? (
              <div className="text-center py-8 text-[13px] text-[#64748d]">No vehicles eligible for auction ({auctionDays}+ days stored)</div>
            ) : (
              <div className="space-y-2">
                {eligible.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg">
                    <div className="text-[13px] font-medium">{v.vehicleYear} {v.vehicleMake} {v.vehicleModel}</div>
                    <div className="flex items-center gap-4">
                      <span className="text-[12px] text-[#64748d] font-mono">{v.vehiclePlate}</span>
                      <span className="text-[12px] text-[#64748d] font-mono">{v.vehicleVin}</span>
                      <span className="text-[12px] font-medium">{daysStored(v.storedAt)} days</span>
                      <span className="text-[13px] font-semibold">${(daysStored(v.storedAt) * v.dailyRate).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Police Report Modal */}
      {showPoliceForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPoliceForm(null)}>
          <div className="bg-white rounded-lg max-w-md w-full p-8 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-semibold mb-6">Create Police Report</h2>
            <form onSubmit={createPoliceReport} className="space-y-3">
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Department *</label><input required value={policeForm.department} onChange={e => setPoliceForm(f => ({ ...f, department: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" placeholder="LAPD, CHP, etc." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Officer Name</label><input value={policeForm.officerName} onChange={e => setPoliceForm(f => ({ ...f, officerName: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Badge #</label><input value={policeForm.officerBadge} onChange={e => setPoliceForm(f => ({ ...f, officerBadge: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Reason for Tow</label><select value={policeForm.reasonForTow} onChange={e => setPoliceForm(f => ({ ...f, reasonForTow: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none"><option value="">Select...</option><option value="accident">Accident</option><option value="illegal_parking">Illegal Parking</option><option value="abandoned">Abandoned</option><option value="evidence">Evidence Hold</option><option value="repo">Repossession</option></select></div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Report #</label><input value={policeForm.reportNumber} onChange={e => setPoliceForm(f => ({ ...f, reportNumber: e.target.value }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPoliceForm(null)} className="flex-1 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium">Create Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
