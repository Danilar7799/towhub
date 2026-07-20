"use client";

import { useState, useEffect } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationPrompt() {
  const [status, setStatus] = useState<"checking" | "supported" | "subscribed" | "blocked" | "unsupported">("checking");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    // Check if already subscribed
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) {
          setStatus("subscribed");
        } else if (Notification.permission === "denied") {
          setStatus("blocked");
        } else {
          setStatus("supported");
        }
      });
    }).catch(() => setStatus("supported"));

    // Register service worker
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  const subscribe = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("blocked");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Send subscription to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      setStatus("subscribed");
    } catch (e) {
      console.error("Push subscription failed:", e);
    }
  };

  if (dismissed || status === "subscribed" || status === "unsupported" || status === "blocked") return null;

  return (
    <div className="bg-[#533afd]/[0.04] border border-[#533afd]/10 rounded-lg p-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[18px]">🔔</div>
      <div className="flex-1">
        <div className="text-[13px] font-medium text-[#061b31]">Enable Push Notifications</div>
        <div className="text-[11px] text-[#64748d]">Get notified about new leads and jobs even when the tab is closed</div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={subscribe} className="bg-[#533afd] text-white px-3 py-1.5 rounded text-[12px] font-medium hover:bg-[#4434d4]">
          Enable
        </button>
        <button onClick={() => setDismissed(true)} className="text-[#64748d] text-[12px] hover:text-[#061b31]">
          Later
        </button>
      </div>
    </div>
  );
}
