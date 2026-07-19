"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/lib/toast";

/* ── Design tokens ────────────────────────────────────────────────── */
const C = {
  primary: "#533afd",
  hover: "#4434d4",
  text: "#061b31",
  muted: "#64748d",
  border: "#e5edf5",
  surface: "#f6f9fc",
  success: "#15be53",
  error: "#dc2626",
} as const;

const inputCls = `w-full px-3.5 py-2.5 border border-[${C.border}] rounded text-[13px] text-[${C.text}] bg-white focus:border-[${C.primary}] focus:ring-1 focus:ring-[${C.primary}]/20 outline-none transition-colors placeholder:text-[#94a3b8]`;
const labelCls = "block text-[12px] font-medium text-[#273951] mb-1.5";

/* ── Types ────────────────────────────────────────────────────────── */
interface Integration {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  website: string;
  connected: boolean;
  status: string;
  configFields: { key: string; label: string; type: string; placeholder?: string; options?: string[] }[];
}

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "auction", label: "Auctions" },
  { key: "roadside", label: "Roadside" },
  { key: "communication", label: "Communication" },
  { key: "accounting", label: "Accounting" },
] as const;

const CATEGORY_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  auction: { label: "Auction", color: "#92400e", bg: "#fef3c7" },
  roadside: { label: "Roadside", color: "#1e40af", bg: "#dbeafe" },
  communication: { label: "Communication", color: "#5b21b6", bg: "#ede9fe" },
  accounting: { label: "Accounting", color: "#065f46", bg: "#d1fae5" },
  crm: { label: "CRM", color: "#991b1b", bg: "#fef2f2" },
};

/* ═══════════════════════════════════════════════════════════════════
   INTEGRATIONS MARKETPLACE PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function IntegrationsPage() {
  const toast = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState<Integration | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);

  const loadIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch {
      toast.error("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const handleConnect = async () => {
    if (!modal) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: modal.id, config: configValues }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Integration connected!");
        setModal(null);
        setConfigValues({});
        loadIntegrations();
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: integration.id, disconnect: true }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Disconnected");
        loadIntegrations();
      } else {
        toast.error(data.error || "Failed to disconnect");
      }
    } catch {
      toast.error("Network error");
    }
  };

  // Filter
  const filtered = integrations.filter(int => {
    const matchesCategory = filter === "all" || int.category === filter;
    const matchesSearch = !search || int.name.toLowerCase().includes(search.toLowerCase()) || int.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedCount = integrations.filter(i => i.connected).length;

  return (
    <div className="space-y-6 max-w-5xl" style={{ fontFeatureSettings: "'ss01'" }}>
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px] text-[#061b31]">Integrations</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">
          Connect your favorite tools to TowHub — {connectedCount} integration{connectedCount !== 1 ? "s" : ""} connected
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className={`pl-10 ${inputCls}`}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`px-3.5 py-2 rounded text-[12px] font-medium transition-colors ${
                filter === cat.key
                  ? `bg-[${C.primary}] text-white`
                  : "bg-white border border-[#e5edf5] text-[#64748d] hover:text-[#061b31] hover:border-[#b9b9f9]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white border border-[#e5edf5] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-[32px] mb-3">🔍</div>
          <div className="text-[14px] font-medium text-[#061b31]">No integrations found</div>
          <div className="text-[13px] text-[#64748d] mt-1">Try a different search term or category</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(int => {
            const badge = CATEGORY_BADGES[int.category];
            return (
              <div
                key={int.id}
                className={`bg-white border rounded-lg p-5 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${
                  int.connected ? "border-[#bbf7d0]" : "border-[#e5edf5]"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[28px]">{int.icon}</span>
                    <div>
                      <div className="text-[14px] font-semibold text-[#061b31]">{int.name}</div>
                      {badge && (
                        <span
                          className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5"
                          style={{ color: badge.color, backgroundColor: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                  {int.connected && (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-[#15be53] bg-[#dcfce7] px-1.5 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 bg-[#15be53] rounded-full" />
                      Connected
                    </span>
                  )}
                </div>

                <p className="text-[12px] text-[#64748d] mb-4 line-clamp-3">{int.description}</p>

                <div className="flex items-center justify-between">
                  <a
                    href={int.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-[11px] text-[${C.muted}] hover:text-[${C.primary}] transition-colors`}
                  >
                    Website →
                  </a>
                  {int.connected ? (
                    <button
                      onClick={() => handleDisconnect(int)}
                      className="text-[12px] font-medium text-[#dc2626] hover:text-[#b91c1c] transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => { setModal(int); setConfigValues({}); }}
                      className={`bg-[${C.primary}] text-white px-4 py-1.5 rounded text-[12px] font-medium hover:bg-[${C.hover}] transition-colors`}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[28px]">{modal.icon}</span>
              <div>
                <h3 className="text-[16px] font-semibold text-[#061b31]">Connect {modal.name}</h3>
                <p className="text-[12px] text-[#64748d]">{modal.description}</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {modal.configFields.map(f => (
                <div key={f.key}>
                  <label className={labelCls}>{f.label}</label>
                  <input
                    type={f.type === "password" ? "password" : "text"}
                    value={configValues[f.key] || ""}
                    onChange={e => setConfigValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-[13px] font-medium text-[#64748d] hover:text-[#061b31] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className={`bg-[${C.primary}] text-white px-5 py-2 rounded text-[13px] font-medium hover:bg-[${C.hover}] transition-colors disabled:opacity-50`}
              >
                {connecting ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
