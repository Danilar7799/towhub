"use client";

import { useState } from "react";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const SERVICES = ["Light Duty Towing", "Medium Duty Towing", "Heavy Duty Towing", "Flatbed Towing", "Motorcycle Towing", "Roadside Assistance", "Jump Starts", "Lockouts", "Tire Changes", "Fuel Delivery", "Winch Out", "Accident Recovery", "Long Distance Towing", "Private Property Impound"];

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
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (s: string) => {
    setForm(f => ({
      ...f,
      servicesOffered: f.servicesOffered.includes(s)
        ? f.servicesOffered.filter(x => x !== s)
        : [...f.servicesOffered, s],
    }));
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-xl font-black">T</div>
            <span className="text-2xl font-bold">TowHub</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-blue-200 hover:text-white">Login</a>
            <button onClick={() => setShowWaitlist(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg font-semibold">
              Join Waitlist
            </button>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-block bg-amber-500/20 text-amber-300 px-4 py-1 rounded-full text-sm font-medium mb-6">
              🚛 Built for towing companies, by towing experts
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
              Run Your Towing Business<br />
              <span className="text-amber-400">Like a Pro</span>
            </h1>
            <p className="text-xl text-blue-200 mb-10 max-w-2xl">
              AI-powered dispatch, real-time fleet tracking, automated lead capture from Yelp & Thumbtack, 
              driver management, and everything your towing company needs — in one platform.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => setShowWaitlist(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg shadow-amber-500/30">
                Get Early Access →
              </button>
              <a href="#features" className="border-2 border-blue-400 text-blue-200 hover:bg-blue-800 px-8 py-4 rounded-xl text-lg font-semibold">
                See Features
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div><div className="text-3xl font-black text-blue-900">50+</div><div className="text-gray-500">Towing Companies</div></div>
          <div><div className="text-3xl font-black text-blue-900">10K+</div><div className="text-gray-500">Jobs Completed</div></div>
          <div><div className="text-3xl font-black text-blue-900">35%</div><div className="text-gray-500">More Leads</div></div>
          <div><div className="text-3xl font-black text-blue-900">24/7</div><div className="text-gray-500">AI Dispatch</div></div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-black text-center mb-4">Everything You Need</h2>
        <p className="text-gray-500 text-center mb-16 max-w-2xl mx-auto">One platform to manage your entire towing operation — from dispatch to payment.</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: "🤖", title: "AI Dispatcher", desc: "Bland.ai answers calls 24/7, captures job details, and dispatches the nearest driver automatically." },
            { icon: "📍", title: "Live GPS Tracking", desc: "Real-time driver locations on the map. Know where every truck is, always." },
            { icon: "📋", title: "Job Management", desc: "Create, assign, track jobs through every stage — from dispatch to completion." },
            { icon: "🔗", title: "Lead Capture", desc: "Automatically pull leads from Yelp, Thumbtack, Google Business. Never miss a customer." },
            { icon: "👥", title: "Fleet & Driver Mgmt", desc: "Manage vehicles, assign drivers, track shifts, mileage, earnings, and expenses." },
            { icon: "📞", title: "Google Business Chat", desc: "Connect your Google Business Profile. Customers message you, AI responds." },
            { icon: "💰", title: "Earnings & Expenses", desc: "Track revenue per job, per driver. Log fuel, maintenance, tolls — all in one place." },
            { icon: "📊", title: "Analytics Dashboard", desc: "See your business at a glance — revenue, job volume, driver performance, trends." },
            { icon: "⚡", title: "Instant Notifications", desc: "Get alerts via Telegram, SMS, or push when new leads come in or jobs are completed." },
          ].map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border hover:shadow-lg hover:border-blue-200 transition-all">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-black text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Apply", desc: "Fill out the waitlist form with your company details." },
              { step: "2", title: "Get Approved", desc: "We review your application and set up your account." },
              { step: "3", title: "Set Up", desc: "Add your fleet, drivers, and connect your phone/Google Business." },
              { step: "4", title: "Grow", desc: "Start receiving leads, dispatch with AI, and track everything." },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-4">{s.step}</div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-blue-300">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-black text-center mb-4">Simple Pricing</h2>
        <p className="text-gray-500 text-center mb-16">We succeed when you succeed. Pay only a small commission on leads we send you.</p>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { name: "Starter", price: "$0", period: "/month + 15% commission", features: ["Up to 5 drivers", "Basic dispatch", "GPS tracking", "Lead capture (Yelp + Thumbtack)", "Email support"], cta: "Join Waitlist", highlight: false },
            { name: "Professional", price: "$99", period: "/month + 10% commission", features: ["Up to 20 drivers", "AI Dispatcher (Bland.ai)", "Google Business integration", "Advanced analytics", "Priority support", "Custom phone number"], cta: "Join Waitlist", highlight: true },
            { name: "Enterprise", price: "Custom", period: "volume pricing", features: ["Unlimited drivers", "White-label option", "Custom integrations", "Dedicated account manager", "SLA guarantee", "API access"], cta: "Contact Us", highlight: false },
          ].map((plan, i) => (
            <div key={i} className={`rounded-2xl p-8 border-2 ${plan.highlight ? "border-amber-500 bg-amber-50 shadow-xl scale-105" : "border-gray-200 bg-white"}`}>
              {plan.highlight && <div className="bg-amber-500 text-white text-sm font-bold px-3 py-1 rounded-full inline-block mb-4">Most Popular</div>}
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-gray-500">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2"><span className="text-green-500">✓</span> {f}</li>
                ))}
              </ul>
              <button onClick={() => setShowWaitlist(true)} className={`w-full py-3 rounded-xl font-bold ${plan.highlight ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-20 text-center">
        <h2 className="text-4xl font-black mb-4">Ready to Grow Your Towing Business?</h2>
        <p className="text-xl mb-8 opacity-90">Join the waitlist and be among the first to get access.</p>
        <button onClick={() => setShowWaitlist(true)} className="bg-white text-orange-600 px-10 py-4 rounded-xl text-lg font-bold hover:bg-gray-100">
          Apply Now →
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white font-black text-sm">T</div>
            <span className="text-white font-bold">TowHub</span>
          </div>
          <div>© 2024 TowHub. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>

      {/* Waitlist Modal */}
      {showWaitlist && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowWaitlist(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-black mb-4">Application Submitted!</h2>
                <p className="text-gray-500 mb-8">We&apos;ll review your application and get back to you within 24-48 hours.</p>
                <button onClick={() => { setShowWaitlist(false); setSubmitted(false); }} className="bg-blue-900 text-white px-8 py-3 rounded-xl font-bold">
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black">Join the Waitlist</h2>
                  <button onClick={() => setShowWaitlist(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                      <input required value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                      <input required value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                      <input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                      <input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                      <select required value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fleet Size</label>
                      <input type="number" value={form.fleetSize} onChange={e => setForm(f => ({ ...f, fleetSize: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business</label>
                      <input type="number" value={form.yearsInBusiness} onChange={e => setForm(f => ({ ...f, yearsInBusiness: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Tow Volume</label>
                      <input type="number" value={form.monthlyTowVolume} onChange={e => setForm(f => ({ ...f, monthlyTowVolume: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Google Business URL</label>
                    <input value={form.googleBusinessUrl} onChange={e => setForm(f => ({ ...f, googleBusinessUrl: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="https://maps.google.com/..." />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Services Offered</label>
                    <div className="flex flex-wrap gap-2">
                      {SERVICES.map(s => (
                        <button key={s} type="button" onClick={() => toggleService(s)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border ${form.servicesOffered.includes(s) ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-blue-300"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anything else?</label>
                    <textarea rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl text-lg font-bold disabled:opacity-50">
                    {loading ? "Submitting..." : "Submit Application →"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
