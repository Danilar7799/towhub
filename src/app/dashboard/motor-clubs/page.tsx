"use client";

import { useState, useEffect } from "react";

interface MotorClubLead { id: string; source: string; customerName?: string; customerPhone?: string; pickupAddress?: string; destinationAddress?: string; message?: string; estimatedValue?: number; status: string; createdAt: string; }

export default function MotorClubsPage() {
  const [leads, setLeads] = useState<MotorClubLead[]>([]);
  const [clubs, setClubs] = useState<Record<string, { name: string; color: string; icon: string }>>({});
  const [stats, setStats] = useState({ total: 0, byClub: {} as Record<string, number> });
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/motor-clubs").then(r => r.json()).then(d => {
      setLeads(d.leads || []);
      setClubs(d.clubs || {});
      setStats(d.stats || {});
    });
  }, []);

  const filtered = filter === "all" ? leads : leads.filter(l => l.source === `motor_club_${filter}`);

  return (
    <div className="space-y-5" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="flex items-center justify-between">
        <div><h2 className="text-[20px] font-semibold tracking-[-0.3px]">Motor Clubs</h2><p className="text-[13px] text-[#64748d] mt-0.5">Manage leads from AAA, Agero, Quest, and other motor clubs</p></div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#e5edf5] rounded-lg p-4"><div className="text-[11px] text-[#64748d] uppercase tracking-wider">Total Leads</div><div className="text-[28px] font-light">{stats.total}</div></div>
        {Object.entries(clubs).slice(0, 3).map(([key, club]) => (
          <div key={key} className="bg-white border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider">{club.icon} {club.name}</div>
            <div className="text-[28px] font-light">{stats.byClub?.[key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded text-[12px] font-medium ${filter === "all" ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>All</button>
        {Object.entries(clubs).map(([key, club]) => (
          <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 rounded text-[12px] font-medium ${filter === key ? "bg-[#533afd] text-white" : "bg-white border border-[#e5edf5] text-[#64748d]"}`}>{club.icon} {club.name}</button>
        ))}
      </div>

      {/* Leads list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-12 text-center">
          <div className="text-[32px] mb-3 opacity-30">🚗</div>
          <div className="text-[14px] text-[#64748d]">No motor club leads yet.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(l => {
            const clubKey = l.source.replace("motor_club_", "");
            const club = clubs[clubKey] || clubs.other;
            return (
              <div key={l.id} className="bg-white border border-[#e5edf5] rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[14px]">{club?.icon}</span>
                      <span className="text-[13px] font-medium">{club?.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${l.status === "new" ? "bg-[#dbeafe] text-[#1e40af]" : "bg-[#dcfce7] text-[#166534]"}`}>{l.status}</span>
                    </div>
                    <div className="text-[14px] font-medium">{l.customerName || "Unknown"}</div>
                    {l.customerPhone && <div className="text-[13px] text-[#64748d]">📞 {l.customerPhone}</div>}
                    {l.pickupAddress && <div className="text-[13px] text-[#64748d]">📍 {l.pickupAddress}</div>}
                    {l.destinationAddress && <div className="text-[13px] text-[#64748d]">🏁 {l.destinationAddress}</div>}
                    {l.message && <div className="text-[12px] text-[#94a3b8] mt-1 line-clamp-2">{l.message}</div>}
                  </div>
                  <div className="text-right">
                    {l.estimatedValue && <div className="text-[15px] font-semibold">${l.estimatedValue.toFixed(0)}</div>}
                    <div className="text-[11px] text-[#94a3b8]">{new Date(l.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
