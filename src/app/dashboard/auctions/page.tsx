"use client";

import { useState, useEffect } from "react";

interface VehicleListing {
  id: string; platform: string; platformIcon: string; title: string;
  year: number; make: string; model: string; vin?: string;
  odometer?: number; damageType?: string; titleType?: string;
  exteriorColor?: string; currentBid?: number; buyNowPrice?: number;
  auctionDate?: string; auctionLocation?: string; detailUrl?: string;
  status: "available" | "upcoming" | "sold" | "passed"; lotNumber?: string;
}

const PLATFORMS = [
  { id: "all", label: "All Platforms", icon: "🌐" },
  { id: "copart", label: "Copart", icon: "🔨" },
  { id: "iaa", label: "IAA", icon: "🚗" },
  { id: "manheim", label: "Manheim", icon: "🏷️" },
  { id: "adesa", label: "ADESA", icon: "🌐" },
  { id: "backlotcars", label: "BacklotCars", icon: "📸" },
  { id: "pipeline", label: "Pipeline", icon: "🏗️" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  available: { bg: "bg-[#dcfce7]", text: "text-[#166534]", border: "border-[#bbf7d0]" },
  upcoming: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", border: "border-[#bfdbfe]" },
  sold: { bg: "bg-[#f6f9fc]", text: "text-[#94a3b8]", border: "border-[#e5edf5]" },
  passed: { bg: "bg-[#fef2f2]", text: "text-[#991b1b]", border: "border-[#fecaca]" },
};

export default function AuctionsPage() {
  const [results, setResults] = useState<VehicleListing[]>([]);
  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState("all");
  const [titleFilter, setTitleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | undefined>();
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleListing | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (platform !== "all") params.set("platform", platform);
      if (titleFilter) params.set("title", titleFilter);
      const res = await fetch(`/api/auctions?${params}`);
      const data = await res.json();
      setResults(data.results || []);
      setNote(data.note);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [platform, titleFilter]);

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Auction Aggregator</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Search vehicles across Copart, IAA, Manheim, ADESA, and more</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-[#533afd]/[0.06] text-[#533afd]" : "text-[#94a3b8]"}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
          </button>
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-[#533afd]/[0.06] text-[#533afd]" : "text-[#94a3b8]"}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          </button>
        </div>
      </div>

      {/* Demo data notice */}
      {note && (
        <div className="bg-[#fef3c7] border border-[#fde68a] rounded-lg p-3 flex items-center gap-2">
          <span className="text-[14px]">⚠️</span>
          <span className="text-[12px] text-[#92400e]">{note}</span>
          <a href="/dashboard/settings" className="text-[12px] text-[#533afd] font-medium ml-auto hover:underline">Connect platforms →</a>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Search by make, model, VIN, or keyword..."
            className="w-full pl-10 pr-4 py-2.5 border border-[#e5edf5] rounded-lg text-[13px] focus:border-[#533afd] outline-none"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>
        <select value={titleFilter} onChange={e => setTitleFilter(e.target.value)} className="px-3 py-2.5 border border-[#e5edf5] rounded-lg text-[13px] focus:border-[#533afd] outline-none">
          <option value="">All Titles</option>
          <option value="clean">Clean Title</option>
          <option value="salvage">Salvage</option>
          <option value="rebuilt">Rebuilt</option>
          <option value="parts only">Parts Only</option>
        </select>
        <button onClick={load} className="bg-[#533afd] text-white px-5 py-2.5 rounded-lg text-[13px] font-medium hover:bg-[#4434d4]">
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Platform filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => setPlatform(p.id)}
            className={`px-3 py-1.5 rounded text-[12px] font-medium whitespace-nowrap flex items-center gap-1.5 ${
              platform === p.id ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"
            }`}>
            <span>{p.icon}</span> {p.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-[13px] text-[#64748d]">
        {loading ? "Searching..." : `${results.length} vehicles found`}
      </div>

      {/* Results Grid */}
      {viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map(v => {
            const s = STATUS_STYLES[v.status] || STATUS_STYLES.available;
            return (
              <div key={v.id} onClick={() => setSelectedVehicle(v)}
                className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden cursor-pointer hover:border-[#b9b9f9] hover:shadow-[0_4px_12px_rgba(50,50,93,0.06)] transition-all">
                {/* Image placeholder */}
                <div className="h-[140px] bg-[#f6f9fc] flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-[28px] mb-1">{v.platformIcon}</div>
                    <div className="text-[10px] text-[#94a3b8] uppercase font-medium">{v.platform}</div>
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${s.bg} ${s.text} ${s.border}`}>{v.status}</span>
                    {v.titleType && <span className="text-[9px] bg-[#f6f9fc] text-[#64748d] px-1.5 py-0.5 rounded border border-[#e5edf5]">{v.titleType}</span>}
                    <span className="text-[9px] text-[#94a3b8] ml-auto">Lot #{v.lotNumber}</span>
                  </div>
                  <div className="text-[13px] font-medium text-[#061b31] truncate">{v.title}</div>
                  <div className="text-[11px] text-[#64748d] mt-0.5">
                    {v.odometer ? `${(v.odometer / 1000).toFixed(0)}K mi` : "—"} • {v.damageType || "—"} • {v.exteriorColor || "—"}
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[#e5edf5]">
                    <div>
                      {v.currentBid && <div className="text-[14px] font-semibold">${v.currentBid.toLocaleString()}</div>}
                      {v.buyNowPrice && <div className="text-[10px] text-[#15be53]">Buy Now: ${v.buyNowPrice.toLocaleString()}</div>}
                    </div>
                    {v.auctionLocation && <div className="text-[10px] text-[#94a3b8]">{v.auctionLocation}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f6f9fc] border-b border-[#e5edf5]">
              <tr>
                {["Vehicle", "Platform", "Odometer", "Damage", "Title", "Bid", "Location", ""].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium text-[#64748d] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5edf5]">
              {results.map(v => (
                <tr key={v.id} onClick={() => setSelectedVehicle(v)} className="hover:bg-[#f6f9fc] cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium text-[#061b31]">{v.title}</div>
                    {v.vin && <div className="text-[10px] text-[#94a3b8] font-mono">{v.vin.slice(0, 8)}...</div>}
                  </td>
                  <td className="px-4 py-3 text-[12px] capitalize">{v.platformIcon} {v.platform}</td>
                  <td className="px-4 py-3 text-[12px]">{v.odometer ? `${(v.odometer / 1000).toFixed(0)}K mi` : "—"}</td>
                  <td className="px-4 py-3 text-[12px]">{v.damageType || "—"}</td>
                  <td className="px-4 py-3"><span className="text-[10px] bg-[#f6f9fc] px-1.5 py-0.5 rounded">{v.titleType || "—"}</span></td>
                  <td className="px-4 py-3 text-[13px] font-medium">{v.currentBid ? `$${v.currentBid.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3 text-[11px] text-[#64748d]">{v.auctionLocation || "—"}</td>
                  <td className="px-4 py-3">
                    {v.detailUrl && <a href={v.detailUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[11px] text-[#533afd] hover:underline">View →</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[16px]">{selectedVehicle.platformIcon}</span>
                  <span className="text-[11px] uppercase font-medium text-[#64748d]">{selectedVehicle.platform}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${(STATUS_STYLES[selectedVehicle.status] || STATUS_STYLES.available).bg} ${(STATUS_STYLES[selectedVehicle.status] || STATUS_STYLES.available).text} ${(STATUS_STYLES[selectedVehicle.status] || STATUS_STYLES.available).border}`}>{selectedVehicle.status}</span>
                </div>
                <h3 className="text-[18px] font-semibold tracking-[-0.3px]">{selectedVehicle.title}</h3>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="text-[#64748d] hover:text-[#061b31] text-xl">×</button>
            </div>

            {/* Image placeholder */}
            <div className="h-[200px] bg-[#f6f9fc] rounded-lg flex items-center justify-center mb-5">
              <div className="text-center">
                <div className="text-[40px] mb-2">{selectedVehicle.platformIcon}</div>
                <div className="text-[12px] text-[#94a3b8]">Photos available on {selectedVehicle.platform}</div>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                { label: "Year", value: selectedVehicle.year },
                { label: "Make", value: selectedVehicle.make },
                { label: "Model", value: selectedVehicle.model },
                { label: "VIN", value: selectedVehicle.vin || "—" },
                { label: "Odometer", value: selectedVehicle.odometer ? `${selectedVehicle.odometer.toLocaleString()} mi` : "—" },
                { label: "Damage", value: selectedVehicle.damageType || "—" },
                { label: "Title", value: selectedVehicle.titleType || "—" },
                { label: "Color", value: selectedVehicle.exteriorColor || "—" },
                { label: "Lot #", value: selectedVehicle.lotNumber || "—" },
                { label: "Location", value: selectedVehicle.auctionLocation || "—" },
              ].map(d => (
                <div key={d.label}>
                  <div className="text-[10px] text-[#64748d] uppercase tracking-wider mb-0.5">{d.label}</div>
                  <div className="font-medium">{d.value}</div>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div className="mt-5 p-4 bg-[#f6f9fc] rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                {selectedVehicle.currentBid && (
                  <div>
                    <div className="text-[10px] text-[#64748d] uppercase tracking-wider">Current Bid</div>
                    <div className="text-[20px] font-semibold">${selectedVehicle.currentBid.toLocaleString()}</div>
                  </div>
                )}
                {selectedVehicle.buyNowPrice && (
                  <div>
                    <div className="text-[10px] text-[#15be53] uppercase tracking-wider">Buy Now</div>
                    <div className="text-[20px] font-semibold text-[#15be53]">${selectedVehicle.buyNowPrice.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              {selectedVehicle.detailUrl && (
                <a href={selectedVehicle.detailUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium text-center hover:bg-[#4434d4]">
                  View on {selectedVehicle.platform} →
                </a>
              )}
              <button className="px-4 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc]">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
