"use client";

import { useState, useEffect, useCallback } from "react";

export default function SettingsPage() {
  const [org, setOrg] = useState<{ name: string; phone?: string; email: string } | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [appUrl, setAppUrl] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setOrg(d.org));
    fetch("/api/org/api-key").then(r => r.json()).then(d => setApiKey(d.apiKey));
    setAppUrl(window.location.origin);
  }, []);

  const generateKey = async () => {
    if (!confirm("Generate a new API key? Old key will stop working immediately.")) return;
    const res = await fetch("/api/org/api-key", { method: "POST" });
    const data = await res.json();
    setApiKey(data.apiKey);
  };

  const copy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  }, []);

  const embedCode = `<!-- TowHub Lead Form — paste into your Bolt.new site -->
<div id="towhub-lead-form"></div>
<script>
(function() {
  const API_URL = "${appUrl}";
  const API_KEY = "${apiKey || "YOUR_API_KEY"}";
  const form = document.getElementById("towhub-lead-form");
  form.innerHTML = \`
    <style>
      #towhub-lead-form { font-family: system-ui, sans-serif; max-width: 480px; }
      .th-field { width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 15px; margin-bottom: 10px; box-sizing: border-box; }
      .th-field:focus { outline: none; border-color: #533afd; box-shadow: 0 0 0 3px rgba(83,58,253,.15); }
      .th-btn { width: 100%; padding: 14px; background: #533afd; color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; }
      .th-btn:hover { background: #4434d4; }
      .th-ok { background: #dcfce7; color: #166534; padding: 14px; border-radius: 10px; text-align: center; font-weight: 600; }
    </style>
    <input class="th-field" id="th-name" placeholder="Your Name *" required />
    <input class="th-field" id="th-phone" placeholder="Phone Number *" type="tel" required />
    <input class="th-field" id="th-email" placeholder="Email" type="email" />
    <input class="th-field" id="th-pickup" placeholder="Pickup Address" />
    <input class="th-field" id="th-dest" placeholder="Destination (optional)" />
    <textarea class="th-field" id="th-msg" placeholder="Tell us about your situation..." rows="3" style="resize:vertical"></textarea>
    <button class="th-btn" id="th-submit" type="button">Request Tow →</button>
  \`;
  document.getElementById("th-submit").onclick = async function() {
    const btn = this; btn.disabled = true; btn.textContent = "Sending...";
    const body = {
      name: document.getElementById("th-name").value,
      phone: document.getElementById("th-phone").value,
      email: document.getElementById("th-email").value,
      pickup: document.getElementById("th-pickup").value,
      destination: document.getElementById("th-dest").value,
      message: document.getElementById("th-msg").value,
      source: "website"
    };
    try {
      const r = await fetch(API_URL + "/api/external/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify(body)
      });
      if (r.ok) { form.innerHTML = '<div class="th-ok">✅ Thank you! We\\'ll be in touch shortly.</div>'; }
      else { btn.textContent = "Error — try again"; btn.disabled = false; }
    } catch(e) { btn.textContent = "Error — try again"; btn.disabled = false; }
  };
})();
</script>`;

  const curlExample = `curl -X POST ${appUrl}/api/external/lead \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || "YOUR_API_KEY"}" \\
  -d '{"name":"John","phone":"+15551234567","pickup":"123 Main St","message":"Need a tow"}'`;

  return (
    <div className="space-y-5 max-w-3xl" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">Settings</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Manage your organization and integrations</p>
      </div>

      {/* Company Info */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-4">Company Information</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">Company Name</div>
            <div className="text-[14px] font-medium text-[#061b31]">{org?.name || "—"}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-1">Email</div>
            <div className="text-[14px] font-medium text-[#061b31]">{org?.email || "—"}</div>
          </div>
        </div>
      </div>

      {/* API Key + Bolt.new Integration */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-1">🔑 Website Lead Capture</div>
        <div className="text-[13px] text-[#64748d] mb-5">Connect your Bolt.new website so leads drop straight into your TowHub CRM.</div>

        {/* API Key */}
        <div className="bg-[#f6f9fc] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-[#273951]">Your API Key</span>
            <button onClick={generateKey} className="text-[12px] text-[#533afd] font-medium hover:underline">
              {apiKey ? "Regenerate" : "Generate Key"}
            </button>
          </div>
          {apiKey ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-[#e5edf5] px-3.5 py-2.5 rounded text-[12px] font-mono break-all text-[#061b31]">{apiKey}</code>
              <button onClick={() => copy(apiKey, "key")} className="shrink-0 bg-[#533afd]/[0.06] text-[#533afd] px-3 py-2.5 rounded text-[12px] font-medium hover:bg-[#533afd]/[0.12] transition-colors">
                {copied === "key" ? "✓" : "Copy"}
              </button>
            </div>
          ) : (
            <div className="text-[13px] text-[#94a3b8]">Click "Generate Key" to get your API key.</div>
          )}
        </div>

        {/* Embed code */}
        {apiKey && (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[#273951]">HTML Embed Code (for Bolt.new)</span>
                <button onClick={() => copy(embedCode, "embed")} className="text-[12px] bg-[#533afd]/[0.06] text-[#533afd] px-3 py-1.5 rounded font-medium hover:bg-[#533afd]/[0.12] transition-colors">
                  {copied === "embed" ? "✓ Copied!" : "Copy Code"}
                </button>
              </div>
              <pre className="bg-[#061b31] text-[#15be53] text-[11px] p-4 rounded-lg overflow-x-auto max-h-48 font-mono leading-relaxed">{embedCode}</pre>
            </div>

            <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-lg p-4">
              <div className="text-[13px] font-medium text-[#061b31] mb-2">📋 How to add to Bolt.new:</div>
              <ol className="text-[12px] text-[#64748d] space-y-1 list-decimal list-inside">
                <li>Copy the code above</li>
                <li>In your Bolt.new project, add a new section or HTML block</li>
                <li>Paste the code — the form appears automatically</li>
                <li>Leads flow directly into your TowHub dashboard → Leads tab</li>
              </ol>
            </div>

            {/* cURL example */}
            <details className="mt-4">
              <summary className="text-[12px] font-medium text-[#64748d] cursor-pointer hover:text-[#061b31]">cURL example (for custom integrations)</summary>
              <pre className="bg-[#061b31] text-[#15be53] text-[11px] p-4 rounded-lg mt-2 overflow-x-auto font-mono">{curlExample}</pre>
            </details>
          </>
        )}
      </div>

      {/* Phone / AI Dispatcher */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-1">📞 Phone & AI Dispatcher</div>
        <div className="text-[13px] text-[#64748d] mb-5">Connect your phone system and Bland.ai for automated dispatching.</div>

        <div className="bg-[#533afd]/[0.04] border border-[#533afd]/10 rounded-lg p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#533afd]/[0.06] rounded-lg flex items-center justify-center text-[20px]">🤖</div>
          <div>
            <div className="text-[13px] font-medium text-[#061b31]">Bland.ai AI Dispatcher</div>
            <div className="text-[12px] text-[#64748d]">AI-powered phone answering and dispatching. Coming soon.</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Bland.ai Phone Number</label>
            <input placeholder="+1-555-000-0000" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Twilio Phone Number</label>
            <input placeholder="+1-555-000-0000" className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Google Business Chat URL</label>
            <input placeholder="https://maps.google.com/..." className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none" />
          </div>
          <button className="bg-[#533afd] text-white px-5 py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_2px_8px_rgba(83,58,253,0.2)]">
            Save Settings
          </button>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#061b31] mb-4">🔗 Integrations</div>
        <div className="space-y-2">
          {[
            { name: "Bolt.new Website", icon: "⚡", status: apiKey ? "Connected" : "Needs API Key", connected: !!apiKey },
            { name: "Yelp", icon: "🔴", status: "Not connected", connected: false },
            { name: "Thumbtack", icon: "🟢", status: "Not connected", connected: false },
            { name: "Google Business", icon: "🔵", status: "Not connected", connected: false },
            { name: "Bland.ai", icon: "🤖", status: "Not connected", connected: false },
          ].map((int, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-[#e5edf5] rounded-lg hover:border-[#b9b9f9] transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-[20px]">{int.icon}</span>
                <div>
                  <div className="text-[13px] font-medium text-[#061b31]">{int.name}</div>
                </div>
              </div>
              <span className={`text-[12px] font-medium ${int.connected ? "text-[#15be53]" : "text-[#94a3b8]"}`}>{int.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-[#fef2f2] border border-[#fecaca] rounded-lg p-6">
        <div className="text-[14px] font-medium text-[#991b1b] mb-2">Danger Zone</div>
        <div className="text-[13px] text-[#dc2626] mb-4">Delete your organization and all associated data. This cannot be undone.</div>
        <button className="bg-[#dc2626] text-white px-5 py-2.5 rounded text-[13px] font-medium hover:bg-[#b91c1c] transition-colors">
          Delete Organization
        </button>
      </div>
    </div>
  );
}
