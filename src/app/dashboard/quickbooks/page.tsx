"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/lib/toast";

type SyncType = "invoices" | "expenses" | "customers" | "all";

export default function QuickBooksPage() {
  const toast = useToast();
  const [connected, setConnected] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<SyncType | null>(null);
  const [syncResult, setSyncResult] = useState<{ synced?: number; errors?: number; details?: string[]; message?: string; ok?: boolean } | null>(null);
  const [accounts, setAccounts] = useState<{ Name: string; AccountType: string; Id: string }[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  useEffect(() => {
    fetch("/api/quickbooks?action=status").then(r => r.json()).then(d => {
      setConnected(d.connected);
      setCompanyId(d.companyId);
      setLastSync(d.lastSync);
    });

    // Check URL params for success/error
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "quickbooks") {
      toast.success("QuickBooks connected successfully!");
    }
    if (params.get("error")) {
      toast.error(`Connection failed: ${params.get("error")}`);
    }
  }, []);

  const connectQB = async () => {
    try {
      const res = await fetch("/api/quickbooks?action=auth_url");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Failed to generate auth URL");
      }
    } catch (e) {
      toast.error("Network error");
    }
  };

  const sync = async (syncType: SyncType) => {
    setSyncing(syncType);
    setSyncResult(null);
    try {
      const res = await fetch("/api/quickbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncType }),
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.ok) toast.success(data.message);
      else toast.error(data.error || "Sync failed");
    } catch (e) {
      toast.error("Network error");
      setSyncResult({ errors: 1, details: ["Network error"] });
    } finally {
      setSyncing(null);
    }
  };

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/quickbooks?action=chart_of_accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (e) {
      toast.error("Failed to load accounts");
    } finally {
      setLoadingAccounts(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl" style={{ fontFeatureSettings: "'ss01'" }}>
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.3px]">QuickBooks Online</h2>
        <p className="text-[13px] text-[#64748d] mt-0.5">Sync invoices, expenses, and customers with QuickBooks</p>
      </div>

      {/* Connection Status */}
      <div className={`border rounded-lg p-5 ${connected ? "bg-[#dcfce7] border-[#bbf7d0]" : "bg-white border-[#e5edf5]"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[20px] ${connected ? "bg-[#15be53]/10" : "bg-[#f6f9fc]"}`}>
              📊
            </div>
            <div>
              <div className="text-[14px] font-medium text-[#061b31]">
                {connected ? "Connected to QuickBooks" : "Not Connected"}
              </div>
              <div className="text-[12px] text-[#64748d]">
                {connected ? `Company ID: ${companyId}` : "Connect your QuickBooks Online account to sync data"}
              </div>
            </div>
          </div>
          {!connected ? (
            <button onClick={connectQB} className="bg-[#2ca01c] text-white px-5 py-2.5 rounded text-[13px] font-medium hover:bg-[#238c16] transition-colors">
              Connect QuickBooks
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#15be53] rounded-full" />
              <span className="text-[12px] text-[#15be53] font-medium">Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Sync Actions */}
      {connected && (
        <>
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="text-[14px] font-medium text-[#061b31] mb-1">📤 Sync to QuickBooks</div>
            <div className="text-[12px] text-[#64748d] mb-4">Push your TowHub data to QuickBooks Online</div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { type: "invoices" as SyncType, label: "Invoices", icon: "📄", desc: "Sync sent/paid invoices" },
                { type: "expenses" as SyncType, label: "Expenses", icon: "💰", desc: "Sync all expenses" },
                { type: "customers" as SyncType, label: "Customers", icon: "👤", desc: "Sync customer records" },
                { type: "all" as SyncType, label: "Full Sync", icon: "🔄", desc: "Sync everything at once" },
              ].map(s => (
                <button key={s.type} onClick={() => sync(s.type)} disabled={syncing !== null}
                  className="p-4 border border-[#e5edf5] rounded-lg text-left hover:border-[#b9b9f9] transition-colors disabled:opacity-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[16px]">{s.icon}</span>
                    <span className="text-[13px] font-medium text-[#061b31]">
                      {syncing === s.type ? "Syncing..." : `Sync ${s.label}`}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748d]">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sync Results */}
          {syncResult && (
            <div className={`border rounded-lg p-4 ${syncResult.ok ? "bg-[#dcfce7] border-[#bbf7d0]" : "bg-[#fef2f2] border-[#fecaca]"}`}>
              <div className={`text-[13px] font-medium ${syncResult.ok ? "text-[#166534]" : "text-[#991b1b]"}`}>
                {syncResult.message || "Sync failed"}
              </div>
              {syncResult.details && syncResult.details.length > 0 && (
                <details className="mt-2">
                  <summary className="text-[11px] text-[#64748d] cursor-pointer">View details ({syncResult.details.length})</summary>
                  <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                    {syncResult.details.map((d, i) => <div key={i} className="text-[11px]">{d}</div>)}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Chart of Accounts */}
          <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[14px] font-medium text-[#061b31]">📊 Chart of Accounts</div>
                <div className="text-[12px] text-[#64748d]">Your QuickBooks accounts</div>
              </div>
              <button onClick={loadAccounts} disabled={loadingAccounts} className="text-[12px] text-[#533afd] font-medium hover:underline">
                {loadingAccounts ? "Loading..." : "Load Accounts"}
              </button>
            </div>
            {accounts.length > 0 ? (
              <div className="divide-y divide-[#e5edf5] max-h-60 overflow-y-auto">
                {accounts.map(a => (
                  <div key={a.Id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium text-[#061b31]">{a.Name}</div>
                      <div className="text-[11px] text-[#64748d]">{a.AccountType}</div>
                    </div>
                    <div className="text-[10px] text-[#94a3b8] font-mono">ID: {a.Id}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-[12px] text-[#94a3b8]">
                Click "Load Accounts" to view your QuickBooks chart of accounts
              </div>
            )}
          </div>

          {/* Sync Info */}
          <div className="bg-[#f6f9fc] border border-[#e5edf5] rounded-lg p-4">
            <div className="text-[12px] text-[#64748d] space-y-1">
              <p><strong>How sync works:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Invoices with status "sent" or "paid" are pushed as QB Invoices</li>
                <li>Expenses are pushed as QB Purchases</li>
                <li>Customers are pushed as QB Customers</li>
                <li>Existing records are matched by name/number — no duplicates</li>
                <li>Tokens refresh automatically when expired</li>
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Setup Guide for non-connected */}
      {!connected && (
        <div className="bg-white border border-[#e5edf5] rounded-lg p-5">
          <div className="text-[14px] font-medium text-[#061b31] mb-3">📋 Setup Guide</div>
          <ol className="text-[12px] text-[#64748d] space-y-2 list-decimal list-inside">
            <li>Go to <a href="https://developer.intuit.com" target="_blank" rel="noopener" className="text-[#533afd] hover:underline">developer.intuit.com</a></li>
            <li>Create an app or use existing one</li>
            <li>Get your Client ID and Client Secret</li>
            <li>Add redirect URL: <code className="bg-[#f6f9fc] px-1.5 py-0.5 rounded text-[11px] font-mono">https://towhub.vercel.app/api/quickbooks/callback</code></li>
            <li>Add environment variables: <code className="bg-[#f6f9fc] px-1.5 py-0.5 rounded text-[11px] font-mono">QB_CLIENT_ID</code> and <code className="bg-[#f6f9fc] px-1.5 py-0.5 rounded text-[11px] font-mono">QB_CLIENT_SECRET</code></li>
            <li>Click "Connect QuickBooks" above to authorize</li>
          </ol>
        </div>
      )}
    </div>
  );
}
