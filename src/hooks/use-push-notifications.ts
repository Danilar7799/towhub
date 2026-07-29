import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/lib/toast";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function usePushNotifications() {
  const [subscription, setSubscription] = useState<PushSubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const isSupported = "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;
    setSupported(isSupported);
    
    if (isSupported) {
      checkSubscription();
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub.toJSON() as PushSubscriptionData);
      }
    } catch (err) {
      console.error("[Push] Error checking subscription:", err);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) {
      toast.error("Push notifications not supported in this browser");
      return false;
    }

    setLoading(true);
    try {
      // Get VAPID key from server
      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) throw new Error("Failed to get VAPID key");
      const { publicKey } = await keyRes.json();

      // Subscribe via service worker
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subData = sub.toJSON() as PushSubscriptionData;

      // Save to server
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subData }),
      });

      if (!saveRes.ok) throw new Error("Failed to save subscription");

      setSubscription(subData);
      toast.success("Push notifications enabled!");
      return true;
    } catch (err) {
      console.error("[Push] Subscribe error:", err);
      toast.error("Failed to enable push notifications");
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, toast]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      if (subscription) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();

        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: "DELETE",
        });
      }
      setSubscription(null);
      toast.success("Push notifications disabled");
    } catch (err) {
      console.error("[Push] Unsubscribe error:", err);
      toast.error("Failed to disable push notifications");
    } finally {
      setLoading(false);
    }
  }, [subscription, toast]);

  return { subscription, loading, supported, subscribe, unsubscribe, checkSubscription };
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}