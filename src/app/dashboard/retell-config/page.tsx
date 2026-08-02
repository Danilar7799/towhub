"use client";

import { useState, useEffect } from "react";

export default function RetellConfigPage() {
  const [config, setConfig] = useState({
    apiKey: "",
    agentId: "",
    phoneNumber: "",
    webhookUrl: "",
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/retell/setup").then(r => r.json()).then(d => {
      if (d.config) {
        setConfig(prev => ({
          ...prev,
          agentId: d.config.agentId || "",
          phoneNumber: d.config.phoneNumber || "",
          webhookUrl: d.config.webhookUrl || "",
        }));
      }
    });
  }, []);

  const save = async () => {
    const res = await fetch("/api/retell/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const data = await res.json();
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert(data.error || "Failed to save");
    }
  };

  const testWebhook = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/retell/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "call_ended",
          call: {
            call_id: "test_" + Date.now(),
            agent_id: config.agentId || "test",
            call_status: "ended",
            start_timestamp: Date.now() - 120000,
            end_timestamp: Date.now(),
            transcript: "Agent: Thank you for calling Pacific Towing! How can I help? Customer: I need a tow from 123 Main St. My car is a 2020 Honda Civic, blue. Agent: Got it, dispatching a driver now.",
            duration_ms: 120000,
            recording_url: "",
            from_number: "+15551234567",
            to_number: config.phoneNumber || "+12536501545",
            metadata: {},
            call_analysis: {
              call_summary: "Customer requested towing service from 123 Main St. Vehicle: 2020 Honda Civic, blue.",
              user_sentiment: "neutral",
              custom_analysis_data: {},
            },
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ Test call created! Job ID: ${data.jobId}`);
      } else {
        setTestResult(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setTestResult(`❌ Connection error: ${err}`);
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6 max-w-[800px]" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">🎙️ Retell AI Configuration</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Configure your Retell AI voice agent for call handling</p>
      </div>

      {/* Connection */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4">Retell AI Connection</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1.5">API Key *</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
              placeholder="key_xxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <div className="text-[11px] text-[#94a3b8] mt-1">
              Find in Retell Dashboard → Settings → API Keys
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Agent ID</label>
            <input
              value={config.agentId}
              onChange={e => setConfig(c => ({ ...c, agentId: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
              placeholder="agent_xxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <div className="text-[11px] text-[#94a3b8] mt-1">
              Find in Retell Dashboard → Agents → your agent ID
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Phone Number</label>
            <input
              value={config.phoneNumber}
              onChange={e => setConfig(c => ({ ...c, phoneNumber: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
              placeholder="+12536501545"
            />
            <div className="text-[11px] text-[#94a3b8] mt-1">
              Phone number assigned to your Retell agent
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Webhook URL (auto-configured)</label>
            <input
              value={config.webhookUrl}
              readOnly
              className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] bg-[#f6f9fc] text-[#64748d]"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={save}
              className="bg-[#533afd] text-white px-6 py-2.5 rounded text-[13px] font-medium hover:bg-[#4434d4] transition-colors"
            >
              {saved ? "✅ Saved!" : "Save Configuration"}
            </button>
            <button
              onClick={testWebhook}
              disabled={testing}
              className="px-6 py-2.5 border border-[#e5edf5] rounded text-[13px] font-medium hover:bg-[#f6f9fc] transition-colors disabled:opacity-50"
            >
              {testing ? "Testing..." : "🧪 Test Webhook"}
            </button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg text-[13px] ${testResult.startsWith("✅") ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fef2f2] text-[#991b1b]"}`}>
              {testResult}
            </div>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4">How it works</h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "Create agent in Retell", desc: "Set up your voice agent with prompt, voice, and phone number in Retell Dashboard" },
            { step: "2", title: "Enter API key here", desc: "Paste your Retell API key and agent ID above" },
            { step: "3", title: "Webhook auto-registers", desc: "TowHub automatically registers the webhook to receive call data" },
            { step: "4", title: "Calls create jobs", desc: "When customers call, Retell handles the conversation and TowHub creates jobs automatically" },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[12px] font-medium text-[#533afd] shrink-0">
                {s.step}
              </div>
              <div>
                <div className="text-[13px] font-medium">{s.title}</div>
                <div className="text-[12px] text-[#64748d]">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4">Retell AI vs Bland.ai</h3>
        <div className="grid grid-cols-3 gap-4 text-[12px]">
          <div className="font-medium text-[#64748d]">Feature</div>
          <div className="font-medium text-[#533afd]">Retell AI</div>
          <div className="font-medium text-[#64748d]">Bland.ai</div>

          {[
            ["Voice Quality", "★★★★★", "★★★★"],
            ["Latency", "~500ms", "~800ms"],
            ["Languages", "50+", "40+"],
            ["Post-call Analysis", "Built-in", "Manual"],
            ["Sentiment Analysis", "Built-in", "Manual"],
            ["Pricing", "$0.07/min", "$0.09/min"],
            ["Setup", "Easy", "Medium"],
          ].map(([feature, retell, bland]) => (
            <>
              <div key={`f-${feature}`} className="text-[#64748d]">{feature}</div>
              <div key={`r-${feature}`} className="text-[#061b31]">{retell}</div>
              <div key={`b-${feature}`} className="text-[#64748d]">{bland}</div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}