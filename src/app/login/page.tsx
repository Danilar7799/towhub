"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      if (data.user.role === "super_admin") router.push("/admin");
      else router.push("/dashboard");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Left — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1c1e54] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-[#533afd] via-[#f96bee] to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-9 h-9 bg-[#533afd] rounded-md flex items-center justify-center text-white font-semibold">T</div>
            <span className="text-xl font-semibold text-white tracking-tight">TowHub</span>
          </div>
          <h2 className="text-[36px] font-light text-white leading-[1.15] tracking-[-0.8px] mb-6" style={{ fontFeatureSettings: "'ss01'" }}>
            The operating system for towing businesses
          </h2>
          <p className="text-[17px] font-light text-white/60 leading-[1.6] max-w-[400px]">
            Manage dispatch, track drivers, capture leads, and grow your towing company — all from one platform.
          </p>
        </div>
        <div className="relative">
          <div className="flex items-center gap-4 text-white/40 text-[13px]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#15be53] rounded-full" />
              <span>99.9% uptime</span>
            </div>
            <div>•</div>
            <span>24/7 AI dispatch</span>
            <div>•</div>
            <span>Real-time tracking</span>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-[#533afd] rounded-md flex items-center justify-center text-white font-semibold">T</div>
            <span className="text-xl font-semibold tracking-tight">TowHub</span>
          </div>

          <h1 className="text-[28px] font-semibold tracking-[-0.5px] mb-2" style={{ fontFeatureSettings: "'ss01'" }}>Sign in</h1>
          <p className="text-[15px] text-[#64748d] mb-8">Welcome back. Enter your credentials to continue.</p>

          {error && (
            <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] px-4 py-3 rounded text-[13px] mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#273951] mb-1.5">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none transition-colors"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#273951] mb-1.5">Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[14px] focus:border-[#533afd] focus:ring-1 focus:ring-[#533afd]/20 outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#533afd] text-white py-2.5 rounded text-[15px] font-medium hover:bg-[#4434d4] disabled:opacity-50 transition-all shadow-[0_4px_16px_rgba(83,58,253,0.3)] mt-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="text-center mt-6 text-[13px] text-[#64748d]">
            Don&apos;t have an account? <a href="/" className="text-[#533afd] font-medium hover:underline">Apply for access</a>
          </div>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-[#f6f9fc] border border-[#e5edf5] rounded">
            <div className="text-[12px] font-medium text-[#273951] uppercase tracking-wider mb-3">Demo accounts</div>
            <div className="space-y-2 text-[13px] text-[#64748d]">
              <div className="flex justify-between">
                <span>Super Admin</span>
                <code className="font-mono text-[12px] bg-white px-2 py-0.5 rounded border border-[#e5edf5]">admin@towhub.io</code>
              </div>
              <div className="flex justify-between">
                <span>Company Owner</span>
                <code className="font-mono text-[12px] bg-white px-2 py-0.5 rounded border border-[#e5edf5]">owner@demotowing.com</code>
              </div>
              <div className="text-[11px] text-[#94a3b8] mt-1">Password: admin123 / demo123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
