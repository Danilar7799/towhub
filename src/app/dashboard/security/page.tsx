"use client";

import { useState } from "react";

export default function TwoFactorPage() {
  const [enabled, setEnabled] = useState(false);
  const [method, setMethod] = useState<"sms" | "authenticator" | "email">("sms");
  const [step, setStep] = useState<"setup" | "verify" | "done">("setup");
  const [code, setCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const enable = () => {
    setStep("verify");
  };

  const verify = () => {
    if (code.length === 6) {
      setEnabled(true);
      setStep("done");
    }
  };

  return (
    <div className="max-w-xl space-y-6" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">🔐 Two-Factor Authentication</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Add an extra layer of security to your account</p>
      </div>

      {/* Status */}
      <div className={`border rounded-lg p-5 ${enabled ? "bg-[#dcfce7] border-[#bbf7d0]" : "bg-white border-[#e5edf5]"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[18px] ${enabled ? "bg-[#15be53]/10" : "bg-[#f6f9fc]"}`}>
            {enabled ? "✅" : "🔓"}
          </div>
          <div>
            <div className="text-[14px] font-semibold text-[#061b31]">{enabled ? "2FA Enabled" : "2FA Disabled"}</div>
            <div className="text-[12px] text-[#64748d]">{enabled ? "Your account is protected with two-factor authentication" : "Your account is only protected by a password"}</div>
          </div>
        </div>
      </div>

      {!enabled && step === "setup" && (
        <>
          {/* Method selection */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[13px] font-medium text-[#061b31] mb-3">Choose verification method</div>
            <div className="space-y-2">
              {[
                { v: "sms" as const, icon: "📱", label: "SMS Text Message", desc: "Receive a code via text message" },
                { v: "authenticator" as const, icon: "🔐", label: "Authenticator App", desc: "Use Google Authenticator or Authy" },
                { v: "email" as const, icon: "📧", label: "Email", desc: "Receive a code via email" },
              ].map(m => (
                <button key={m.v} onClick={() => setMethod(m.v)}
                  className={`w-full p-4 rounded-lg border text-left transition-colors flex items-center gap-3 ${method === m.v ? "border-[#533afd] bg-[#533afd]/[0.04]" : "border-[#e5edf5] hover:border-[#b9b9f9]"}`}>
                  <span className="text-[20px]">{m.icon}</span>
                  <div>
                    <div className="text-[13px] font-medium text-[#061b31]">{m.label}</div>
                    <div className="text-[11px] text-[#64748d]">{m.desc}</div>
                  </div>
                  {method === m.v && <div className="ml-auto w-5 h-5 bg-[#533afd] rounded-full flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg></div>}
                </button>
              ))}
            </div>
          </div>

          {/* Phone number for SMS */}
          {method === "sms" && (
            <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
              <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Phone Number</label>
              <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+1-555-000-0000"
                className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none" />
            </div>
          )}

          {/* Authenticator QR placeholder */}
          {method === "authenticator" && (
            <div className="bg-white border border-[#e5edf5] rounded-lg p-5 text-center">
              <div className="text-[13px] font-medium text-[#061b31] mb-3">Scan QR Code</div>
              <div className="w-48 h-48 bg-[#f6f9fc] border border-[#e5edf5] rounded-lg mx-auto flex items-center justify-center">
                <div className="text-center">
                  <div className="text-[40px] mb-2 opacity-30">📱</div>
                  <div className="text-[11px] text-[#94a3b8]">QR Code</div>
                  <div className="text-[11px] text-[#94a3b8]">Scan with authenticator app</div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[#64748d]">Or enter manually: <code className="bg-[#f6f9fc] px-2 py-0.5 rounded text-[10px] font-mono">JBSWY3DPEHPK3PXP</code></div>
            </div>
          )}

          <button onClick={enable} className="w-full bg-[#533afd] text-white py-3 rounded text-[14px] font-medium hover:bg-[#4434d4] transition-colors shadow-[0_4px_16px_rgba(83,58,253,0.3)]">
            Continue
          </button>
        </>
      )}

      {/* Verification step */}
      {step === "verify" && (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
          <div className="text-[13px] font-medium text-[#061b31] mb-3">Enter verification code</div>
          <div className="text-[12px] text-[#64748d] mb-4">
            We sent a 6-digit code to {method === "sms" ? phoneNumber : method === "email" ? "your email" : "your authenticator app"}
          </div>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6}
            className="w-full px-3.5 py-3 border border-[#e5edf5] rounded text-[20px] text-center font-mono tracking-[0.5em] focus:border-[#533afd] outline-none" />
          <button onClick={verify} disabled={code.length !== 6}
            className="w-full mt-4 bg-[#533afd] text-white py-3 rounded text-[14px] font-medium hover:bg-[#4434d4] disabled:opacity-50 transition-colors">
            Verify & Enable 2FA
          </button>
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="bg-[#dcfce7] border border-[#bbf7d0] rounded-lg p-5 text-center">
          <div className="text-[32px] mb-2">✅</div>
          <div className="text-[16px] font-semibold text-[#166534] mb-1">2FA Enabled Successfully!</div>
          <div className="text-[13px] text-[#166534]">Your account is now protected with two-factor authentication.</div>
          <div className="mt-4 p-3 bg-white rounded-lg border border-[#bbf7d0]">
            <div className="text-[11px] font-medium text-[#273951] mb-1">Recovery Codes</div>
            <div className="text-[11px] text-[#64748d]">Save these codes in a safe place. You can use them if you lose access to your {method === "sms" ? "phone" : method === "email" ? "email" : "authenticator app"}.</div>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {["A1B2-C3D4", "E5F6-G7H8", "I9J0-K1L2", "M3N4-O5P6"].map(c => (
                <code key={c} className="bg-[#f6f9fc] px-2 py-1 rounded text-[11px] font-mono text-center">{c}</code>
              ))}
            </div>
          </div>
          <button onClick={() => setEnabled(false)} className="mt-3 text-[12px] text-[#dc2626] hover:underline">Disable 2FA</button>
        </div>
      )}
    </div>
  );
}
