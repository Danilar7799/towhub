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
      .th-field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.15); }
      .th-btn { width: 100%; padding: 14px; background: #1e40af; color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 700; cursor: pointer; }
      .th-btn:hover { background: #1e3a8a; }
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
  -d '{"name":"John","phone":"+15551234567","pickup":"123 Main St","message":"Need a tow"}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-black">Settings</h1>

      {/* Company Info */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-4">Company Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><div className="text-sm text-gray-500">Company Name</div><div className="font-medium">{org?.name || "—"}</div></div>
          <div><div className="text-sm text-gray-500">Email</div><div className="font-medium">{org?.email || "—"}</div></div>
        </div>
      </div>

      {/* 🔑 API Key + Bolt.new Integration */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-1">🔑 Website Lead Capture</h2>
        <p className="text-sm text-gray-500 mb-4">Connect your Bolt.new website so leads drop straight into your TowHub CRM.</p>

        {/* API Key */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Your API Key</span>
            <button onClick={generateKey} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              {apiKey ? "Regenerate" : "Generate Key"}
            </button>
          </div>
          {apiKey ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border px-4 py-2.5 rounded-lg text-sm font-mono break-all">{apiKey}</code>
              <button onClick={() => copy(apiKey, "key")} className="shrink-0 bg-blue-100 text-blue-700 px-3 py-2.5 rounded-lg text-sm font-bold">
                {copied === "key" ? "✓" : "Copy"}
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-400 italic">Click &quot;Generate Key&quot; to get your API key.</div>
          )}
        </div>

        {/* Embed code */}
        {apiKey && (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">HTML Embed Code (for Bolt.new)</span>
                <button onClick={() => copy(embedCode, "embed")} className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-bold">
                  {copied === "embed" ? "✓ Copied!" : "Copy Code"}
                </button>
              </div>
              <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto max-h-48">{embedCode}</pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="font-bold text-blue-900 mb-2">📋 How to add to Bolt.new:</div>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Copy the code above</li>
                <li>In your Bolt.new project, add a new section or HTML block</li>
                <li>Paste the code — the form appears automatically</li>
                <li>Leads flow directly into your TowHub dashboard → Leads tab</li>
              </ol>
            </div>

            {/* cURL example */}
            <details className="mt-4">
              <summary className="text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">cURL example (for custom integrations)</summary>
              <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-xl mt-2 overflow-x-auto">{curlExample}</pre>
            </details>
          </>
        )}
      </div>

      {/* Phone / AI Dispatcher */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-4">📞 Phone & AI Dispatcher</h2>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="font-medium text-purple-900">🤖 Bland.ai AI Dispatcher</div>
          <div className="text-sm text-purple-700 mt-1">AI-powered phone answering and dispatching. Connect your Bland.ai phone number below.</div>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Bland.ai Phone Number</label><input placeholder="+1-555-000-0000" className="w-full px-4 py-3 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-1">Twilio Phone Number</label><input placeholder="+1-555-000-0000" className="w-full px-4 py-3 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-1">Google Business Chat URL</label><input placeholder="https://maps.google.com/..." className="w-full px-4 py-3 border rounded-xl" /></div>
          <button className="bg-blue-900 text-white px-6 py-3 rounded-xl font-bold">Save Settings</button>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-bold mb-4">🔗 Integrations</h2>
        <div className="space-y-3">
          {[
            { name: "Bolt.new Website", icon: "⚡", status: apiKey ? "Ready" : "Needs API Key", desc: "Lead capture from your website" },
            { name: "Yelp", icon: "🔴", status: "Not connected", desc: "Auto-import leads from Yelp" },
            { name: "Thumbtack", icon: "🟢", status: "Not connected", desc: "Auto-import leads from Thumbtack" },
            { name: "Google Business", icon: "🔵", status: "Not connected", desc: "Chat and lead capture" },
            { name: "Bland.ai", icon: "🤖", status: "Not connected", desc: "AI phone dispatcher" },
          ].map((int, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{int.icon}</span>
                <div>
                  <div className="font-medium">{int.name}</div>
                  <div className="text-sm text-gray-500">{int.desc}</div>
                </div>
              </div>
              <span className={`text-sm font-medium ${int.status === "Ready" ? "text-green-600" : "text-gray-400"}`}>{int.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <h2 className="text-lg font-bold text-red-900 mb-2">Danger Zone</h2>
        <p className="text-sm text-red-700 mb-4">Delete your organization and all associated data. This cannot be undone.</p>
        <button className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700">Delete Organization</button>
      </div>
    </div>
  );
}
