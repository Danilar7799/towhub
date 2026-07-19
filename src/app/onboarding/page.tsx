"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  { title: "Company Info", icon: "🏢" },
  { title: "Fleet & Drivers", icon: "🚛" },
  { title: "Licenses & Compliance", icon: "📜" },
  { title: "Impound & Lot", icon: "🅿️" },
  { title: "Services & Features", icon: "⚙️" },
  { title: "Owner & Contact", icon: "👤" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    // Step 1: Company
    companyName: "", address: "", city: "", state: "", zip: "", phone: "", website: "",
    // Step 2: Fleet
    fleetSize: "", driverCount: "", scheduleType: "24_7", // 24_7, day_only, custom
    hasSubcontractors: false,
    // Step 3: Licenses
    hasPoliceRotation: false, policeDepartments: "",
    hasImpoundLicense: false, impoundLicenseNumber: "",
    hasBusinessLicense: false, insuranceProvider: "", insuranceExpiry: "",
    // Step 4: Impound
    hasImpoundLot: false, lotAddress: "", lotCapacity: "", lotSpots: "",
    needsImpoundTracking: false, needsPoliceForms: false, needsAuctionListing: false,
    // Step 5: Services
    hasWebsite: false, websiteUrl: "",
    needsAiDispatcher: false, needsCashCalls: false, cashCallPercent: "",
    needsAiDocuments: false, needsLeadCapture: false,
    // Step 6: Owner
    ownerName: "", ownerEmail: "", ownerPhone: "",
    emergencyContact: "", emergencyPhone: "",
  });

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const finish = async () => {
    setSaving(true);
    // Save onboarding data to org settings
    await fetch("/api/org/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    router.push("/dashboard");
  };

  const Input = ({ label, field, type = "text", placeholder = "", required = false }: { label: string; field: string; type?: string; placeholder?: string; required?: boolean }) => (
    <div>
      <label className="block text-[12px] font-medium text-[#273951] mb-1">{label} {required && "*"}</label>
      <input type={type} value={form[field as keyof typeof form] as string} onChange={e => update(field, e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" />
    </div>
  );

  const Toggle = ({ label, desc, field }: { label: string; desc?: string; field: string }) => (
    <div className="flex items-center justify-between p-3 border border-[#e5edf5] rounded-lg hover:border-[#b9b9f9] transition-colors">
      <div>
        <div className="text-[13px] font-medium">{label}</div>
        {desc && <div className="text-[11px] text-[#64748d]">{desc}</div>}
      </div>
      <button onClick={() => update(field, !form[field as keyof typeof form])}
        className={`w-10 h-6 rounded-full transition-colors relative ${form[field as keyof typeof form] ? "bg-[#533afd]" : "bg-[#e5edf5]"}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form[field as keyof typeof form] ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );

  const Select = ({ label, field, options }: { label: string; field: string; options: { value: string; label: string }[] }) => (
    <div>
      <label className="block text-[12px] font-medium text-[#273951] mb-1">{label}</label>
      <select value={form[field as keyof typeof form] as string} onChange={e => update(field, e.target.value)}
        className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] outline-none">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex items-center justify-center p-4" style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      <div className="w-full max-w-[640px]">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium transition-colors ${i <= step ? "bg-[#533afd] text-white" : "bg-[#e5edf5] text-[#94a3b8]"}`}>
                {i < step ? "✓" : s.icon}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-[#533afd]" : "bg-[#e5edf5]"}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white border border-[#e5edf5] rounded-lg shadow-[0_15px_35px_rgba(50,50,93,0.08)]">
          <div className="px-8 pt-8 pb-4 border-b border-[#e5edf5]">
            <h2 className="text-[20px] font-semibold tracking-[-0.3px]">{STEPS[step].icon} {STEPS[step].title}</h2>
            <p className="text-[13px] text-[#64748d] mt-1">Step {step + 1} of {STEPS.length}</p>
          </div>

          <div className="px-8 py-6 space-y-4 min-h-[320px]">
            {/* Step 1: Company Info */}
            {step === 0 && (
              <>
                <Input label="Company Name" field="companyName" required />
                <Input label="Address" field="address" />
                <div className="grid grid-cols-3 gap-3">
                  <Input label="City" field="city" />
                  <Input label="State" field="state" placeholder="CA" />
                  <Input label="ZIP" field="zip" />
                </div>
                <Input label="Phone" field="phone" type="tel" />
                <Input label="Website" field="website" placeholder="https://..." />
              </>
            )}

            {/* Step 2: Fleet & Drivers */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Fleet Size" field="fleetSize" type="number" placeholder="How many trucks?" />
                  <Input label="Driver Count" field="driverCount" type="number" placeholder="How many drivers?" />
                </div>
                <Select label="Work Schedule" field="scheduleType" options={[
                  { value: "24_7", label: "24/7 Operations" },
                  { value: "day_only", label: "Day Shift Only" },
                  { value: "custom", label: "Custom Schedule" },
                ]} />
                <Toggle label="Use Subcontractors?" desc="Partner towing companies for overflow work" field="hasSubcontractors" />
              </>
            )}

            {/* Step 3: Licenses */}
            {step === 2 && (
              <>
                <Toggle label="Police Rotation List?" desc="Are you on any police department rotation lists?" field="hasPoliceRotation" />
                {form.hasPoliceRotation && (
                  <Input label="Departments" field="policeDepartments" placeholder="LAPD, CHP, Sheriff..." />
                )}
                <Toggle label="Impound License?" desc="Licensed to operate an impound/storage lot" field="hasImpoundLicense" />
                {form.hasImpoundLicense && (
                  <Input label="License Number" field="impoundLicenseNumber" />
                )}
                <Toggle label="Business License?" field="hasBusinessLicense" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Insurance Provider" field="insuranceProvider" />
                  <Input label="Insurance Expiry" field="insuranceExpiry" type="date" />
                </div>
              </>
            )}

            {/* Step 4: Impound & Lot */}
            {step === 3 && (
              <>
                <Toggle label="Have Impound Lot?" desc="Physical storage/parking lot for impounded vehicles" field="hasImpoundLot" />
                {form.hasImpoundLot && (
                  <>
                    <Input label="Lot Address" field="lotAddress" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input label="Capacity (vehicles)" field="lotCapacity" type="number" />
                      <Input label="Current Spots" field="lotSpots" type="number" />
                    </div>
                  </>
                )}
                <Toggle label="Need Impound Tracking?" desc="Track stored vehicles, charges, releases" field="needsImpoundTracking" />
                <Toggle label="Need Police Forms?" desc="Auto-fill and send forms to police departments" field="needsPoliceForms" />
                <Toggle label="Need Auction Listings?" desc="Manage auction of unclaimed vehicles" field="needsAuctionListing" />
              </>
            )}

            {/* Step 5: Services */}
            {step === 4 && (
              <>
                <Toggle label="Have a Website?" field="hasWebsite" />
                {form.hasWebsite && <Input label="Website URL" field="websiteUrl" placeholder="https://..." />}
                <Toggle label="AI Dispatcher?" desc="AI answers calls 24/7 and dispatches drivers (Bland.ai)" field="needsAiDispatcher" />
                <Toggle label="Cash Calls for %?" desc="Handle cash-paying customers for a commission" field="needsCashCalls" />
                {form.needsCashCalls && <Input label="Commission %" field="cashCallPercent" type="number" placeholder="15" />}
                <Toggle label="AI Document Workflow?" desc="Auto-generate invoices, receipts, police forms" field="needsAiDocuments" />
                <Toggle label="Lead Capture?" desc="Auto-import leads from Yelp, Thumbtack, Google" field="needsLeadCapture" />
              </>
            )}

            {/* Step 6: Owner */}
            {step === 5 && (
              <>
                <Input label="Owner Full Name" field="ownerName" required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Email" field="ownerEmail" type="email" required />
                  <Input label="Phone" field="ownerPhone" type="tel" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Emergency Contact" field="emergencyContact" />
                  <Input label="Emergency Phone" field="emergencyPhone" type="tel" />
                </div>
                <div className="bg-[#f6f9fc] rounded-lg p-4 text-[12px] text-[#64748d]">
                  <div className="font-medium text-[#273951] mb-1">📋 Summary</div>
                  <div>Company: {form.companyName || "—"}</div>
                  <div>Fleet: {form.fleetSize || 0} vehicles, {form.driverCount || 0} drivers</div>
                  <div>Schedule: {form.scheduleType === "24_7" ? "24/7" : form.scheduleType === "day_only" ? "Day only" : "Custom"}</div>
                  <div>Impound: {form.hasImpoundLot ? "Yes" : "No"} • Police Rotation: {form.hasPoliceRotation ? "Yes" : "No"}</div>
                  <div>AI Dispatcher: {form.needsAiDispatcher ? "Yes" : "No"} • Lead Capture: {form.needsLeadCapture ? "Yes" : "No"}</div>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="px-8 py-5 border-t border-[#e5edf5] flex items-center justify-between">
            <button onClick={prev} disabled={step === 0}
              className="px-5 py-2 border border-[#e5edf5] rounded text-[13px] font-medium disabled:opacity-30">
              Back
            </button>
            <div className="text-[12px] text-[#94a3b8]">{step + 1} / {STEPS.length}</div>
            {step < STEPS.length - 1 ? (
              <button onClick={next} className="px-5 py-2 bg-[#533afd] text-white rounded text-[13px] font-medium">
                Next
              </button>
            ) : (
              <button onClick={finish} disabled={saving} className="px-5 py-2 bg-[#15be53] text-white rounded text-[13px] font-medium">
                {saving ? "Saving..." : "Finish Setup ✓"}
              </button>
            )}
          </div>
        </div>

        <div className="text-center mt-4">
          <button onClick={() => router.push("/dashboard")} className="text-[12px] text-[#64748d] hover:text-[#533afd]">Skip for now</button>
        </div>
      </div>
    </div>
  );
}
