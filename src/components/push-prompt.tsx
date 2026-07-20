"use client";

import { useState, useEffect } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function PushNotificationPrompt() {
  const [status, setStatus] = useState<"checking" | "supported" | "subscribed" | "blocked" | "unsupported">("checking");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("push_prompt_dismissed")) { setDismissed(true); return; }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setStatus("unsupported"); return; }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setStatus("subscribed");
        else if (Notification.permission === "denied") setStatus("blocked");
        else setStatus("supported");
      });
    }).catch(() => setStatus("supported"));
  }, []);

  const subscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus("blocked"); return; }
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON() }) });
      setStatus("subscribed");
    } catch (e) { console.error("Push failed:", e); }
  };

  const dismiss = () => { setDismissed(true); sessionStorage.setItem("push_prompt_dismissed", "1"); };

  if (dismissed || status === "subscribed" || status === "unsupported" || status === "blocked") return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#533afd]/[0.04] border border-[#533afd]/10 text-[12px]">
      <span className="text-[14px]">🔔</span>
      <span className="text-[#64748d]">Get notified about new leads &amp; jobs</span>
      <button onClick={subscribe} className="ml-auto px-2.5 py-1 bg-[#533afd] text-white rounded text-[11px] font-medium hover:bg-[#4434d4] transition-colors">
        Enable
      </button>
      <button onClick={dismiss} className="text-[#94a3b8] hover:text-[#64748d] p-0.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}
