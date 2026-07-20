"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ADMIN_NAV = [
  { href: "/admin", icon: "grid", label: "Overview" },
  { href: "/admin/companies", icon: "building", label: "Companies" },
  { href: "/admin/waitlist", icon: "clipboard", label: "Waitlist" },
  { href: "/admin/broadcast", icon: "bell", label: "Broadcast" },
  { href: "/admin/news", icon: "file", label: "News" },
  { href: "/admin/ads", icon: "trending-up", label: "Ads" },
];

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const icons: Record<string, React.ReactNode> = {
    grid: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    building: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="1" /><line x1="9" y1="6" x2="9" y2="6.01" /><line x1="15" y1="6" x2="15" y2="6.01" /><line x1="9" y1="10" x2="9" y2="10.01" /><line x1="15" y1="10" x2="15" y2="10.01" /><line x1="9" y1="14" x2="9" y2="14.01" /><line x1="15" y1="14" x2="15" y2="14.01" /><path d="M9 22v-4h6v4" /></svg>,
    clipboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>,
    logOut: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
  };
  return <>{icons[name] || null}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null);

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (!data.user || data.user.role !== "super_admin") { router.push("/login"); return; }
    setUser(data.user);
  }, [router]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9fc]">
        <div className="w-8 h-8 border-2 border-[#533afd] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] flex" style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-[220px] bg-white border-r border-[#e5edf5] min-h-screen flex flex-col">
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-[#e5edf5]">
          <div className="w-7 h-7 bg-[#ea2261] rounded flex items-center justify-center text-white text-[11px] font-semibold">T</div>
          <div>
            <span className="text-[15px] font-semibold tracking-tight">TowHub</span>
            <div className="text-[10px] text-[#ea2261] font-medium uppercase tracking-wider">Admin</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {ADMIN_NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium transition-colors ${
                  active ? "bg-[#ea2261]/[0.06] text-[#ea2261]" : "text-[#64748d] hover:text-[#061b31] hover:bg-[#f6f9fc]"
                }`}>
                <Icon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#e5edf5] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#ea2261]/10 rounded-full flex items-center justify-center text-[#ea2261] text-[11px] font-semibold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#061b31]">{user.firstName}</div>
                <div className="text-[11px] text-[#64748d]">Super Admin</div>
              </div>
            </div>
            <button onClick={handleLogout} className="text-[#64748d] hover:text-[#dc2626] p-1"><Icon name="logOut" size={15} /></button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1">
        <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-[#e5edf5] px-6 flex items-center sticky top-0 z-20">
          <h1 className="text-[15px] font-medium text-[#061b31]" style={{ fontFeatureSettings: "'ss01'" }}>
            {ADMIN_NAV.find(n => n.href === pathname)?.label || "Admin"}
          </h1>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
