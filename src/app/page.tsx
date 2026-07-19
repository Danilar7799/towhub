"use client";

import { useState } from "react";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const SERVICES = ["Light Duty","Medium Duty","Heavy Duty","Flatbed","Motorcycle","Roadside","Jump Start","Lockout","Tire Change","Fuel Delivery","Winch Out","Accident Recovery","Long Distance","Private Property"];

export default function Home() {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "", contactName: "", email: "", phone: "",
    city: "", state: "CA", fleetSize: "", yearsInBusiness: "",
    servicesOffered: [] as string[], monthlyTowVolume: "",
    website: "", googleBusinessUrl: "", message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) setSubmitted(true);
    } finally { setLoading(false); }
  };

  const toggleService = (s: string) => {
    setForm(f => ({ ...f, servicesOffered: f.servicesOffered.includes(s) ? f.servicesOffered.filter(x => x !== s) : [...f.servicesOffered, s] }));
  };

  return (
    <div className="min-h-screen bg-white text-[#061b31]" style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-[#e5edf5]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#533afd] rounded-md flex items-center justify-center text-white font-semibold text-sm">T</div>
            <span className="text-lg font-semibold tracking-tight">TowHub</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#64748d] hover:text-[#061b31] transition-colors">Features</a>
            <a href="#how" className="text-sm text-[#64748d] hover:text-[#061b31] transition-colors">How it works</a>
            <a href="#pricing" className="text-sm text-[#64748d] hover:text-[#061b31] transition-colors">Pricing</a>
            <a href="/login" className="text-sm text-[#64748d] hover:text-[#061b31] transition-colors">Sign in</a>
            <button onClick={() => setShowWaitlist(true)} className="bg-[#533afd] text-white px-5 py-2 rounded text-sm font-medium hover:bg-[#4434d4] transition-colors">
              Get started
            </button>
          </div>
          <button onClick={() => setShowWaitlist(true)} className="md:hidden bg-[#533afd] text-white px-4 py-2 rounded text-sm font-medium">
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f6f9fc] via-white to-white" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-[#533afd]/20 via-[#f96bee]/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-[720px] mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#533afd]/5 border border-[#533afd]/10 rounded-full px-4 py-1.5 mb-8">
              <div className="w-1.5 h-1.5 bg-[#15be53] rounded-full animate-pulse" />
              <span className="text-xs font-medium text-[#533afd] tracking-wide">Now accepting towing companies</span>
            </div>

            {/* Headline — Stripe style: light weight, tight tracking */}
            <h1 className="text-[48px] md:text-[56px] font-light leading-[1.03] tracking-[-1.4px] mb-6" style={{ fontFeatureSettings: "'ss01'" }}>
              The operating system for
              <br />
              <span className="bg-gradient-to-r from-[#533afd] to-[#f96bee] bg-clip-text text-transparent">towing businesses</span>
            </h1>

            <p className="text-[18px] font-light leading-[1.6] text-[#64748d] max-w-[540px] mx-auto mb-10">
              AI-powered dispatch, real-time fleet tracking, automated lead capture from Yelp & Thumbtack — everything you need to run and grow your towing company.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowWaitlist(true)} className="bg-[#533afd] text-white px-7 py-3 rounded font-medium text-[15px] hover:bg-[#4434d4] transition-all shadow-[0_4px_16px_rgba(83,58,253,0.3)] hover:shadow-[0_6px_24px_rgba(83,58,253,0.4)]">
                Request early access
              </button>
              <a href="#features" className="border border-[#e5edf5] text-[#061b31] px-7 py-3 rounded font-medium text-[15px] hover:border-[#b9b9f9] hover:bg-[#533afd]/[0.02] transition-all">
                See features →
              </a>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="mt-16 md:mt-20 max-w-[960px] mx-auto">
            <div className="bg-white rounded-lg border border-[#e5edf5] shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25),0_30px_60px_-30px_rgba(0,0,0,0.1)] overflow-hidden">
              {/* Browser chrome */}
              <div className="bg-[#f6f9fc] border-b border-[#e5edf5] px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ed6a5e]" />
                  <div className="w-3 h-3 rounded-full bg-[#f5bf4f]" />
                  <div className="w-3 h-3 rounded-full bg-[#62c554]" />
                </div>
                <div className="flex-1 bg-white border border-[#e5edf5] rounded text-center text-xs text-[#64748d] py-1 mx-8">
                  app.towhub.vercel.app/dashboard
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="bg-[#f6f9fc] p-6 md:p-8">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Active Jobs", value: "12", color: "#533afd" },
                    { label: "Drivers Online", value: "8", color: "#15be53" },
                    { label: "Today's Revenue", value: "$2,840", color: "#061b31" },
                    { label: "Pending Leads", value: "5", color: "#ea2261" },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-md border border-[#e5edf5] p-4">
                      <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">{s.label}</div>
                      <div className="text-[28px] font-light tracking-[-0.5px]" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {/* Map placeholder */}
                <div className="bg-white rounded-md border border-[#e5edf5] p-6 flex items-center justify-center h-[200px]">
                  <div className="text-center">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-[#533afd] rounded-full animate-pulse" />
                      <div className="w-3 h-3 bg-[#15be53] rounded-full animate-pulse" />
                      <div className="w-3 h-3 bg-[#f5bf4f] rounded-full animate-pulse" />
                    </div>
                    <div className="text-[13px] text-[#64748d]">Live GPS tracking • Real-time dispatch map</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="border-y border-[#e5edf5] bg-[#f6f9fc]">
        <div className="max-w-[1200px] mx-auto px-6 py-10">
          <div className="text-center text-[13px] text-[#64748d] uppercase tracking-[0.1em] mb-8">Trusted by towing companies across the US</div>
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-40">
            {["LA Tow Pro","Metro Towing","Highway Heroes","QuickPull","CityWide Tow"].map((name, i) => (
              <div key={i} className="text-[18px] font-semibold tracking-tight text-[#061b31]">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-[560px] mb-16">
            <div className="text-[13px] font-medium text-[#533afd] uppercase tracking-[0.1em] mb-4">Features</div>
            <h2 className="text-[36px] md:text-[42px] font-light leading-[1.1] tracking-[-0.8px] mb-5" style={{ fontFeatureSettings: "'ss01'" }}>
              Everything you need to run your towing operation
            </h2>
            <p className="text-[17px] font-light text-[#64748d] leading-[1.6]">
              From dispatch to payment, TowHub handles it all. One platform, zero complexity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🤖", title: "AI Dispatcher", desc: "Bland.ai answers calls 24/7, captures job details, and dispatches the nearest driver automatically." },
              { icon: "📍", title: "Live GPS Tracking", desc: "Real-time driver locations on the map. Know where every truck is, always." },
              { icon: "📋", title: "Job Management", desc: "Create, assign, track jobs through every stage — from dispatch to completion." },
              { icon: "🔗", title: "Lead Capture", desc: "Automatically pull leads from Yelp, Thumbtack, Google, and your Bolt.new website." },
              { icon: "👥", title: "Fleet & Team", desc: "Manage vehicles, assign drivers, track shifts, mileage, earnings, and expenses." },
              { icon: "📞", title: "Google Business", desc: "Connect your Google Business Profile. Customers message you, AI responds." },
            ].map((f, i) => (
              <div key={i} className="group bg-white border border-[#e5edf5] rounded-lg p-7 hover:border-[#b9b9f9] hover:shadow-[0_15px_35px_rgba(50,50,93,0.08)] transition-all duration-300">
                <div className="text-[32px] mb-5">{f.icon}</div>
                <h3 className="text-[17px] font-semibold mb-2 tracking-[-0.2px]">{f.title}</h3>
                <p className="text-[15px] text-[#64748d] leading-[1.6] font-light">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark section — How it works */}
      <section id="how" className="bg-[#1c1e54] py-24 md:py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[13px] font-medium text-[#b9b9f9] uppercase tracking-[0.1em] mb-4">How it works</div>
            <h2 className="text-[36px] md:text-[42px] font-light text-white leading-[1.1] tracking-[-0.8px]" style={{ fontFeatureSettings: "'ss01'" }}>
              From application to growth
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Apply", desc: "Fill out the waitlist form with your company details and services." },
              { step: "02", title: "Get approved", desc: "We review your application and set up your account within 24 hours." },
              { step: "03", title: "Set up", desc: "Add your fleet, invite drivers, connect your phone and Google Business." },
              { step: "04", title: "Grow", desc: "Start receiving leads, dispatch with AI, and track everything in real-time." },
            ].map((s, i) => (
              <div key={i} className="text-center md:text-left">
                <div className="text-[13px] font-mono text-[#533afd] mb-3">{s.step}</div>
                <h3 className="text-[20px] font-medium text-white mb-2 tracking-[-0.2px]">{s.title}</h3>
                <p className="text-[15px] text-white/60 leading-[1.6] font-light">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[13px] font-medium text-[#533afd] uppercase tracking-[0.1em] mb-4">Pricing</div>
            <h2 className="text-[36px] md:text-[42px] font-light leading-[1.1] tracking-[-0.8px] mb-5" style={{ fontFeatureSettings: "'ss01'" }}>
              Simple, transparent pricing
            </h2>
            <p className="text-[17px] font-light text-[#64748d]">We succeed when you succeed. Pay only a small commission on leads we send you.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-[1000px] mx-auto">
            {[
              { name: "Starter", price: "$0", period: "/month + 15% commission", features: ["Up to 5 drivers","Basic dispatch","GPS tracking","Lead capture","Email support"], cta: "Get started", highlight: false },
              { name: "Professional", price: "$99", period: "/month + 10% commission", features: ["Up to 20 drivers","AI Dispatcher (Bland.ai)","Google Business integration","Advanced analytics","Priority support","Custom phone number"], cta: "Get started", highlight: true },
              { name: "Enterprise", price: "Custom", period: "volume pricing", features: ["Unlimited drivers","White-label option","Custom integrations","Dedicated account manager","SLA guarantee","API access"], cta: "Contact sales", highlight: false },
            ].map((plan, i) => (
              <div key={i} className={`relative rounded-lg p-8 border ${plan.highlight ? "border-[#533afd] shadow-[0_30px_60px_-20px_rgba(83,58,253,0.2)] bg-white" : "border-[#e5edf5] bg-white"}`}>
                {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#533afd] text-white text-[11px] font-medium px-3 py-1 rounded-full uppercase tracking-wider">Most popular</div>}
                <h3 className="text-[20px] font-semibold tracking-[-0.3px] mb-1">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-[36px] font-light tracking-[-1px]">{plan.price}</span>
                  <span className="text-[14px] text-[#64748d] ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-[14px] text-[#64748d]">
                      <svg className="w-4 h-4 text-[#15be53] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => setShowWaitlist(true)} className={`w-full py-3 rounded text-[15px] font-medium transition-all ${plan.highlight ? "bg-[#533afd] text-white hover:bg-[#4434d4] shadow-[0_4px_16px_rgba(83,58,253,0.3)]" : "border border-[#e5edf5] text-[#061b31] hover:border-[#b9b9f9]"}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#f6f9fc] border-y border-[#e5edf5]">
        <div className="max-w-[720px] mx-auto px-6 py-20 text-center">
          <h2 className="text-[32px] font-light tracking-[-0.6px] mb-4" style={{ fontFeatureSettings: "'ss01'" }}>Ready to grow your towing business?</h2>
          <p className="text-[17px] font-light text-[#64748d] mb-8">Join the waitlist and be among the first to get access.</p>
          <button onClick={() => setShowWaitlist(true)} className="bg-[#533afd] text-white px-8 py-3.5 rounded font-medium text-[15px] hover:bg-[#4434d4] transition-all shadow-[0_4px_16px_rgba(83,58,253,0.3)]">
            Request early access →
          </button>
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
            <a href="#" className="text-[13px] text-[#64748d] hover:text-[#061b31]">Privacy</a>
            <a href="#" className="text-[13px] text-[#64748d] hover:text-[#061b31]">Terms</a>
            <a href="#" className="text-[13px] text-[#64748d] hover:text-[#061b31]">Contact</a>
          </div>
          <div className="text-[13px] text-[#64748d]">© 2024 TowHub. All rights reserved.</div>
        </div>
      </footer>

      {/* Waitlist Modal */}
      {showWaitlist && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowWaitlist(false)}>
          <div className="bg-white rounded-lg max-w-[560px] w-full max-h-[90vh] overflow-y-auto shadow-[0_50px_100px_-20px_rgba(50,50,93,0.25)]" onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div className="p-12 text-center">
                <div className="text-[48px] mb-4">✓</div>
                <h2 className="text-[24px] font-semibold tracking-[-0.5px] mb-3">Application submitted</h2>
                <p className="text-[15px] text-[#64748d] mb-8">We&apos;ll review your application and get back to you within 24 hours.</p>
                <button onClick={() => { setShowWaitlist(false); setSubmitted(false); }} className="bg-[#533afd] text-white px-6 py-2.5 rounded text-[14px] font-medium">
                  Close
                </button>
              </div>
            ) : (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Join the waitlist</h2>
                  <button onClick={() => setShowWaitlist(false)} className="text-[#64748d] hover:text-[#061b31] text-xl">×</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-[13px] font-medium text-[#273951] mb-1.5">Company name *</label><input required value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
                    <div><label className="block text-[13px] font-medium text-[#273951] mb-1.5">Contact name *</label><input required value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
                    <div><label className="block text-[13px] font-medium text-[#273951] mb-1.5">Email *</label><input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
                    <div><label className="block text-[13px] font-medium text-[#273951] mb-1.5">Phone *</label><input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
                    <div><label className="block text-[13px] font-medium text-[#273951] mb-1.5">City *</label><input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
                    <div><label className="block text-[13px] font-medium text-[#273951] mb-1.5">State *</label><select required value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none">{US_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div><label className="block text-[13px] font-medium text-[#273951] mb-1.5">Fleet size</label><input type="number" value={form.fleetSize} onChange={e => setForm(f => ({ ...f, fleetSize: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
                    <div><label className="block text-[13px] font-medium text-[#273951] mb-1.5">Years in business</label><input type="number" value={form.yearsInBusiness} onChange={e => setForm(f => ({ ...f, yearsInBusiness: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" /></div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#273951] mb-1.5">Google Business URL</label>
                    <input value={form.googleBusinessUrl} onChange={e => setForm(f => ({ ...f, googleBusinessUrl: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" placeholder="https://maps.google.com/..." />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#273951] mb-2">Services offered</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SERVICES.map(s => (
                        <button key={s} type="button" onClick={() => toggleService(s)}
                          className={`px-2.5 py-1 rounded text-[12px] font-medium border transition-colors ${form.servicesOffered.includes(s) ? "bg-[#533afd]/10 border-[#533afd]/30 text-[#533afd]" : "bg-white border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#273951] mb-1.5">Anything else?</label>
                    <textarea rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none resize-none" />
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-[#533afd] text-white py-3 rounded text-[15px] font-medium hover:bg-[#4434d4] disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(83,58,253,0.3)]">
                    {loading ? "Submitting..." : "Submit application"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
