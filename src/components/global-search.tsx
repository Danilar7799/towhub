"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

/* ───────── Types ───────── */

interface SearchResult {
  id: string;
  type: "job" | "customer" | "invoice" | "fleet" | "driver";
  title: string;
  subtitle: string;
  href: string;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

/* ───────── Config ───────── */

const ENTITY_CONFIG: Record<
  SearchResult["type"],
  { label: string; icon: React.ReactNode; color: string }
> = {
  job: {
    label: "Jobs",
    color: "#533afd",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <line x1="8" y1="11" x2="16" y2="11" />
        <line x1="8" y1="15" x2="12" y2="15" />
      </svg>
    ),
  },
  customer: {
    label: "Customers",
    color: "#0ea5e9",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  invoice: {
    label: "Invoices",
    color: "#10b981",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  fleet: {
    label: "Fleet",
    color: "#f59e0b",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  driver: {
    label: "Drivers",
    color: "#8b5cf6",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
};

const RECENT_SEARCHES_KEY = "towhub_recent_searches";
const MAX_RECENT = 8;

/* ───────── Helpers ───────── */

function getRecentSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const existing = getRecentSearches().filter((s) => s.query !== trimmed);
  const updated = [{ query: trimmed, timestamp: Date.now() }, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

/* ───────── Component ───────── */

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  // Read recent searches directly from localStorage when overlay is open
  // (avoids setState-in-effect lint; localStorage is synchronous and idempotent)
  const recentSearchesList = open ? getRecentSearches() : recentSearches;

  // Focus input when opening (effect is fine — imperative side-effect on DOM)
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Debounced search — always runs, handles empty query cleanup via the timer
  useEffect(() => {
    const trimmed = query.trim();

    const timer = setTimeout(async () => {
      if (!trimmed) {
        setResults([]);
        setActiveIndex(-1);
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const fetched = await searchAll(trimmed, controller.signal);
        if (!controller.signal.aborted) {
          setResults(fetched);
          setActiveIndex(fetched.length > 0 ? 0 : -1);
        }
      } catch {
        // Ignore aborts
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Navigate to a result
  function navigateTo(result: SearchResult) {
    saveRecentSearch(query);
    router.push(result.href);
    onClose();
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      navigateTo(results[activeIndex]);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeEl?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // Group results by type
  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    }
    return groups;
  }, [results]);

  // Track flat index across groups
  let flatIdx = 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#061b31]/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-[620px] mx-4 bg-white rounded-xl shadow-2xl border border-[#e5edf5] overflow-hidden"
        style={{ animation: "gs-in 0.15s ease-out" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-[52px] border-b border-[#e5edf5]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search jobs, customers, vehicles..."
            className="flex-1 text-[15px] text-[#061b31] placeholder-[#94a3b8] outline-none bg-transparent"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-[#533afd] border-t-transparent rounded-full animate-spin" />
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-[#94a3b8] bg-[#f6f9fc] border border-[#e5edf5] rounded">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {/* Empty state — show recent or hint */}
          {!query.trim() && (
            <div className="py-6 px-4">
              {recentSearchesList.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-[#64748d] uppercase tracking-wider">
                      Recent searches
                    </span>
                    <button
                      onClick={() => {
                        clearRecentSearches();
                        setRecentSearches([]);
                      }}
                      className="text-[11px] text-[#94a3b8] hover:text-[#64748d] transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearchesList.map((rs) => (
                      <button
                        key={rs.query}
                        onClick={() => setQuery(rs.query)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-[#64748d] bg-[#f6f9fc] border border-[#e5edf5] rounded-lg hover:border-[#533afd]/30 hover:text-[#533afd] transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {rs.query}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f6f9fc] mb-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <p className="text-[14px] text-[#64748d] font-medium">Search for jobs, customers, vehicles...</p>
                  <p className="text-[12px] text-[#94a3b8] mt-1">
                    Type to search across all your data
                  </p>
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {query.trim() && !loading && results.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f6f9fc] mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="8" x2="14" y2="14" />
                  <line x1="14" y1="8" x2="8" y2="14" />
                </svg>
              </div>
              <p className="text-[14px] text-[#64748d] font-medium">No results found</p>
              <p className="text-[12px] text-[#94a3b8] mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* Grouped results */}
          {Object.entries(grouped).map(([type, items]) => {
            const config = ENTITY_CONFIG[type as SearchResult["type"]];
            return (
              <div key={type}>
                <div className="sticky top-0 bg-[#f8fafc] px-4 py-2 border-b border-[#e5edf5]/60 z-10">
                  <span className="text-[11px] font-semibold text-[#64748d] uppercase tracking-wider">
                    {config.label}
                  </span>
                  <span className="ml-2 text-[11px] text-[#94a3b8]">
                    {items.length} result{items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {items.map((item) => {
                  const idx = flatIdx++;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => navigateTo(item)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive ? "bg-[#533afd]/[0.04]" : "hover:bg-[#f6f9fc]"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          color: config.color,
                          backgroundColor: `color-mix(in srgb, ${config.color} 8%, transparent)`,
                        }}
                      >
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#061b31] truncate">
                          {item.title}
                        </div>
                        <div className="text-[12px] text-[#64748d] truncate">
                          {item.subtitle}
                        </div>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isActive ? "#533afd" : "#cbd5e1"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#e5edf5] bg-[#f8fafc]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <kbd className="px-1 py-0.5 bg-white border border-[#e5edf5] rounded text-[10px]">↑</kbd>
            <kbd className="px-1 py-0.5 bg-white border border-[#e5edf5] rounded text-[10px]">↓</kbd>
            Navigate
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <kbd className="px-1.5 py-0.5 bg-white border border-[#e5edf5] rounded text-[10px]">↵</kbd>
            Open
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#94a3b8]">
            <kbd className="px-1.5 py-0.5 bg-white border border-[#e5edf5] rounded text-[10px]">Esc</kbd>
            Close
          </div>
        </div>
      </div>

      {/* Inject animation keyframes */}
      <style jsx global>{`
        @keyframes gs-in {
          from {
            opacity: 0;
            transform: scale(0.98) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/* ───────── Search logic ───────── */

async function searchAll(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const fetches = [
    fetchEntity("/api/jobs", query, "job", signal),
    fetchEntity("/api/customers", query, "customer", signal),
    fetchEntity("/api/invoices", query, "invoice", signal),
    fetchEntity("/api/fleet", query, "fleet", signal),
    fetchEntity("/api/drivers", query, "driver", signal),
  ];

  const settled = await Promise.allSettled(fetches);
  const results: SearchResult[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") {
      results.push(...s.value);
    }
  }
  return results;
}

async function fetchEntity(
  url: string,
  query: string,
  type: SearchResult["type"],
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) return [];

  const json = await res.json();
  const items: Record<string, unknown>[] = Array.isArray(json)
    ? json
    : json.jobs || json.customers || json.invoices || json.fleet || json.drivers || json.data || json.items || [];

  return items
    .filter((item) => matchItem(item, query, type))
    .slice(0, 10)
    .map((item) => mapToResult(item, type));
}

function matchItem(item: Record<string, unknown>, query: string, type: SearchResult["type"]): boolean {
  const searchable = getSearchableFields(item, type);
  return searchable.some((field) => String(field || "").toLowerCase().includes(query));
}

function getSearchableFields(item: Record<string, unknown>, type: SearchResult["type"]): string[] {
  switch (type) {
    case "job":
      return [
        item.id, item.jobId, item.title, item.description,
        item.customerName, item.customer, item.pickupAddress, item.dropoffAddress,
        item.status, item.type, item.towType,
      ].filter(Boolean) as string[];
    case "customer":
      return [
        item.id, item.name, item.firstName, item.lastName,
        item.email, item.phone, item.company, item.companyName,
        item.address, item.city,
      ].filter(Boolean) as string[];
    case "invoice":
      return [
        item.id, item.invoiceId, item.number, item.invoiceNumber,
        item.customerName, item.customer, item.description,
        item.status, item.reference,
      ].filter(Boolean) as string[];
    case "fleet":
      return [
        item.id, item.unit, item.unitNumber, item.name,
        item.make, item.model, item.year, item.vin,
        item.plate, item.licensePlate, item.type, item.status,
      ].filter(Boolean) as string[];
    case "driver":
      return [
        item.id, item.name, item.firstName, item.lastName,
        item.email, item.phone, item.license, item.licenseNumber,
        item.status,
      ].filter(Boolean) as string[];
  }
}

function mapToResult(item: Record<string, unknown>, type: SearchResult["type"]): SearchResult {
  switch (type) {
    case "job": {
      const jobId = item.jobId || item.id || "";
      const title = String(item.title || item.description || item.towType || `Job #${jobId}`);
      const customer = item.customerName || item.customer || "";
      const status = item.status || "";
      const subtitle = [customer ? `Customer: ${customer}` : "", status ? `Status: ${status}` : ""]
        .filter(Boolean).join(" · ") || "Tow job";
      return { id: String(jobId), type, title, subtitle, href: `/dashboard/jobs?id=${jobId}` };
    }
    case "customer": {
      const cid = item.id || "";
      const first = item.firstName || "";
      const last = item.lastName || "";
      const title = String(item.name || `${first} ${last}`.trim() || `Customer #${cid}`);
      const phone = item.phone || "";
      const email = item.email || "";
      const subtitle = [phone, email].filter(Boolean).join(" · ") || "Customer";
      return { id: String(cid), type, title, subtitle, href: `/dashboard/customers?id=${cid}` };
    }
    case "invoice": {
      const invId = item.invoiceId || item.id || item.number || "";
      const title = String(item.invoiceNumber || item.number || `Invoice #${invId}`);
      const customer = item.customerName || item.customer || "";
      const amount = item.total || item.amount || "";
      const parts = [customer, amount ? `$${amount}` : ""].filter(Boolean);
      return { id: String(invId), type, title, subtitle: parts.join(" · ") || "Invoice", href: `/dashboard/invoices?id=${invId}` };
    }
    case "fleet": {
      const fid = item.id || "";
      const unit = item.unitNumber || item.unit || "";
      const make = item.make || "";
      const model = item.model || "";
      const year = item.year || "";
      const title = [unit ? `Unit ${unit}` : "", year, make, model].filter(Boolean).join(" ") || `Vehicle #${fid}`;
      const vin = item.vin || "";
      const plate = item.licensePlate || item.plate || "";
      const subtitle = [vin, plate].filter(Boolean).join(" · ") || "Vehicle";
      return { id: String(fid), type, title, subtitle, href: `/dashboard/fleet?id=${fid}` };
    }
    case "driver": {
      const did = item.id || "";
      const first = item.firstName || "";
      const last = item.lastName || "";
      const title = String(item.name || `${first} ${last}`.trim() || `Driver #${did}`);
      const phone = item.phone || "";
      const status = item.status || "";
      const subtitle = [phone, status ? `Status: ${status}` : ""].filter(Boolean).join(" · ") || "Driver";
      return { id: String(did), type, title, subtitle, href: `/dashboard/drivers?id=${did}` };
    }
  }
}

/* ───────── Hook for triggering search ───────── */

export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { searchOpen: open, openSearch: () => setOpen(true), closeSearch: () => setOpen(false) };
}
