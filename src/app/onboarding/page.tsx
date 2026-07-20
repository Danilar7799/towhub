"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WizardStep {
  id: string;
  title: string;
  icon: string;
  description: string;
}

const STEPS: WizardStep[] = [
  { id: "company", title: "Company Info", icon: "🏢", description: "Tell us about your towing company" },
  { id: "fleet", title: "Your Fleet", icon: "🚛", description: "Add your first vehicles" },
  { id: "team", title: "Team", icon: "👥", description: "Invite your drivers and dispatchers" },
  { id: "services", title: "Services & Rates", icon: "💲", description: "Set up your services and pricing" },
  { id: "integrations", title: "Integrations", icon: "🔌", description: "Connect your favorite tools" },
  { id: "ready", title: "You're Ready!", icon: "🎉", description: "Start receiving jobs and growing" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Company
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [mcNumber, setMcNumber] = useState("");
  const [dotNumber, setDotNumber] = useState("");

  // Fleet
  const [vehicles, setVehicles] = useState([{ name: "Truck #1", type: "flatbed" }]);

  // Team
  const [teamEmails, setTeamEmails] = useState([""]);

  // Services
  const [services, setServices] = useState<string[]>(["Light Duty", "Heavy Duty", "Roadside"]);

  const ALL_SERVICES = ["Light Duty", "Medium Duty", "Heavy Duty", "Flatbed", "Motorcycle", "Roadside", "Jump Start", "Lockout", "Tire Change", "Fuel Delivery", "Winch Out", "Accident Recovery", "Long Distance"];

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const next = () => { if (step < STEPS.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const saveAndNext = async () => {
    setSaving(true);
    try {
      // Save company info
      if (step === 0) {
        await fetch("/api/org/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: companyName, phone, address, city, state, settings: { mcNumber, dotNumber } }),
        });
      }
      next();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    // Mark onboarding as complete
    try {
      await fetch("/api/org/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { onboardingComplete: true } }),
      });
    } catch (e) {}
    router.push("/dashboard");
  };

  const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

  return (
    <div className="min-h-screen bg-[#f6f9fc]" style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-[#e5edf5]">
        <div className="max-w-[800px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#533afd] rounded-md flex items-center justify-center text-white font-semibold text-sm">T</div>
            <span className="text-[16px] font-semibold tracking-tight">TowHub Setup</span>
          </div>
          <button onClick={() => router.push("/dashboard")} className="text-[12px] text-[#64748d] hover:text-[#061b31]">
            Skip setup →
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-[#e5edf5]">
          <div className="h-full bg-[#533afd] transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-6 py-10">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium ${
                i < step ? "bg-[#15be53] text-white" :
                i === step ? "bg-[#533afd] text-white" :
                "bg-[#e5edf5] text-[#64748d]"
              }`}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-[#15be53]" : "bg-[#e5edf5]"}`} />}
            </div>
          ))}
        </div>

        {/* Step title */}
        <div className="mb-8">
          <div className="text-[32px] mb-2">{currentStep.icon}</div>
          <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-[#061b31]">{currentStep.title}</h1>
          <p className="text-[15px] text-[#64748d] mt-1">{currentStep.description}</p>
        </div>

        {/* Step content */}
        <div className="bg-white border border-[#e5edf5] rounded-lg p-6 mb-8">
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Company Name *</label><input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Metro Towing LLC" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Phone *</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1-555-000-0000" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              </div>
              <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">Address</label><input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">City</label><input value={city} onChange={e => setCity(e.target.value)} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">State</label><select value={state} onChange={e => setState(e.target.value)} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none">{US_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">ZIP</label><input className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
              </div>
              <div className="border-t border-[#e5edf5] pt-4">
                <div className="text-[13px] font-medium text-[#061b31] mb-3">📋 Licensing (Optional — add later if needed)</div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">MC Number</label><input value={mcNumber} onChange={e => setMcNumber(e.target.value)} placeholder="MC-123456" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                  <div><label className="block text-[12px] font-medium text-[#273951] mb-1.5">DOT Number</label><input value={dotNumber} onChange={e => setDotNumber(e.target.value)} placeholder="12345678" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" /></div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="text-[13px] text-[#64748d] mb-2">Add your tow trucks. You can always add more later from Fleet Management.</div>
              {vehicles.map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input value={v.name} onChange={e => { const nv = [...vehicles]; nv[i].name = e.target.value; setVehicles(nv); }} placeholder="Truck name" className="flex-1 px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                  <select value={v.type} onChange={e => { const nv = [...vehicles]; nv[i].type = e.target.value; setVehicles(nv); }} className="px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none">
                    {["flatbed", "wheel_lift", "heavy_duty", "medium_duty", "motorcycle"].map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                  {vehicles.length > 1 && <button onClick={() => setVehicles(vehicles.filter((_, j) => j !== i))} className="text-[#dc2626] text-[12px]">✕</button>}
                </div>
              ))}
              <button onClick={() => setVehicles([...vehicles, { name: `Truck #${vehicles.length + 1}`, type: "flatbed" }])} className="text-[13px] text-[#533afd] font-medium hover:underline">+ Add another vehicle</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-[13px] text-[#64748d] mb-2">Invite your team members. They'll receive login credentials.</div>
              {teamEmails.map((email, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input value={email} onChange={e => { const ne = [...teamEmails]; ne[i] = e.target.value; setTeamEmails(ne); }} placeholder="driver@email.com" type="email" className="flex-1 px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                  <select className="px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none">
                    <option value="driver">Driver</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="admin">Admin</option>
                  </select>
                  {teamEmails.length > 1 && <button onClick={() => setTeamEmails(teamEmails.filter((_, j) => j !== i))} className="text-[#dc2626] text-[12px]">✕</button>}
                </div>
              ))}
              <button onClick={() => setTeamEmails([...teamEmails, ""])} className="text-[13px] text-[#533afd] font-medium hover:underline">+ Add another member</button>
              <div className="text-[11px] text-[#94a3b8] mt-2">You can skip this and invite team members later.</div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-[13px] text-[#64748d] mb-2">Select the services you offer. This helps us match you with the right leads.</div>
              <div className="flex flex-wrap gap-2">
                {ALL_SERVICES.map(s => (
                  <button key={s} type="button" onClick={() => setServices(sv => sv.includes(s) ? sv.filter(x => x !== s) : [...sv, s])}
                    className={`px-3 py-1.5 rounded text-[12px] font-medium border transition-colors ${services.includes(s) ? "bg-[#533afd]/10 border-[#533afd]/30 text-[#533afd]" : "bg-white border-[#e5edf5] text-[#64748d] hover:border-[#b9b9f9]"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="border-t border-[#e5edf5] pt-4">
                <div className="text-[13px] font-medium text-[#061b31] mb-3">💲 Default Rates (per mile)</div>
                <div className="grid grid-cols-3 gap-4">
                  {["Light Duty", "Heavy Duty", "Flatbed"].map(s => (
                    <div key={s}>
                      <label className="block text-[12px] font-medium text-[#273951] mb-1.5">{s}</label>
                      <input type="number" placeholder="$3.50" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="text-[13px] text-[#64748d] mb-2">Connect your favorite tools. You can always do this later from Settings.</div>
              {[
                { icon: "🔨", name: "Copart", desc: "Auto auction listings", connected: false },
                { icon: "🚗", name: "IAA", desc: "Insurance auto auctions", connected: false },
                { icon: "🤖", name: "Bland.ai", desc: "AI phone dispatcher", connected: false },
                { icon: "📱", name: "Twilio", desc: "SMS notifications", connected: false },
                { icon: "🔵", name: "Google Business", desc: "Lead capture", connected: false },
                { icon: "📊", name: "QuickBooks", desc: "Accounting sync", connected: false },
              ].map(int => (
                <div key={int.name} className="flex items-center justify-between p-3 border border-[#e5edf5] rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-[20px]">{int.icon}</span>
                    <div>
                      <div className="text-[13px] font-medium text-[#061b31]">{int.name}</div>
                      <div className="text-[11px] text-[#64748d]">{int.desc}</div>
                    </div>
                  </div>
                  <button className="text-[12px] text-[#533afd] font-medium px-3 py-1 border border-[#533afd]/20 rounded hover:bg-[#533afd]/[0.04]">
                    Connect
                  </button>
                </div>
              ))}
              <div className="text-[11px] text-[#94a3b8]">All integrations are optional. Connect them when you're ready.</div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-8">
              <div className="text-[48px] mb-4">🎉</div>
              <h2 className="text-[24px] font-semibold tracking-[-0.5px] text-[#061b31] mb-2">You're all set!</h2>
              <p className="text-[15px] text-[#64748d] mb-8 max-w-[400px] mx-auto">
                Your TowHub dashboard is ready. Start by creating your first job, adding more vehicles, or inviting your team.
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-[500px] mx-auto">
                {[
                  { icon: "📋", label: "Create a Job", href: "/dashboard/jobs" },
                  { icon: "🚛", label: "Add Vehicles", href: "/dashboard/fleet" },
                  { icon: "👥", label: "Invite Team", href: "/dashboard/drivers" },
                ].map(a => (
                  <a key={a.label} href={a.href} className="p-4 border border-[#e5edf5] rounded-lg hover:border-[#b9b9f9] transition-colors">
                    <div className="text-[24px] mb-2">{a.icon}</div>
                    <div className="text-[12px] font-medium text-[#061b31]">{a.label}</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button onClick={prev} disabled={step === 0}
            className="px-5 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc] disabled:opacity-30 disabled:cursor-not-allowed">
            ← Back
          </button>
          <div className="text-[12px] text-[#94a3b8]">Step {step + 1} of {STEPS.length}</div>
          {step < STEPS.length - 1 ? (
            <button onClick={saveAndNext} disabled={saving}
              className="bg-[#533afd] text-white px-5 py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4] disabled:opacity-50 transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
              {saving ? "Saving..." : "Continue →"}
            </button>
          ) : (
            <button onClick={finish}
              className="bg-[#15be53] text-white px-5 py-2.5 rounded text-[13px] font-medium hover:bg-[#12a347] transition-colors shadow-[0_2px_8px_rgba(21,190,83,0.2)]">
              Go to Dashboard →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
