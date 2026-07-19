"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/lib/toast";

/* ── Design tokens (Stripe-style) ────────────────────────────────── */
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
interface OrgProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  status: string;
  settings: Record<string, unknown>;
}

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

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  auction: { label: "Auction Platforms", icon: "🔨" },
  roadside: { label: "Roadside Assistance", icon: "⚡" },
  communication: { label: "Communication", icon: "📱" },
  accounting: { label: "Accounting", icon: "📊" },
  crm: { label: "CRM", icon: "🤝" },
};

const VERIFICATION_LEVELS = ["Unverified", "Basic", "Premium", "Elite"] as const;
type VerificationLevel = typeof VERIFICATION_LEVELS[number];

const DOC_TYPES = [
  { key: "businessLicense", label: "Business License" },
  { key: "insuranceCertificate", label: "Insurance Certificate" },
  { key: "mcAuthority", label: "MC Authority" },
  { key: "dotNumber", label: "DOT Number" },
  { key: "w9", label: "W-9" },
] as const;

/* ── Helper: Extract settings safely ──────────────────────────────── */
function getSetting(settings: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let val: unknown = settings;
  for (const k of keys) {
    if (val && typeof val === "object") val = (val as Record<string, unknown>)[k];
    else return "";
  }
  return typeof val === "string" ? val : val != null ? String(val) : "";
}

