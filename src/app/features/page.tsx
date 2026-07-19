"use client";

import Link from "next/link";

const FEATURES = [
  {
    icon: "🤖",
    title: "AI Dispatcher",
    desc: "Bland.ai answers calls 24/7, captures job details, and dispatches the nearest driver automatically. Never miss a call again.",
    details: ["24/7 phone answering", "Automatic job creation", "Nearest driver dispatch", "Call recording & transcripts", "Custom scripts per company"],
  },
  {
    icon: "📍",
    title: "Live GPS Tracking",
    desc: "Real-time driver locations on the map. Know where every truck is, always. Track speed, heading, and battery level.",
    details: ["Real-time map view", "Driver speed & heading", "Battery level monitoring", "Geofence alerts", "Route history playback"],
  },
  {
    icon: "📋",
    title: "Job Management",
    desc: "Create, assign, and track jobs through every stage — from dispatch to completion. Full workflow automation.",
    details: ["7-stage workflow", "Auto-timestamps", "Customer notifications", "Photo documentation", "Digital signatures"],
  },
  {
    icon: "🔗",
    title: "Lead Capture",
    desc: "Automatically pull leads from Yelp, Thumbtack, Google Business, and your Bolt.new website. Never miss a customer.",
    details: ["Yelp integration", "Thumbtack integration", "Google Business chat", "Bolt.new website forms", "API for custom sources"],
  },
  {
    icon: "👥",
    title: "Fleet & Team Management",
    desc: "Manage vehicles, assign drivers, track shifts, mileage, earnings, and expenses. Complete fleet visibility.",
    details: ["Vehicle database", "Driver assignment", "Shift tracking", "Mileage logging", "Maintenance schedules"],
  },
  {
    icon: "📞",
    title: "Google Business Integration",
    desc: "Connect your Google Business Profile. Customers message you directly, AI responds instantly.",
    details: ["Direct messaging", "AI auto-replies", "Lead capture", "Review management", "Business hours sync"],
  },
  {
    icon: "💰",
    title: "Earnings & Expenses",
    desc: "Track revenue per job, per driver. Log fuel, maintenance, tolls — all in one place. Net profit calculated automatically.",
    details: ["Per-job revenue", "Per-driver earnings", "Expense categories", "Fuel tracking", "Profit & loss reports"],
  },
  {
    icon: "📊",
    title: "Reports & Analytics",
    desc: "See your business at a glance — revenue trends, driver performance, lead conversion, and source attribution.",
    details: ["7-day revenue chart", "Driver leaderboards", "Lead conversion rates", "Revenue by source", "12 KPI dashboards"],
  },
  {
    icon: "📄",
    title: "Invoicing",
    desc: "Create and send professional invoices. Track payment status, overdue reminders, and revenue collection.",
    details: ["Auto-generated numbers", "Tax & discount support", "Payment tracking", "Overdue alerts", "PDF export (coming soon)"],
  },
  {
    icon: "🅿️",
    title: "Impound Lot Management",
    desc: "Track stored vehicles, calculate daily charges, manage releases. Full impound lot accounting.",
    details: ["Vehicle intake", "Daily rate calculation", "Spot assignment", "Release workflow", "Charge tracking"],
  },
  {
    icon: "💲",
    title: "Rate Sheets",
    desc: "Configure pricing for every service type. After-hours, weekend, and holiday multipliers included.",
    details: ["10 service types", "Base + per-mile rates", "Minimum charges", "After-hours multipliers", "Weekend/holiday rates"],
  },
  {
    icon: "👤",
    title: "Customer CRM",
    desc: "Build your customer database automatically. Track repeat customers, mark VIPs, and search instantly.",
    details: ["Auto-created from jobs", "Search & filter", "VIP tagging", "Job history", "Contact management"],
  },
  {
    icon: "🔔",
    title: "Instant Notifications",
    desc: "Get alerts via Telegram, SMS, or push when new leads come in or jobs are completed.",
    details: ["Telegram bot", "SMS alerts", "Push notifications", "Custom triggers", "Daily summaries"],
  },
  {
    icon: "🌐",
    title: "Website Lead Forms",
    desc: "Embed a lead capture form on any website. Leads flow directly into your TowHub CRM with API key authentication.",
    details: ["Copy-paste embed code", "API key authentication", "Custom styling", "Bolt.new compatible", "CORS enabled"],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-[#e5edf5]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#533afd] rounded-md flex items-center justify-center text-white font-semibold text-sm">T</div>
            <span className="text-lg font-semibold tracking-tight">TowHub</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm text-[#64748d] hover:text-[#061b31]">Sign in</a>
            <Link href="/#waitlist" className="bg-[#533afd] text-white px-5 py-2 rounded text-sm font-medium hover:bg-[#4434d4]">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f6f9fc] via-white to-white" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-[#533afd]/30 via-[#f96bee]/10 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-[800px] mx-auto px-6 pt-20 pb-16 text-center">
          <div className="text-[13px] font-medium text-[#533afd] uppercase tracking-[0.1em] mb-4">Features</div>
          <h1 className="text-[42px] md:text-[52px] font-light leading-[1.05] tracking-[-1.2px] mb-6" style={{ fontFeatureSettings: "'ss01'" }}>
            Everything you need to run a <span className="bg-gradient-to-r from-[#533afd] to-[#f96bee] bg-clip-text text-transparent">towing business</span>
          </h1>
          <p className="text-[17px] font-light text-[#64748d] leading-[1.6] max-w-[560px] mx-auto">
            From dispatch to payment, TowHub handles it all. One platform, zero complexity. Built for towing companies, by towing experts.
          </p>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-[1200px] mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-white border border-[#e5edf5] rounded-lg p-7 hover:border-[#b9b9f9] hover:shadow-[0_15px_35px_rgba(50,50,93,0.08)] transition-all duration-300">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-[36px] shrink-0">{f.icon}</div>
                <div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.2px] mb-1.5" style={{ fontFeatureSettings: "'ss01'" }}>{f.title}</h3>
                  <p className="text-[14px] text-[#64748d] leading-[1.6] font-light">{f.desc}</p>
                </div>
              </div>
              <ul className="ml-[52px] space-y-1.5">
                {f.details.map((d, j) => (
                  <li key={j} className="flex items-center gap-2.5 text-[13px] text-[#64748d]">
                    <svg className="w-3.5 h-3.5 text-[#15be53] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#f6f9fc] border-y border-[#e5edf5]">
        <div className="max-w-[720px] mx-auto px-6 py-20 text-center">
          <h2 className="text-[32px] font-light tracking-[-0.6px] mb-4" style={{ fontFeatureSettings: "'ss01'" }}>Ready to get started?</h2>
          <p className="text-[17px] font-light text-[#64748d] mb-8">Join the waitlist and be among the first to get access to TowHub.</p>
          <Link href="/" className="inline-block bg-[#533afd] text-white px-8 py-3.5 rounded font-medium text-[15px] hover:bg-[#4434d4] shadow-[0_4px_16px_rgba(83,58,253,0.3)]">
            Request early access →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e5edf5]">
        <div className="max-w-[1200px] mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#533afd] rounded flex items-center justify-center text-white text-xs font-semibold">T</div>
            <span className="text-[15px] font-semibold tracking-tight">TowHub</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[13px] text-[#64748d] hover:text-[#061b31]">Home</Link>
            <a href="#" className="text-[13px] text-[#64748d] hover:text-[#061b31]">Privacy</a>
            <a href="#" className="text-[13px] text-[#64748d] hover:text-[#061b31]">Terms</a>
          </div>
          <div className="text-[13px] text-[#64748d]">© 2024 TowHub. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
