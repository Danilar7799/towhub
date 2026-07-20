"use client";

import { useState, useEffect } from "react";

interface AuctionTransportOrder {
  id: string;
  platform: string; // copart, iaa, manheim, adesa, backlotcars, pipeline
  platformIcon: string;
  lotNumber: string;
  // Vehicle info
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleVin?: string;
  vehicleCondition?: string; // runs, doesn't start, salvage, etc.
  // Pickup
  pickupLocation: string; // auction yard address
  pickupCity: string;
  pickupState: string;
  pickupContact?: string;
  pickupPhone?: string;
  // Delivery
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryContact?: string;
  deliveryPhone?: string;
  // Transport details
  miles?: number;
  transportType: "open" | "enclosed" | "flatbed";
  isOperable: boolean;
  // Pricing
  offeredPrice: number; // what auction pays
  // Status
  status: "pending" | "accepted" | "dispatched" | "picked_up" | "in_transit" | "delivered" | "declined" | "expired";
  // Timing
  requestedPickupDate?: string;
  deadline?: string;
  acceptedAt?: string;
  deliveredAt?: string;
  // Assignment
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedVehicleId?: string;
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
  pending: { bg: "bg-[#fef3c7]", text: "text-[#92400e]", border: "border-[#fde68a]" },
  accepted: { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", border: "border-[#bfdbfe]" },
  dispatched: { bg: "bg-[#e0e7ff]", text: "text-[#3730a3]", border: "border-[#c7d2fe]" },
  picked_up: { bg: "bg-[#f3e8ff]", text: "text-[#6b21a8]", border: "border-[#e9d5ff]" },
  in_transit: { bg: "bg-[#ffedd5]", text: "text-[#9a3412]", border: "border-[#fed7aa]" },
  delivered: { bg: "bg-[#dcfce7]", text: "text-[#166534]", border: "border-[#bbf7d0]" },
  declined: { bg: "bg-[#fef2f2]", text: "text-[#991b1b]", border: "border-[#fecaca]" },
  expired: { bg: "bg-[#f6f9fc]", text: "text-[#94a3b8]", border: "border-[#e5edf5]" },
};

export default function AuctionsPage() {
  const [orders, setOrders] = useState<AuctionTransportOrder[]>([]);
  const [filter, setFilter] = useState("pending");
  const [platform, setPlatform] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<AuctionTransportOrder | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock data — in production these come from auction company APIs/webhooks
  useEffect(() => {
    const mockOrders: AuctionTransportOrder[] = [
      {
        id: "copart-001", platform: "copart", platformIcon: "🔨", lotNumber: "CP-48291",
        vehicleYear: 2019, vehicleMake: "Ford", vehicleModel: "F-150", vehicleColor: "White",
        vehicleVin: "1FTEW1EP6KFA12345", vehicleCondition: "Runs & Drives",
        pickupLocation: "Copart Dallas", pickupCity: "Dallas", pickupState: "TX",
        pickupContact: "John", pickupPhone: "+1-214-555-0101",
        deliveryAddress: "456 Oak Ave", deliveryCity: "Houston", deliveryState: "TX",
        deliveryContact: "Mike", deliveryPhone: "+1-713-555-0202",
        miles: 240, transportType: "open", isOperable: true,
        offeredPrice: 385, status: "pending",
        requestedPickupDate: "2026-07-21", deadline: "2026-07-23",
      },
      {
        id: "iaa-002", platform: "iaa", platformIcon: "🚗", lotNumber: "IAA-71923",
        vehicleYear: 2021, vehicleMake: "Toyota", vehicleModel: "Camry", vehicleColor: "Silver",
        vehicleCondition: "Doesn't Start",
        pickupLocation: "IAA Phoenix", pickupCity: "Phoenix", pickupState: "AZ",
        deliveryAddress: "789 Pine St", deliveryCity: "Tucson", deliveryState: "AZ",
        miles: 115, transportType: "flatbed", isOperable: false,
        offeredPrice: 290, status: "pending",
        requestedPickupDate: "2026-07-20",
      },
      {
        id: "manheim-003", platform: "manheim", platformIcon: "🏷️", lotNumber: "MH-55012",
        vehicleYear: 2022, vehicleMake: "Chevrolet", vehicleModel: "Silverado", vehicleColor: "Black",
        vehicleCondition: "Runs & Drives",
        pickupLocation: "Manheim Orlando", pickupCity: "Orlando", pickupState: "FL",
        deliveryAddress: "321 Beach Blvd", deliveryCity: "Miami", deliveryState: "FL",
        miles: 235, transportType: "open", isOperable: true,
        offeredPrice: 410, status: "accepted",
        assignedDriverName: "Carlos R.",
        acceptedAt: "2026-07-19T10:30:00",
      },
      {
        id: "copart-004", platform: "copart", platformIcon: "🔨", lotNumber: "CP-49107",
        vehicleYear: 2018, vehicleMake: "Honda", vehicleModel: "Civic", vehicleColor: "Blue",
        vehicleCondition: "Flood Damage",
        pickupLocation: "Copart Atlanta", pickupCity: "Atlanta", pickupState: "GA",
        deliveryAddress: "567 Main St", deliveryCity: "Nashville", deliveryState: "TN",
        miles: 250, transportType: "enclosed", isOperable: false,
        offeredPrice: 450, status: "delivered",
        deliveredAt: "2026-07-18T14:20:00",
        assignedDriverName: "James T.",
      },
    ];
    setOrders(mockOrders);
  }, []);

  const filtered = orders.filter(o => {
    if (filter !== "all" && o.status !== filter) return false;
    if (platform !== "all" && o.platform !== platform) return false;
    return true;
  });

  const acceptOrder = async (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "accepted", acceptedAt: new Date().toISOString() } : o));
    setSelectedOrder(null);
  };

  const declineOrder = async (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "declined" } : o));
    setSelectedOrder(null);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as AuctionTransportOrder["status"] } : o));
  };

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const activeCount = orders.filter(o => ["accepted", "dispatched", "picked_up", "in_transit"].includes(o.status)).length;
  const totalRevenue = orders.filter(o => o.status === "delivered").reduce((s, o) => s + o.offeredPrice, 0);

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Left: Order list */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Auction Transport Orders</h2>
            <p className="text-[13px] text-[#64748d] mt-0.5">Tow requests from Copart, IAA, Manheim, and more</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Pending", value: pendingCount, accent: "#f59e0b" },
            { label: "Active", value: activeCount, accent: "#533afd" },
            { label: "Revenue", value: `$${totalRevenue}`, accent: "#15be53" },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-3">
              <div className="text-[10px] text-[#64748d] uppercase tracking-wider">{s.label}</div>
              <div className="text-[22px] font-light" style={{ color: s.accent }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {[{ l: "Pending", v: "pending" }, { l: "Accepted", v: "accepted" }, { l: "In Transit", v: "in_transit" }, { l: "Delivered", v: "delivered" }, { l: "All", v: "all" }].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded text-[12px] font-medium whitespace-nowrap ${filter === f.v ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>
              {f.l} {f.v === "pending" && pendingCount > 0 && `(${pendingCount})`}
            </button>
          ))}
        </div>

        {/* Platform filters */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => setPlatform(p.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap flex items-center gap-1 ${platform === p.id ? "bg-[#061b31] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>

        {/* Order list */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
              <div className="text-[32px] mb-3 opacity-30">🔨</div>
              <div className="text-[14px] text-[#64748d]">No {filter} orders</div>
              <div className="text-[12px] text-[#94a3b8] mt-1">Transport requests from auction companies will appear here</div>
            </div>
          ) : filtered.map(o => {
            const s = STATUS_STYLES[o.status] || STATUS_STYLES.pending;
            return (
              <div key={o.id} onClick={() => setSelectedOrder(o)}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-[0_4px_12px_rgba(50,50,93,0.06)] ${selectedOrder?.id === o.id ? "border-[#533afd] shadow-[0_4px_12px_rgba(83,58,253,0.1)]" : "border-[#e5edf5]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[14px]">{o.platformIcon}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>{o.status.replace("_", " ")}</span>
                      <span className="text-[10px] text-[#94a3b8] font-mono">Lot #{o.lotNumber}</span>
                      {!o.isOperable && <span className="text-[10px] bg-[#fef2f2] text-[#dc2626] px-1.5 py-0.5 rounded">Non-op</span>}
                    </div>
                    <div className="text-[14px] font-medium text-[#061b31]">{o.vehicleYear} {o.vehicleMake} {o.vehicleModel} ({o.vehicleColor})</div>
                    <div className="text-[12px] text-[#64748d] mt-0.5">
                      📍 {o.pickupLocation}, {o.pickupCity}, {o.pickupState} → {o.deliveryCity}, {o.deliveryState}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {o.miles && <span className="text-[11px] text-[#94a3b8]">{o.miles} mi</span>}
                      <span className="text-[11px] text-[#94a3b8] capitalize">{o.transportType}</span>
                      {o.vehicleCondition && <span className="text-[11px] text-[#94a3b8]">{o.vehicleCondition}</span>}
                      {o.assignedDriverName && <span className="text-[11px] text-[#533afd]">🚛 {o.assignedDriverName}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[18px] font-semibold text-[#15be53]">${o.offeredPrice}</div>
                    {o.deadline && <div className="text-[10px] text-[#94a3b8]">Due: {new Date(o.deadline).toLocaleDateString()}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Order detail */}
      {selectedOrder && (
        <div className="w-[380px] bg-white border border-[#e5edf5] rounded-lg overflow-hidden shrink-0 flex flex-col">
          <div className="px-5 py-4 border-b border-[#e5edf5] flex items-center justify-between">
            <div className="text-[15px] font-semibold">Order Details</div>
            <button onClick={() => setSelectedOrder(null)} className="text-[#64748d] hover:text-[#061b31] text-lg">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Vehicle */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Vehicle</div>
              <div className="text-[14px] font-medium">{selectedOrder.vehicleYear} {selectedOrder.vehicleMake} {selectedOrder.vehicleModel}</div>
              <div className="text-[12px] text-[#64748d]">{selectedOrder.vehicleColor} • {selectedOrder.vehicleCondition || "—"}</div>
              {selectedOrder.vehicleVin && <div className="text-[11px] text-[#94a3b8] font-mono mt-1">VIN: {selectedOrder.vehicleVin}</div>}
            </div>

            {/* Route */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Route</div>
              <div className="space-y-2">
                <div className="p-3 bg-[#f6f9fc] rounded-lg">
                  <div className="text-[10px] text-[#94a3b8] uppercase">Pickup</div>
                  <div className="text-[13px] font-medium">{selectedOrder.pickupLocation}</div>
                  <div className="text-[12px] text-[#64748d]">{selectedOrder.pickupCity}, {selectedOrder.pickupState}</div>
                  {selectedOrder.pickupContact && <div className="text-[11px] text-[#64748d] mt-1">👤 {selectedOrder.pickupContact} • {selectedOrder.pickupPhone}</div>}
                </div>
                <div className="text-center text-[12px] text-[#94a3b8]">↓ {selectedOrder.miles || "—"} miles ↓</div>
                <div className="p-3 bg-[#f6f9fc] rounded-lg">
                  <div className="text-[10px] text-[#94a3b8] uppercase">Delivery</div>
                  <div className="text-[13px] font-medium">{selectedOrder.deliveryAddress}</div>
                  <div className="text-[12px] text-[#64748d]">{selectedOrder.deliveryCity}, {selectedOrder.deliveryState}</div>
                  {selectedOrder.deliveryContact && <div className="text-[11px] text-[#64748d] mt-1">👤 {selectedOrder.deliveryContact} • {selectedOrder.deliveryPhone}</div>}
                </div>
              </div>
            </div>

            {/* Transport */}
            <div>
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Transport</div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div><span className="text-[#64748d]">Type:</span> <span className="capitalize font-medium">{selectedOrder.transportType}</span></div>
                <div><span className="text-[#64748d]">Operable:</span> <span className="font-medium">{selectedOrder.isOperable ? "Yes" : "No"}</span></div>
                <div><span className="text-[#64748d]">Platform:</span> <span className="font-medium capitalize">{selectedOrder.platform}</span></div>
                <div><span className="text-[#64748d]">Lot:</span> <span className="font-mono font-medium">{selectedOrder.lotNumber}</span></div>
              </div>
            </div>

            {/* Pricing */}
            <div className="p-4 bg-[#dcfce7] rounded-lg">
              <div className="text-[11px] text-[#166534] uppercase tracking-wider mb-1">Offered Price</div>
              <div className="text-[24px] font-semibold text-[#166534]">${selectedOrder.offeredPrice}</div>
              {selectedOrder.miles && <div className="text-[11px] text-[#166534]">${(selectedOrder.offeredPrice / selectedOrder.miles).toFixed(2)}/mile</div>}
            </div>

            {/* Timeline */}
            {selectedOrder.requestedPickupDate && (
              <div>
                <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Timeline</div>
                <div className="text-[12px] text-[#64748d]">
                  <div>Pickup: {new Date(selectedOrder.requestedPickupDate).toLocaleDateString()}</div>
                  {selectedOrder.deadline && <div>Deadline: {new Date(selectedOrder.deadline).toLocaleDateString()}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-[#e5edf5] space-y-2">
            {selectedOrder.status === "pending" && (
              <div className="flex gap-2">
                <button onClick={() => acceptOrder(selectedOrder.id)} className="flex-1 bg-[#15be53] text-white py-2.5 rounded text-[13px] font-medium hover:bg-[#12a347]">
                  ✅ Accept (${selectedOrder.offeredPrice})
                </button>
                <button onClick={() => declineOrder(selectedOrder.id)} className="px-4 py-2.5 border border-[#fecaca] text-[#dc2626] rounded text-[13px] font-medium hover:bg-[#fef2f2]">
                  Decline
                </button>
              </div>
            )}
            {selectedOrder.status === "accepted" && (
              <button onClick={() => updateStatus(selectedOrder.id, "dispatched")} className="w-full bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium">
                🚛 Dispatch Driver
              </button>
            )}
            {selectedOrder.status === "dispatched" && (
              <button onClick={() => updateStatus(selectedOrder.id, "picked_up")} className="w-full bg-[#533afd] text-white py-2.5 rounded text-[13px] font-medium">
                📦 Mark Picked Up
              </button>
            )}
            {selectedOrder.status === "picked_up" && (
              <button onClick={() => updateStatus(selectedOrder.id, "in_transit")} className="w-full bg-[#f97316] text-white py-2.5 rounded text-[13px] font-medium">
                🚚 In Transit
              </button>
            )}
            {selectedOrder.status === "in_transit" && (
              <button onClick={() => updateStatus(selectedOrder.id, "delivered")} className="w-full bg-[#15be53] text-white py-2.5 rounded text-[13px] font-medium">
                ✅ Mark Delivered
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