/* ── Tab component ────────────────────────────────────────────────── */
function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
        active
          ? `border-[${C.primary}] text-[${C.primary}]`
          : "border-transparent text-[#64748d] hover:text-[#061b31]"
      }`}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"profile" | "integrations" | "verification" | "support">("profile");

  return (
    <div className="space-y-5 max-w-4xl" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px] text-[#061b31]">Settings</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Manage your company, integrations, and verification</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#e5edf5] flex gap-0 -mb-px">
        <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>Company Profile</TabButton>
        <TabButton active={tab === "integrations"} onClick={() => setTab("integrations")}>Integrations</TabButton>
        <TabButton active={tab === "verification"} onClick={() => setTab("verification")}>Verification</TabButton>
        <TabButton active={tab === "support"} onClick={() => setTab("support")}>Support</TabButton>
      </div>

      {tab === "profile" && <CompanyProfileTab />}
      {tab === "integrations" && <IntegrationsTab />}
      {tab === "verification" && <VerificationTab />}
      {tab === "support" && <SupportTab />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 1 — COMPANY PROFILE
   ═══════════════════════════════════════════════════════════════════ */
function CompanyProfileTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", city: "", state: "", zip: "",
    website: "", mcNumber: "", dotNumber: "", licenseNumber: "", licenseState: "",
    licenseExpiry: "", insuranceProvider: "", insurancePolicyNumber: "",
    insuranceExpiry: "", yearsInBusiness: "", description: "",
  });
  const [verificationLevel, setVerificationLevel] = useState<VerificationLevel>("Unverified");

  useEffect(() => {
    fetch("/api/org/profile")
      .then(r => r.json())
      .then(data => {
        if (data.org) {
          const s = (data.org.settings || {}) as Record<string, unknown>;
          setForm({
            name: data.org.name || "",
            phone: data.org.phone || "",
            email: data.org.email || "",
            address: data.org.address || "",
            city: data.org.city || "",
            state: data.org.state || "",
            zip: data.org.zip || "",
            website: data.org.website || "",
            mcNumber: getSetting(s, "mcNumber"),
            dotNumber: getSetting(s, "dotNumber"),
            licenseNumber: getSetting(s, "licenseNumber"),
            licenseState: getSetting(s, "licenseState"),
            licenseExpiry: getSetting(s, "licenseExpiry"),
            insuranceProvider: getSetting(s, "insuranceProvider"),
            insurancePolicyNumber: getSetting(s, "insurancePolicyNumber"),
            insuranceExpiry: getSetting(s, "insuranceExpiry"),
            yearsInBusiness: getSetting(s, "yearsInBusiness"),
            description: getSetting(s, "description"),
          });
          const level = getSetting(s, "verificationLevel");
          if (level && VERIFICATION_LEVELS.includes(level as VerificationLevel)) {
            setVerificationLevel(level as VerificationLevel);
          }
        }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/org/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          website: form.website,
          settings: {
            mcNumber: form.mcNumber,
            dotNumber: form.dotNumber,
            licenseNumber: form.licenseNumber,
            licenseState: form.licenseState,
            licenseExpiry: form.licenseExpiry,
            insuranceProvider: form.insuranceProvider,
            insurancePolicyNumber: form.insurancePolicyNumber,
            insuranceExpiry: form.insuranceExpiry,
            yearsInBusiness: form.yearsInBusiness,
            description: form.description,
          },
        }),
      });
      if (res.ok) toast.success("Company profile saved successfully!");
      else toast.error("Failed to save profile");
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton />;

  const isVerified = verificationLevel !== "Unverified";

  return (
    <div className="space-y-5">
      {/* Verification badge */}
      {isVerified && (
        <div className="flex items-center gap-2 bg-[#dcfce7] border border-[#bbf7d0] rounded-lg px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15be53" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          <span className="text-[13px] font-medium text-[#166534]">
            {verificationLevel} Verified — Your company is verified on TowHub
          </span>
        </div>
      )}

      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-5">Company Information</div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" value={form.name} onChange={update("name")} placeholder="Your company name" />
          <Field label="Phone" value={form.phone} onChange={update("phone")} placeholder="+1 (555) 000-0000" />
          <Field label="Email" value={form.email} onChange={update("email")} placeholder="info@company.com" type="email" />
          <Field label="Website" value={form.website} onChange={update("website")} placeholder="https://company.com" />
          <Field label="Address" value={form.address} onChange={update("address")} placeholder="123 Main St" className="col-span-2" />
          <Field label="City" value={form.city} onChange={update("city")} placeholder="City" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="State" value={form.state} onChange={update("state")} placeholder="FL" />
            <Field label="ZIP" value={form.zip} onChange={update("zip")} placeholder="33101" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-5">Licensing & Insurance</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="MC Number" value={form.mcNumber} onChange={update("mcNumber")} placeholder="MC-123456" />
          <Field label="DOT Number" value={form.dotNumber} onChange={update("dotNumber")} placeholder="DOT-1234567" />
          <Field label="License Number" value={form.licenseNumber} onChange={update("licenseNumber")} placeholder="License #" />
          <Field label="License State" value={form.licenseState} onChange={update("licenseState")} placeholder="FL" />
          <Field label="License Expiry" value={form.licenseExpiry} onChange={update("licenseExpiry")} type="date" />
          <div />
          <Field label="Insurance Provider" value={form.insuranceProvider} onChange={update("insuranceProvider")} placeholder="Provider name" />
          <Field label="Insurance Policy #" value={form.insurancePolicyNumber} onChange={update("insurancePolicyNumber")} placeholder="Policy number" />
          <Field label="Insurance Expiry" value={form.insuranceExpiry} onChange={update("insuranceExpiry")} type="date" />
          <Field label="Years in Business" value={form.yearsInBusiness} onChange={update("yearsInBusiness")} placeholder="5" />
        </div>
      </div>

      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-5">About</div>
        <label className={labelCls}>Company Description</label>
        <textarea
          value={form.description}
          onChange={update("description")}
          rows={4}
          placeholder="Tell customers about your towing company, services, and coverage area..."
          className={`${inputCls} resize-y`}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`bg-[${C.primary}] text-white px-6 py-2.5 rounded text-[13px] font-medium hover:bg-[${C.hover}] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)] disabled:opacity-50`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 2 — INTEGRATIONS
   ═══════════════════════════════════════════════════════════════════ */
function IntegrationsTab() {
  const toast = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <Skeleton />;

  // Group by category
  const grouped = integrations.reduce<Record<string, Integration[]>>((acc, int) => {
    (acc[int.category] ||= []).push(int);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px]">{CATEGORY_META[category]?.icon || "🔗"}</span>
            <h3 className="text-[14px] font-semibold text-[#061b31]">{CATEGORY_META[category]?.label || category}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map(int => (
              <IntegrationCard
                key={int.id}
                integration={int}
                onConnect={() => { setModal(int); setConfigValues({}); }}
                onDisconnect={() => handleDisconnect(int)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Connect Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[24px]">{modal.icon}</span>
              <div>
                <h3 className="text-[15px] font-semibold text-[#061b31]">Connect {modal.name}</h3>
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

function IntegrationCard({ integration, onConnect, onDisconnect }: {
  integration: Integration;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const connected = integration.connected;
  return (
    <div className={`bg-white border rounded-lg p-4 transition-colors ${connected ? "border-[#bbf7d0]" : "border-[#e5edf5] hover:border-[#b9b9f9]"}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[20px]">{integration.icon}</span>
          <div>
            <div className="text-[13px] font-medium text-[#061b31]">{integration.name}</div>
            {connected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#15be53] mt-0.5">
                <span className="w-1.5 h-1.5 bg-[#15be53] rounded-full" />
                Connected
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-[12px] text-[#64748d] mb-3 line-clamp-2">{integration.description}</p>
      {connected ? (
        <button
          onClick={onDisconnect}
          className="text-[12px] font-medium text-[#dc2626] hover:text-[#b91c1c] transition-colors"
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={onConnect}
          className={`text-[12px] font-medium text-[${C.primary}] hover:text-[${C.hover}] transition-colors`}
        >
          Connect →
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 3 — VERIFICATION
   ═══════════════════════════════════════════════════════════════════ */
function VerificationTab() {
  const toast = useToast();
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<VerificationLevel>("Unverified");
  const [docs, setDocs] = useState<Record<string, { status: string; name: string }>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetch("/api/org/profile")
      .then(r => r.json())
      .then(data => {
        if (data.org) {
          setOrg(data.org);
          const s = (data.org.settings || {}) as Record<string, unknown>;
          const l = getSetting(s, "verificationLevel");
          if (l && VERIFICATION_LEVELS.includes(l as VerificationLevel)) setLevel(l as VerificationLevel);
          const d = s.docs as Record<string, { status: string; name: string }> | undefined;
          if (d) setDocs(d);
        }
      })
      .catch(() => toast.error("Failed to load verification data"))
      .finally(() => setLoading(false));
  }, []);

  const currentIdx = VERIFICATION_LEVELS.indexOf(level);

  const requirements: { level: VerificationLevel; items: { label: string; met: boolean }[] }[] = [
    {
      level: "Basic",
      items: [
        { label: "Company name provided", met: !!org?.name },
        { label: "Email verified", met: !!org?.email },
        { label: "Phone verified", met: !!org?.phone },
      ],
    },
    {
      level: "Premium",
      items: [
        { label: "MC or DOT number provided", met: !!(getSetting((org?.settings || {}) as Record<string, unknown>, "mcNumber") || getSetting((org?.settings || {}) as Record<string, unknown>, "dotNumber")) },
        { label: "Insurance documentation uploaded", met: !!docs.insuranceCertificate },
        { label: "Business license uploaded", met: !!docs.businessLicense },
      ],
    },
    {
      level: "Elite",
      items: [
        { label: "50+ completed jobs", met: false },
        { label: "4.5+ star rating", met: false },
        { label: "3+ months active", met: false },
      ],
    },
  ];

  const handleUpload = async (docKey: string) => {
    setUploading(docKey);
    // Simulate upload — in production, upload to S3/R2 and save metadata
    await new Promise(r => setTimeout(r, 1000));
    setDocs(prev => ({
      ...prev,
      [docKey]: { status: "review", name: DOC_TYPES.find(d => d.key === docKey)?.label || docKey },
    }));
    toast.success(`${DOC_TYPES.find(d => d.key === docKey)?.label} uploaded — pending review`);
    setUploading(null);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await fetch("/api/org/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            verificationLevel: level === "Unverified" ? "Basic" : level === "Basic" ? "Premium" : "Elite",
            verificationAppliedAt: new Date().toISOString(),
            docs,
          },
        }),
      });
      if (res.ok) {
        toast.success("Verification application submitted!");
        // Bump level locally
        const nextIdx = Math.min(currentIdx + 1, VERIFICATION_LEVELS.length - 1);
        setLevel(VERIFICATION_LEVELS[nextIdx]);
      } else {
        toast.error("Failed to submit application");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <Skeleton />;

  const statusColors: Record<string, string> = {
    pending: "bg-[#fef3c7] text-[#92400e]",
    review: "bg-[#dbeafe] text-[#1e40af]",
    approved: "bg-[#dcfce7] text-[#166534]",
    rejected: "bg-[#fef2f2] text-[#991b1b]",
  };

  return (
    <div className="space-y-6">
      {/* Current Level */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-4">Verification Level</div>
        <div className="flex items-center gap-3 mb-2">
          {VERIFICATION_LEVELS.map((l, i) => (
            <div key={l} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold ${
                i <= currentIdx ? `bg-[${C.primary}] text-white` : "bg-[#f1f5f9] text-[#94a3b8]"
              }`}>
                {i <= currentIdx ? "✓" : i}
              </div>
              <span className={`text-[13px] font-medium ${i <= currentIdx ? `text-[${C.primary}]` : "text-[#94a3b8]"}`}>{l}</span>
              {i < VERIFICATION_LEVELS.length - 1 && <div className={`w-12 h-0.5 ${i < currentIdx ? `bg-[${C.primary}]` : "bg-[#e5edf5]"}`} />}
            </div>
          ))}
        </div>
        <p className="text-[12px] text-[#64748d] mt-2">
          Current level: <strong className="text-[#061b31]">{level}</strong>
        </p>
      </div>

      {/* Requirements per level */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-4">Requirements</div>
        <div className="space-y-5">
          {requirements.map(r => (
            <div key={r.level}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[13px] font-semibold ${VERIFICATION_LEVELS.indexOf(r.level) <= currentIdx ? `text-[${C.primary}]` : "text-[#061b31]"}`}>{r.level}</span>
                {VERIFICATION_LEVELS.indexOf(r.level) <= currentIdx && (
                  <span className="text-[10px] bg-[#dcfce7] text-[#166534] px-1.5 py-0.5 rounded font-medium">Achieved</span>
                )}
              </div>
              <div className="space-y-1.5">
                {r.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${item.met ? "bg-[#dcfce7] text-[#15be53]" : "bg-[#f1f5f9] text-[#94a3b8]"}`}>
                      {item.met ? "✓" : "○"}
                    </span>
                    <span className={item.met ? "text-[#061b31]" : "text-[#64748d]"}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Document Upload */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-4">Documents</div>
        <div className="space-y-3">
          {DOC_TYPES.map(doc => {
            const d = docs[doc.key];
            return (
              <div key={doc.key} className="flex items-center justify-between p-3 border border-[#e5edf5] rounded-lg">
                <div className="flex items-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748d" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  <div>
                    <div className="text-[13px] font-medium text-[#061b31]">{doc.label}</div>
                    {d && <span className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${statusColors[d.status] || "bg-[#f1f5f9] text-[#64748d]"}`}>{d.status}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleUpload(doc.key)}
                  disabled={uploading === doc.key}
                  className={`text-[12px] font-medium text-[${C.primary}] hover:text-[${C.hover}] transition-colors disabled:opacity-50`}
                >
                  {uploading === doc.key ? "Uploading..." : d ? "Replace" : "Upload"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Apply button */}
      <div className="flex justify-end">
        <button
          onClick={handleApply}
          disabled={applying}
          className={`bg-[${C.primary}] text-white px-6 py-2.5 rounded text-[13px] font-medium hover:bg-[${C.hover}] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)] disabled:opacity-50`}
        >
          {applying ? "Submitting..." : "Apply for Verification"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 4 — SUPPORT
   ═══════════════════════════════════════════════════════════════════ */
function SupportTab() {
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error("Please fill in subject and description");
      return;
    }
    setSubmitting(true);
    try {
      // In production, POST to /api/support
      await new Promise(r => setTimeout(r, 800));
      toast.success("Support request submitted! We'll get back to you soon.");
      setSubject("");
      setPriority("normal");
      setDescription("");
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Help Center */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-4">Help Center</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Getting Started", icon: "🚀", href: "/docs#getting-started" },
            { label: "API Documentation", icon: "📡", href: "/docs#api-reference" },
            { label: "FAQ", icon: "❓", href: "/docs#faq" },
            { label: "Video Tutorials", icon: "🎬", href: "#" },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              className="flex items-center gap-3 p-3 border border-[#e5edf5] rounded-lg hover:border-[#b9b9f9] transition-colors"
            >
              <span className="text-[18px]">{link.icon}</span>
              <span className="text-[13px] font-medium text-[#061b31]">{link.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-4">Contact Support</div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className={inputCls}
            >
              <option value="low">Low — General question</option>
              <option value="normal">Normal — Need help</option>
              <option value="high">High — Something is broken</option>
              <option value="urgent">Urgent — Business critical</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail..."
              className={`${inputCls} resize-y`}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`bg-[${C.primary}] text-white px-5 py-2.5 rounded text-[13px] font-medium hover:bg-[${C.hover}] transition-colors disabled:opacity-50`}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
          <div className="text-[14px] font-medium text-[#061b31] mb-1">💬 Live Chat</div>
          <p className="text-[12px] text-[#64748d] mb-3">Chat with our support team in real-time</p>
          <span className="text-[11px] bg-[#fef3c7] text-[#92400e] px-2 py-0.5 rounded font-medium">Coming Soon</span>
        </div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
          <div className="text-[14px] font-medium text-[#061b31] mb-1">🟢 System Status</div>
          <p className="text-[12px] text-[#64748d] mb-3">Check current system uptime and incidents</p>
          <a href="#" className={`text-[12px] font-medium text-[${C.primary}] hover:underline`}>View Status →</a>
        </div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
          <div className="text-[14px] font-medium text-[#061b31] mb-1">💡 Feature Request</div>
          <p className="text-[12px] text-[#64748d] mb-3">Suggest new features or improvements</p>
          <a href="#" className={`text-[12px] font-medium text-[${C.primary}] hover:underline`}>Submit Idea →</a>
        </div>
      </div>

      {/* Plan Details & API Usage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
          <div className="text-[14px] font-medium text-[#061b31] mb-3">Current Plan</div>
          <div className="text-[18px] font-bold text-[#061b31]">Professional</div>
          <div className="text-[12px] text-[#64748d] mt-1">$99/month · Renews Aug 19, 2026</div>
          <a href="/dashboard/billing" className={`inline-block mt-3 text-[12px] font-medium text-[${C.primary}] hover:underline`}>Manage Plan →</a>
        </div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
          <div className="text-[14px] font-medium text-[#061b31] mb-3">API Usage (This Month)</div>
          <div className="text-[18px] font-bold text-[#061b31]">2,847 <span className="text-[13px] font-normal text-[#64748d]">/ 10,000</span></div>
          <div className="mt-2 h-2 bg-[#f1f5f9] rounded-full overflow-hidden">
            <div className="h-full bg-[#533afd] rounded-full" style={{ width: "28.5%" }} />
          </div>
          <div className="text-[11px] text-[#64748d] mt-1">28.5% used</div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */
function Field({ label, value, onChange, placeholder, type = "text", className = "" }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 bg-[#f1f5f9] rounded-lg" />
      ))}
    </div>
  );
}
