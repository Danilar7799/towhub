"use client";

import { useState, useCallback } from "react";
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

/* ── Doc sections ─────────────────────────────────────────────────── */
interface DocSection {
  id: string;
  title: string;
  icon: string;
  content: DocContent[];
}

interface DocContent {
  heading: string;
  body: string;
  code?: string;
  lang?: string;
}

const SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "🚀",
    content: [
      {
        heading: "Welcome to TowHub",
        body: "TowHub is a comprehensive towing company management platform. It helps you manage jobs, dispatch drivers, track fleet, handle invoicing, and connect with roadside assistance networks. This guide walks you through the essential setup steps.",
      },
      {
        heading: "Quick Setup",
        body: "After registering, complete these steps to get your account fully operational:\n\n1. Complete your Company Profile in Settings\n2. Add your fleet vehicles in the Fleet tab\n3. Invite drivers and dispatchers to your team\n4. Connect integrations (auction platforms, roadside networks)\n5. Set your service rates and coverage area\n6. Start accepting jobs!",
      },
      {
        heading: "API Authentication",
        body: "All API requests require an API key passed in the X-API-Key header. Generate your key in Settings → API Key. Keep it secret — anyone with your key can create leads on your behalf.",
        code: `curl -X GET https://app.towhub.io/api/jobs \\
  -H "X-API-Key: your_api_key_here" \\
  -H "Content-Type: application/json"`,
        lang: "bash",
      },
    ],
  },
  {
    id: "jobs",
    title: "Jobs",
    icon: "📋",
    content: [
      {
        heading: "Managing Jobs",
        body: "The Jobs tab is your central hub for tracking all tow requests. Jobs flow through these statuses: New → Assigned → En Route → On Scene → In Transit → Complete → Invoiced.\n\nEach job captures: customer info, pickup/destination, vehicle details, driver assignment, photos, signatures, and timestamps.",
      },
      {
        heading: "Creating a Job via API",
        body: "Create jobs programmatically using the REST API. All fields except name and phone are optional.",
        code: `POST /api/jobs
Content-Type: application/json
X-API-Key: your_key

{
  "customerName": "John Smith",
  "customerPhone": "+15551234567",
  "pickupAddress": "123 Main St, Miami FL",
  "destination": "456 Oak Ave, Miami FL",
  "vehicleInfo": "2020 Honda Civic, Silver",
  "notes": "Flat tire, needs tow to shop",
  "priority": "normal",
  "source": "api"
}`,
        lang: "json",
      },
      {
        heading: "Auto-Dispatch",
        body: "Enable auto-dispatch to automatically assign the nearest available driver to new jobs. Configure in Settings → Dispatch. The system considers driver location, vehicle type, and current workload.",
      },
    ],
  },
  {
    id: "fleet",
    title: "Fleet",
    icon: "🚛",
    content: [
      {
        heading: "Fleet Management",
        body: "Track all your tow trucks, flatbeds, and support vehicles. Each vehicle record includes: unit number, type (flatbed/wheel-lift/Heavy-Duty), license plate, VIN, insurance details, maintenance schedule, and GPS tracker assignment.\n\nVehicles can be marked as Available, On Job, Maintenance, or Out of Service.",
      },
      {
        heading: "Vehicle Types",
        body: "TowHub supports multiple vehicle categories:\n\n• Flatbed — for standard tows\n• Wheel-Lift — for short-distance urban tows\n• Heavy-Duty — for semi-trucks, buses, RVs\n• Motorcycle — specialized motorcycle transport\n• Dolly — for AWD/locked vehicles",
      },
    ],
  },
  {
    id: "dispatch",
    title: "Dispatch",
    icon: "🗺️",
    content: [
      {
        heading: "Live Dispatch Map",
        body: "The Dispatch tab shows a real-time map with all active drivers and pending jobs. Drag jobs onto drivers to assign them. The map supports OpenStreetMap (free), Google Maps, and Mapbox providers.",
      },
      {
        heading: "Dispatch Rules",
        body: "Configure automatic dispatch rules to streamline operations:\n\n• Round-robin — rotate jobs evenly among drivers\n• Nearest driver — GPS-based assignment\n• Zone-based — assign by coverage area\n• Priority override — urgent jobs jump the queue",
      },
      {
        heading: "Driver Tracking",
        body: "Drivers share their location via the TowHub mobile app or an installed GPS tracker. Update frequency is configurable from 10 seconds to 5 minutes.",
        code: `// Update driver location via API
POST /api/gps
{
  "driverId": "driver_abc123",
  "lat": 25.7617,
  "lng": -80.1918,
  "speed": 35,
  "heading": 180
}`,
        lang: "json",
      },
    ],
  },
  {
    id: "billing",
    title: "Billing",
    icon: "💳",
    content: [
      {
        heading: "Invoicing",
        body: "Generate invoices from completed jobs. TowHub calculates totals based on your rate card (base rate + per-mile + hook-up + after-hours surcharges). Invoices can be exported as PDF or synced to QuickBooks.\n\nPayment methods: Stripe (credit card), check, cash, or ACH bank transfer.",
      },
      {
        heading: "Rate Cards",
        body: "Set up rate cards to auto-calculate job pricing:\n\n• Base rate (hook-up fee)\n• Per-mile rate\n• After-hours surcharge (configurable by time window)\n• Holiday surcharge\n• Heavy-duty surcharge\n• Storage daily rate",
      },
      {
        heading: "Create Invoice via API",
        body: "Create invoices programmatically using the API. Include line items with descriptions and amounts.",
        code: `POST /api/invoices
{
  "jobId": "job_xyz789",
  "lineItems": [
    { "description": "Tow — 15 miles", "amount": 125.00 },
    { "description": "Hook-up fee", "amount": 75.00 },
    { "description": "After-hours surcharge", "amount": 50.00 }
  ],
  "notes": "Payment due within 30 days",
  "paymentMethod": "stripe"
}`,
        lang: "json",
      },
    ],
  },
  {
    id: "api-reference",
    title: "API Reference",
    icon: "📡",
    content: [
      {
        heading: "Base URL",
        body: "All API endpoints are relative to your TowHub instance URL. Include your API key in the X-API-Key header for every request.",
        code: `https://app.towhub.io/api/v1/`,
      },
      {
        heading: "Endpoints Overview",
        body: "• GET /api/jobs — List jobs (with pagination)\n• POST /api/jobs — Create a new job\n• GET /api/jobs/:id — Get job details\n• PUT /api/jobs/:id — Update a job\n• GET /api/customers — List customers\n• POST /api/external/lead — Submit a lead (public)\n• GET /api/fleet — List fleet vehicles\n• GET /api/drivers — List drivers\n• POST /api/gps — Update driver location\n• GET /api/invoices — List invoices\n• POST /api/invoices — Create invoice\n• GET /api/reports — Generate reports",
      },
      {
        heading: "Pagination",
        body: "List endpoints support cursor-based pagination. Pass ?limit=25&cursor=<next_cursor> to paginate. Default limit is 50, max is 200.",
        code: `GET /api/jobs?limit=25&cursor=abc123

Response:
{
  "jobs": [...],
  "nextCursor": "def456",
  "hasMore": true
}`,
        lang: "json",
      },
      {
        heading: "Webhooks",
        body: "Configure webhooks to receive real-time notifications for events: job.created, job.completed, invoice.paid, driver.location_updated. Set your webhook URL in Settings → Integrations.",
        code: `// Webhook payload example
{
  "event": "job.completed",
  "timestamp": "2026-07-19T14:30:00Z",
  "data": {
    "jobId": "job_xyz789",
    "driverId": "driver_abc123",
    "completedAt": "2026-07-19T14:28:00Z",
    "mileage": 15.2
  }
}`,
        lang: "json",
      },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    icon: "🔗",
    content: [
      {
        heading: "Available Integrations",
        body: "TowHub connects with industry platforms to streamline your operations:\n\n🔨 Auction Platforms: Copart, IAA, Manheim, ADESA, BacklotCars, Pipeline\n⚡ Roadside Assistance: HONK, Urgently, Agero, Quest\n📱 Communication: Twilio (SMS), Bland.ai (AI Dispatcher), Google Business\n📊 Accounting: QuickBooks Online",
      },
      {
        heading: "Connecting an Integration",
        body: "Go to Settings → Integrations or the Integrations marketplace. Click Connect on any integration and enter the required credentials (API keys, account IDs, etc.). Each integration has its own config fields — hover over the info icon for help.",
      },
      {
        heading: "Bland.ai AI Dispatcher",
        body: "Bland.ai provides an AI phone agent that answers calls 24/7, captures job details, and dispatches drivers automatically. Set up your Bland.ai phone number and connect it to TowHub to never miss a tow request.\n\nThe AI dispatcher can: answer calls, capture customer info, get pickup/destination, create jobs in TowHub, and confirm with the customer.",
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    icon: "❓",
    content: [
      {
        heading: "How do I reset my password?",
        body: "Click 'Forgot Password' on the login page. Enter your email and you'll receive a reset link within 2 minutes. The link expires after 1 hour.",
      },
      {
        heading: "Can I import existing data?",
        body: "Yes! Go to Dashboard → Import/Export. You can import customers, jobs, and fleet data from CSV files. Download the template files to see the expected format. The import tool validates data before committing.",
      },
      {
        heading: "How does auto-dispatch work?",
        body: "Auto-dispatch uses GPS data from your drivers to assign the nearest available driver to new jobs. It considers: distance to pickup, current job status, vehicle type match, and driver working hours. Enable it in Settings → Dispatch.",
      },
      {
        heading: "What payment methods are supported?",
        body: "TowHub integrates with Stripe for credit card payments. You can also record cash, check, and ACH payments manually. Stripe payouts are deposited to your bank account on a rolling 2-day basis.",
      },
      {
        heading: "Is there a mobile app?",
        body: "Yes — TowHub has native iOS and Android apps for drivers. Drivers can view assigned jobs, navigate to pickup, capture photos, collect signatures, and update job status in real-time. Download from the App Store or Google Play.",
      },
      {
        heading: "How do I cancel my subscription?",
        body: "Go to Dashboard → Billing → Manage Plan. Click 'Cancel Subscription'. Your account remains active until the end of the current billing period. All your data is retained for 90 days after cancellation.",
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
   DOCS PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function DocsPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = useCallback((code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter sections and content by search
  const filteredSections = SECTIONS.map(section => ({
    ...section,
    content: section.content.filter(c => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.heading.toLowerCase().includes(q) || c.body.toLowerCase().includes(q);
    }),
  })).filter(s => !search || s.content.length > 0 || s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f6f9fc]" style={{ fontFeatureSettings: "'ss01'", fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="bg-white border-b border-[#e5edf5] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <a href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#533afd] rounded flex items-center justify-center text-white text-[11px] font-semibold">T</div>
              <span className="text-[15px] font-semibold tracking-tight text-[#061b31]">TowHub</span>
            </a>
            <span className="text-[#e5edf5] mx-2">|</span>
            <span className="text-[13px] font-medium text-[#64748d]">Documentation</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-[13px] font-medium text-[#64748d] hover:text-[#061b31] transition-colors">Sign In</a>
            <a href="/register" className={`bg-[${C.primary}] text-white px-4 py-1.5 rounded text-[13px] font-medium hover:bg-[${C.hover}] transition-colors`}>Get Started</a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 hidden lg:block">
          <div className="sticky top-[72px]">
            {/* Search */}
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search docs..."
                className="pl-9 pr-3 py-2 w-full border border-[#e5edf5] rounded text-[12px] focus:border-[#533afd] outline-none"
              />
            </div>

            <nav className="space-y-0.5">
              {filteredSections.map(section => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={e => {
                    e.preventDefault();
                    setActiveSection(section.id);
                    document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-[13px] font-medium transition-colors ${
                    activeSection === section.id
                      ? "bg-[#533afd]/[0.06] text-[#533afd]"
                      : "text-[#64748d] hover:text-[#061b31] hover:bg-[#f6f9fc]"
                  }`}
                >
                  <span>{section.icon}</span>
                  {section.title}
                </a>
              ))}
            </nav>

            {/* Quick links */}
            <div className="mt-6 pt-4 border-t border-[#e5edf5]">
              <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Quick Links</div>
              <div className="space-y-1.5">
                <a href="/dashboard/settings" className="block text-[12px] text-[#64748d] hover:text-[#533afd] transition-colors">Settings</a>
                <a href="/dashboard/billing" className="block text-[12px] text-[#64748d] hover:text-[#533afd] transition-colors">Billing</a>
                <a href="#" className="block text-[12px] text-[#64748d] hover:text-[#533afd] transition-colors">System Status</a>
                <a href="#" className="block text-[12px] text-[#64748d] hover:text-[#533afd] transition-colors">Contact Support</a>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {filteredSections.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-[32px] mb-3">🔍</div>
              <div className="text-[14px] font-medium text-[#061b31]">No results found</div>
              <div className="text-[13px] text-[#64748d] mt-1">Try different search terms</div>
            </div>
          ) : (
            <div className="space-y-10">
              {filteredSections.map(section => (
                <section key={section.id} id={section.id}>
                  <div className="flex items-center gap-2 mb-5">
                    <span className="text-[20px]">{section.icon}</span>
                    <h2 className="text-[18px] font-semibold text-[#061b31]">{section.title}</h2>
                  </div>

                  <div className="space-y-4">
                    {section.content.map((item, i) => {
                      const key = `${section.id}-${i}`;
                      const isOpen = expanded[key] !== false; // default open
                      return (
                        <div key={key} className="bg-white border border-[#e5edf5] rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleExpand(key)}
                            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#f6f9fc] transition-colors"
                          >
                            <span className="text-[14px] font-medium text-[#061b31]">{item.heading}</span>
                            <svg
                              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748d" strokeWidth="1.5"
                              className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>

                          {isOpen && (
                            <div className="px-5 pb-5 border-t border-[#e5edf5]">
                              <div className="text-[13px] text-[#273951] leading-[1.7] whitespace-pre-line mt-4">
                                {item.body}
                              </div>

                              {item.code && (
                                <div className="mt-4 relative">
                                  <div className="flex items-center justify-between bg-[#061b31] rounded-t-lg px-4 py-2">
                                    <span className="text-[11px] text-[#94a3b8] uppercase tracking-wider">{item.lang || "code"}</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); copyCode(item.code!, key); }}
                                      className="text-[11px] text-[#94a3b8] hover:text-white transition-colors"
                                    >
                                      {copiedCode === key ? "✓ Copied" : "Copy"}
                                    </button>
                                  </div>
                                  <pre className="bg-[#0e1629] text-[#e2e8f0] text-[12px] p-4 rounded-b-lg overflow-x-auto font-mono leading-relaxed">
                                    <code>{item.code}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-[#e5edf5]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[#64748d]">
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-[#061b31] transition-colors">Status</a>
                <a href="#" className="hover:text-[#061b31] transition-colors">Privacy</a>
                <a href="#" className="hover:text-[#061b31] transition-colors">Terms</a>
              </div>
              <div>© 2026 TowHub. All rights reserved.</div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
