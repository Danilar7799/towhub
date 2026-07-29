"use client";

import { useState, useEffect } from "react";

export default function BlandConfigPage() {
  const [config, setConfig] = useState({
    apiKey: "",
    phoneNumber: "",
    agentPrompt: "",
    webhookUrl: "",
    dispatchSettings: { forcedDispatch: false, autoAssign: true, maxWaitMinutes: 5, retryOnDecline: true },
    qcSettings: { enabled: true, delayMinutes: 30, askSatisfaction: true, askReview: true },
    // Twilio config
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    // Link status
    twilioLinked: false,
  });
  const [saved, setSaved] = useState(false);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetch("/api/bland/config").then(r => r.json()).then(d => {
      if (d.config) setConfig(prev => ({ ...prev, ...d.config }));
    });
    // Also load Twilio config from org settings
    fetch("/api/org/profile").then(r => r.json()).then(d => {
      if (d.org) {
        setConfig(prev => ({
          ...prev,
          twilioAccountSid: d.org.twilioAccountSid || "",
          twilioAuthToken: d.org.twilioAuthToken || "",
          twilioPhoneNumber: d.org.twilioPhoneNumber || "",
          twilioLinked: d.org.twilioLinked || false,
        }));
      }
    });
  }, []);

  const save = async () => {
    await fetch("/api/bland/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const saveTwilio = async () => {
    await fetch("/api/org/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        twilioAccountSid: config.twilioAccountSid,
        twilioAuthToken: config.twilioAuthToken,
        twilioPhoneNumber: config.twilioPhoneNumber,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const linkTwilioToBland = async () => {
    if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber || !config.phoneNumber) {
      alert("Please fill in all Twilio and Bland phone numbers first");
      return;
    }
    setLinking(true);
    try {
      const res = await fetch("/api/bland/link-twilio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twilioAccountSid: config.twilioAccountSid,
          twilioAuthToken: config.twilioAuthToken,
          twilioPhoneNumber: config.twilioPhoneNumber,
          blandPhoneNumber: config.phoneNumber,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfig(prev => ({ ...prev, twilioLinked: true }));
        alert("Twilio number linked to Bland agent! Incoming calls will now be forwarded to your AI dispatcher.");
      } else {
        alert("Failed to link: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error: " + String(err));
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[800px]" style={{ fontFeatureSettings: "'ss01'" }}>
      <div><h2 className="text-[20px] font-semibold tracking-[-0.3px]">🤖 Bland.ai Configuration</h2><p className="text-[13px] text-[#64748d] mt-0.5">Configure your AI dispatcher — it answers calls 24/7 and creates jobs automatically</p></div>

      {/* Connection */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4">Bland.ai Connection</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1">Bland.ai API Key</label>
            <input type="password" value={config.apiKey || ""} onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] outline-none focus:border-[#533afd]" placeholder="sk-..." />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1">Bland Phone Number (your AI agent's number)</label>
            <input value={config.phoneNumber || ""} onChange={e => setConfig(c => ({ ...c, phoneNumber: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] outline-none focus:border-[#533afd]" placeholder="+1-555-000-0000" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1">Webhook URL (configure in Bland.ai dashboard)</label>
            <div className="flex gap-2">
              <input readOnly value={config.webhookUrl} className="flex-1 px-3.5 py-2.5 bg-[#f6f9fc] border border-[#e5edf5] rounded text-[13px] font-mono" />
              <button onClick={() => navigator.clipboard.writeText(config.webhookUrl)} className="px-3 py-2 bg-[#533afd]/10 text-[#533afd] rounded text-[12px] font-medium">Copy</button>
            </div>
          </div>
        </div>
      </div>

      {/* Twilio Configuration */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4 flex items-center gap-2">📱 Twilio Configuration <span className={`text-[11px] px-2 py-0.5 rounded ${config.twilioLinked ? "bg-[#15be53]/10 text-[#15be53]" : "bg-[#fef3c7] text-[#92400e]"}`}>{config.twilioLinked ? "Linked" : "Not Linked"}</span></h3>
        <p className="text-[12px] text-[#64748d] mb-4">Configure your Twilio number to forward calls to Bland.ai. Get credentials at <a href="https://console.twilio.com" target="_blank" rel="noopener" className="text-[#533afd] underline">console.twilio.com</a></p>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1">Twilio Account SID</label>
            <input value={config.twilioAccountSid || ""} onChange={e => setConfig(c => ({ ...c, twilioAccountSid: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] outline-none focus:border-[#533afd]" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1">Twilio Auth Token</label>
            <input type="password" value={config.twilioAuthToken || ""} onChange={e => setConfig(c => ({ ...c, twilioAuthToken: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] outline-none focus:border-[#533afd]" placeholder="your-auth-token" />
          </div>
          <div>
            <label className="block text=[12px] font-medium text-[#273951] mb-1">Twilio Phone Number (your public towing number)</label>
            <input value={config.twilioPhoneNumber || ""} onChange={e => setConfig(c => ({ ...c, twilioPhoneNumber: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] outline-none focus:border-[#533afd]" placeholder="+1-555-000-0000" />
          </div>
          <div className="flex gap-3">
            <button onClick={saveTwilio} className="bg-[#533afd] text-white px-6 py-2.5 rounded text-[14px] font-medium">Save Twilio Config</button>
            <button onClick={linkTwilioToBland} disabled={linking || config.twilioLinked} className="bg-[#15be53] text-white px-6 py-2.5 rounded text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {linking ? "Linking..." : config.twilioLinked ? "✓ Linked" : "Link Twilio → Bland"}
            </button>
          </div>
          {!config.twilioLinked && (
            <div className="p-3 bg-[#fef3c7] border border-[#fcd34d] rounded text-[12px] text-[#92400e]">
              <strong>Setup Required:</strong> After saving Twilio config, click "Link Twilio → Bland". This will configure your Twilio number's webhook to forward calls to <code className="font-mono">{config.webhookUrl || "your-webhook-url"}</code> which forwards to your Bland agent.
            </div>
          )}
        </div>
      </div>

      {/* Agent Prompt */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4">AI Agent Prompt</h3>
        <p className="text-[12px] text-[#64748d] mb-3">This is the script the AI follows when answering calls. Customize for your business.</p>
        <textarea rows={12} value={config.agentPrompt || ""} onChange={e => setConfig(c => ({ ...c, agentPrompt: e.target.value }))} className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] outline-none focus:border-[#533afd] font-mono resize-none" />
      </div>

      {/* Dispatch Settings */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4">Dispatch Settings</h3>
        <div className="space-y-3">
          {[
            { label: "Forced Dispatch", desc: "Drivers cannot decline jobs (Uber-style)", field: "forcedDispatch" },
            { label: "Auto-Assign", desc: "Automatically assign nearest driver on new job", field: "autoAssign" },
            { label: "Retry on Decline", desc: "If driver declines, auto-assign to next nearest", field: "retryOnDecline" },
          ].map(s => (
            <div key={s.field} className="flex items-center justify-between p-3 border border-[#e5edf5] rounded-lg">
              <div><div className="text-[13px] font-medium">{s.label}</div><div className="text-[11px] text-[#64748d]">{s.desc}</div></div>
              <button onClick={() => setConfig(c => ({ ...c, dispatchSettings: { ...c.dispatchSettings, [s.field]: !c.dispatchSettings[s.field as keyof typeof c.dispatchSettings] } }))}
                className={`w-10 h-6 rounded-full transition-colors relative ${config.dispatchSettings[s.field as keyof typeof config.dispatchSettings] ? "bg-[#533afd]" : "bg-[#e5edf5]"}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.dispatchSettings[s.field as keyof typeof config.dispatchSettings] ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* QC Settings */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4">Quality Control Callback</h3>
        <p className="text-[12px] text-[#64748d] mb-3">AI calls customer after job completion to check satisfaction.</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-[#e5edf5] rounded-lg">
            <div><div className="text-[13px] font-medium">Enable QC Callbacks</div><div className="text-[11px] text-[#64748d]">AI calls customer after each completed job</div></div>
            <button onClick={() => setConfig(c => ({ ...c, qcSettings: { ...c.qcSettings, enabled: !c.qcSettings.enabled } }))}
              className={`w-10 h-6 rounded-full transition-colors relative ${config.qcSettings.enabled ? "bg-[#533afd]" : "bg-[#e5edf5]"}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.qcSettings.enabled ? "translate-x-5" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[12px] font-medium text-[#273951] mb-1">Delay after job (minutes)</label><input type="number" value={config.qcSettings.delayMinutes} onChange={e => setConfig(c => ({ ...c, qcSettings: { ...c.qcSettings, delayMinutes: parseInt(e.target.value) } }))} className="w-full px-3 py-2 border border-[#e5edf5] rounded text-[13px] outline-none" /></div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button onClick={save} className="bg-[#533afd] text-white px-6 py-2.5 rounded text-[14px] font-medium">Save Configuration</button>
        {saved && <span className="text-[13px] text-[#15be53] font-medium">✓ Saved!</span>}
      </div>
    </div>
  );
}