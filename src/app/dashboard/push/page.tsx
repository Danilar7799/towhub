"use client";

import { useState, useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/lib/toast";

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

export default function PushNotificationsPage() {
  const toast = useToast();
  const { subscription, loading, supported, subscribe, unsubscribe, checkSubscription } = usePushNotifications();
  const [subscriptions, setSubscriptions] = useState<Array<Record<string, unknown>>>([]);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const res = await fetch("/api/push/subscribe");
      // This endpoint returns VAPID key, not subscriptions
      // We'd need a separate endpoint or load from org settings
    } catch (err) {
      console.error("[Push Page] Error loading subscriptions:", err);
    }
  };

  const handleTestNotification = async () => {
    setTestLoading(true);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Notification",
          body: "Push notifications are working! 🎉",
          tag: "test",
          data: { url: "/dashboard" },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Test sent to ${data.sent} device(s)`);
      } else {
        toast.error(data.error || "Failed to send test");
      }
    } catch (err) {
      toast.error("Failed to send test");
    } finally {
      setTestLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="space-y-6 max-w-[800px]" style={{ fontFeatureSettings: "'ss01'" }}>
        <div>
          <h2 className="text-[20px] font-semibold tracking-[-0.3px]">🔔 Push Notifications</h2>
          <p className="text-[13px] text-[#64748d] mt-0.5">Real-time alerts for jobs, dispatch, and system events</p>
        </div>
        <div className="bg-white border border-[#e5edf5] rounded-lg p-6 text-center py-12">
          <div className="text-[48px] mb-4">🚫</div>
          <h3 className="text-[16px] font-semibold text-[#061b31] mb-2">Not Supported</h3>
          <p className="text-[13px] text-[#64748d] mb-4">Push notifications require HTTPS and a modern browser with Service Worker support.</p>
          <div className="text-[12px] text-[#94a3b8]">Try Chrome, Firefox, Edge, or Safari on HTTPS or localhost.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[800px]" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">🔔 Push Notifications</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Real-time alerts for jobs, dispatch, and system events</p>
      </div>

      {/* Status Card */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4">Browser Subscription</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${subscription ? "bg-[#15be53]" : "bg-[#e5edf5]"}`} />
            <div>
              <div className="text-[14px] font-medium text-[#061b31]">
                {subscription ? "Subscribed" : "Not Subscribed"}
              </div>
              <div className="text-[12px] text-[#64748d]">
                {subscription 
                  ? "You'll receive real-time notifications" 
                  : "Enable to get instant alerts for new jobs, assignments, and updates"}
              </div>
            </div>
          </div>
          <button
            onClick={subscription ? unsubscribe : subscribe}
            disabled={loading}
            className={`px-5 py-2.5 rounded text-[13px] font-medium transition-colors ${subscription ? "bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2]" : "bg-[#533afd] text-white hover:bg-[#4434d4]"} disabled:opacity-50`}
          >
            {loading ? "Working..." : subscription ? "Disable" : "Enable Notifications"}
          </button>
        </div>
      </div>

      {/* Test Notification */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4">Test Notification</h3>
        <p className="text-[12px] text-[#64748d] mb-4">Send a test push to your devices to verify everything works.</p>
        <button
          onClick={handleTestNotification}
          disabled={testLoading || !subscription}
          className={`px-5 py-2.5 rounded text-[13px] font-medium transition-colors ${!subscription ? "bg-[#e5edf5] text-[#94a3b8] cursor-not-allowed" : "bg-[#533afd] text-white hover:bg-[#4434d4]"} disabled:opacity-50`}
        >
          {testLoading ? "Sending..." : "Send Test Notification"}
        </button>
        {!subscription && (
          <p className="text-[11px] text-[#94a3b8] mt-2">Enable notifications first to send a test</p>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text-[15px] font-semibold mb-4">How It Works</h3>
        <div className="space-y-3 text-[13px] text-[#273951]">
          <div className="flex items-start gap-3 p-3 bg-[#f6f9fc] rounded-lg">
            <span className="text-[20px]">1️⃣</span>
            <div>
              <div className="font-medium">Click "Enable Notifications"</div>
              <div className="text-[12px] text-[#64748d]">Browser asks for permission, registers with push service</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-[#f6f9fc] rounded-lg">
            <span className="text-[20px]">2️⃣</span>
            <div>
              <div className="font-medium">Server saves your subscription</div>
              <div className="text-[12px] text-[#64748d]">Encrypted endpoint stored securely per organization</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-[#f6f9fc] rounded-lg">
            <span className="text=[20px]">3️⃣</span>
            <div>
              <div className="font-medium">Events trigger notifications</div>
              <div className="text=[12px] text-[#64748d]">New job assigned, driver en route, job completed, etc.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-[#f6f9fc] rounded-lg">
            <span className="text=[20px]">4️⃣</span>
            <div>
              <div className="font-medium">Click notification to open TowHub</div>
              <div className="text=[12px] text-[#64748d]">Deep-links to relevant page (job, dispatch, etc.)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Events that trigger notifications */}
      <div className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <h3 className="text=[15px] font-semibold mb-4">Events That Send Notifications</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            "New job created (AI dispatcher, manual, lead)",
            "Job assigned to you",
            "Driver en route / on scene / towing",
            "Job completed / cancelled",
            "Customer messages / chat",
            "Shift start / end reminders",
            "Vehicle maintenance due",
            "Document expiry (CDL, insurance, medical)",
            "Impound vehicle ready for auction",
            "Invoice sent / payment received",
          ].map((event, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-[#f6f9fc] rounded text-[12px] text-[#273951]">
              <span className="text=[16px]">✓</span>
              <span>{event}</span>
            </div>
          ))}
        </div>
      </div>

      {/* VAPID Key Info */}
      <details className="bg-white border border-[#e5edf5] rounded-lg p-6">
        <summary className="text=[13px] font-medium text-[#533afd] cursor-pointer">Technical Details (VAPID Keys)</summary>
        <div className="mt-4 text=[12px] text-[#64748d] space-y-2 font-mono">
          <div>Public Key: <code className="text-[#273951]">{process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.slice(0, 20)}...</code></div>
          <div>Endpoint: <code className="text-[#273951]">/api/push/subscribe</code></div>
          <div>Send API: <code className="text-[#273951]">/api/push/send</code></div>
          <div className="text=[11px]">Keys are auto-generated. Keep private key secret!</div>
        </div>
      </details>
    </div>
  );
}