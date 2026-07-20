"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/lib/toast";

interface Plan {
  name: string; price: number | null; commission: number; maxDrivers: number; features: string[];
}

export default function BillingPage() {
  const toast = useToast();
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [currentPlan, setCurrentPlan] = useState("starter");

  useEffect(() => {
    fetch("/api/billing").then(r => r.json()).then(d => setPlans(d.plans || {}));
    // Get current plan from org settings
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      const org = d.org;
      if (org?.settings?.plan) setCurrentPlan(org.settings.plan);
    });
  }, []);

  const selectPlan = async (planKey: string) => {
    const res = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: planKey }) });
    const data = await res.json();
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      toast.info(data.message || "Done");
    }
  };

  return (
    <div className="space-y-6 max-w-[900px]" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Billing</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Manage your subscription and billing.</p>
      </div>

      {/* Current plan */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[11px] font-medium text-[#64748d] uppercase tracking-wider mb-2">Current Plan</div>
        <div className="text-[24px] font-semibold capitalize">{plans[currentPlan]?.name || "Starter"}</div>
        <div className="text-[14px] text-[#64748d] mt-1">
          {plans[currentPlan]?.price ? `$${plans[currentPlan].price}/month` : "Free"} • {plans[currentPlan]?.commission}% commission on leads
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(plans).map(([key, plan]) => (
          <div key={key} className={`bg-white border rounded-lg p-6 ${key === currentPlan ? "border-[#533afd] shadow-[0_8px_24px_rgba(83,58,253,0.1)]" : "border-[#e5edf5]"}`}>
            {key === "professional" && <div className="text-[10px] font-medium text-[#533afd] uppercase tracking-wider mb-2">Most Popular</div>}
            <h3 className="text-[18px] font-semibold">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-[32px] font-light">{plan.price !== null ? `$${plan.price}` : "Custom"}</span>
              {plan.price !== null && <span className="text-[14px] text-[#64748d]">/month</span>}
            </div>
            <div className="text-[13px] text-[#64748d] mb-4">{plan.commission}% commission • {plan.maxDrivers === -1 ? "Unlimited" : plan.maxDrivers} drivers</div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-[13px] text-[#64748d]">
                  <svg className="w-3.5 h-3.5 text-[#15be53]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => selectPlan(key)}
              disabled={key === currentPlan}
              className={`w-full py-2.5 rounded text-[13px] font-medium transition-colors ${
                key === currentPlan
                  ? "bg-[#f6f9fc] text-[#94a3b8] cursor-default"
                  : key === "professional"
                  ? "bg-[#533afd] text-white hover:bg-[#4434d4]"
                  : "border border-[#e5edf5] text-[#061b31] hover:border-[#b9b9f9]"
              }`}>
              {key === currentPlan ? "Current Plan" : key === "enterprise" ? "Contact Sales" : "Upgrade"}
            </button>
          </div>
        ))}
      </div>

      {/* Usage */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium mb-4">Usage This Month</div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">Leads Received</div>
            <div className="text-[24px] font-light">0</div>
          </div>
          <div>
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">Commission Owed</div>
            <div className="text-[24px] font-light">$0</div>
          </div>
          <div>
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">API Calls</div>
            <div className="text-[24px] font-light">0</div>
          </div>
        </div>
      </div>
    </div>
  );
}
