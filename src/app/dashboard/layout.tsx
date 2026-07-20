"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NotificationProvider } from "@/lib/notifications";
import { NotificationBell } from "@/components/notification-bell";
import { TopAdBanner } from "@/components/ads";
import { useKeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { PushNotificationPrompt } from "@/components/push-prompt";
import { DarkModeToggle } from "@/components/dark-mode-toggle";

type UserRole = "super_admin" | "owner" | "admin" | "dispatcher" | "driver";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "grid", label: "Overview", roles: ["super_admin", "owner", "admin", "dispatcher", "driver"] as UserRole[] },
  { href: "/dashboard/dispatch", icon: "map", label: "Dispatch", roles: ["super_admin", "owner", "admin", "dispatcher"] as UserRole[] },
  { href: "/dashboard/messages", icon: "message-circle", label: "Messages", roles: ["super_admin", "owner", "admin", "dispatcher", "driver"] as UserRole[] },
  { href: "/dashboard/jobs", icon: "list", label: "Jobs", roles: ["super_admin", "owner", "admin", "dispatcher", "driver"] as UserRole[] },
  { href: "/dashboard/calendar", icon: "calendar", label: "Calendar", roles: ["super_admin", "owner", "admin", "dispatcher"] as UserRole[] },
  { href: "/dashboard/kpi", icon: "trophy", label: "Driver KPI", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/customers", icon: "user", label: "Customers", roles: ["super_admin", "owner", "admin", "dispatcher"] as UserRole[] },
  { href: "/dashboard/fleet", icon: "truck", label: "Fleet", roles: ["super_admin", "owner", "admin", "dispatcher"] as UserRole[] },
  { href: "/dashboard/maintenance", icon: "settings", label: "Maintenance", roles: ["super_admin", "owner", "admin", "dispatcher"] as UserRole[] },
  { href: "/dashboard/drivers", icon: "users", label: "Team", roles: ["super_admin", "owner", "admin", "dispatcher"] as UserRole[] },
  { href: "/dashboard/subcontractors", icon: "building", label: "Subcontractors", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/contracts", icon: "file-text", label: "Contracts", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/leads", icon: "link", label: "Leads", roles: ["super_admin", "owner", "admin", "dispatcher"] as UserRole[] },
  { href: "/dashboard/invoices", icon: "file", label: "Invoices", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/expenses", icon: "dollar", label: "Expenses", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/earnings", icon: "trending-up", label: "Earnings", roles: ["super_admin", "owner", "admin", "driver"] as UserRole[] },
  { href: "/dashboard/reports", icon: "bar-chart", label: "Reports", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/impound", icon: "archive", label: "Impound", roles: ["super_admin", "owner", "admin", "dispatcher"] as UserRole[] },
  { href: "/dashboard/auctions", icon: "gavel", label: "Auctions", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/rates", icon: "tag", label: "Rates", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/billing", icon: "credit-card", label: "Billing", roles: ["super_admin", "owner"] as UserRole[] },
  { href: "/dashboard/settings", icon: "settings", label: "Settings", roles: ["super_admin", "owner", "admin", "dispatcher", "driver"] as UserRole[] },
  { href: "/dashboard/ai-docs", icon: "file-text", label: "AI Docs", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/automation", icon: "settings", label: "Automation", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/quickbooks", icon: "bar-chart", label: "QuickBooks", roles: ["super_admin", "owner", "admin"] as UserRole[] },
  { href: "/dashboard/import", icon: "download", label: "Import/Export", roles: ["super_admin", "owner", "admin"] as UserRole[] },
];

/** Returns true if the given role can access the nav item. */
function canAccess(role: UserRole | string, item: { roles: UserRole[] }): boolean {
  return item.roles.includes(role as UserRole);
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const icons: Record<string, React.ReactNode> = {
    grid: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    map: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>,
    list: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>,
    truck: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
    users: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
    link: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
    dollar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
    "trending-up": <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    file: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    "bar-chart": <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>,
    archive: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>,
    "message-circle": <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    trophy: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>,
    tag: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    logOut: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    building: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01" /></svg>,
    "file-text": <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
    "credit-card": <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>,
    gavel: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2l5 5-7 7-5-5z" /><path d="M9.5 12l-5 5 2 2 5-5" /><line x1="2" y1="22" x2="7" y2="17" /></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  };
  return <>{icons[name] || null}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string; email: string } | null>(null);
  const [org, setOrg] = useState<{ name: string; status: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useKeyboardShortcuts();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (!data.user) { router.push("/login"); return; }
    setUser(data.user);
    setOrg(data.org);
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

  // Filter nav items by user role
  const visibleNavItems = NAV_ITEMS.filter(item => canAccess(user.role, item));

  // Quick tabs filtered by role
  const QUICK_TABS_BASE = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/jobs", label: "Jobs" },
    { href: "/dashboard/dispatch", label: "Dispatch" },
    { href: "/dashboard/customers", label: "Customers" },
    { href: "/dashboard/leads", label: "Leads" },
    { href: "/dashboard/fleet", label: "Fleet" },
    { href: "/dashboard/invoices", label: "Invoices" },
    { href: "/dashboard/reports", label: "Reports" },
    { href: "/dashboard/auctions", label: "Auctions" },
    { href: "/dashboard/settings", label: "Settings" },
  ];
  const visibleQuickTabs = QUICK_TABS_BASE.filter(tab => {
    const navItem = NAV_ITEMS.find(n => n.href === tab.href);
    return navItem ? canAccess(user.role, navItem) : false;
  });

  return (
    <NotificationProvider>
    <TopAdBanner />
        <PushNotificationPrompt />
    <div className="min-h-screen bg-[#f6f9fc] flex" style={{ fontFamily: "'Source Sans 3', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-[220px] bg-white border-r border-[#e5edf5] flex flex-col transform transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-[#e5edf5]">
          <div className="w-7 h-7 bg-[#533afd] rounded flex items-center justify-center text-white text-[11px] font-semibold">T</div>
          <span className="text-[15px] font-semibold tracking-tight">TowHub</span>
        </div>

        {/* Org */}
        {org && (
          <div className="px-5 py-3 border-b border-[#e5edf5]">
            <div className="text-[13px] font-medium text-[#061b31] truncate">{org.name}</div>
            {org.status === "pending" && (
              <div className="mt-1 inline-flex items-center gap-1.5 bg-[#fef3c7] text-[#92400e] text-[11px] font-medium px-2 py-0.5 rounded">
                <div className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full" />
                Pending approval
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-[#533afd]/[0.06] text-[#533afd]"
                    : "text-[#64748d] hover:text-[#061b31] hover:bg-[#f6f9fc]"
                }`}>
                <Icon name={item.icon} size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-[#e5edf5] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 bg-[#533afd]/10 rounded-full flex items-center justify-center text-[#533afd] text-[11px] font-semibold shrink-0">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[#061b31] truncate">{user.firstName} {user.lastName}</div>
                <div className="text-[11px] text-[#64748d] capitalize">{user.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="text-[#64748d] hover:text-[#dc2626] transition-colors p-1" title="Sign out">
              <Icon name="logOut" size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 md:ml-[220px]">
        {/* Header */}
        <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-[#e5edf5] px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-[#64748d] p-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <h1 className="text-[15px] font-medium text-[#061b31]" style={{ fontFeatureSettings: "'ss01'" }}>
              {visibleNavItems.find(n => n.href === pathname)?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            {user.role !== "driver" && (searchOpen ? (
              <div className="flex items-center gap-2">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search jobs, customers..."
                  className="w-[200px] px-3 py-1.5 border border-[#e5edf5] rounded text-[12px] focus:border-[#533afd] outline-none"
                  autoFocus
                  onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                />
                <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="text-[#64748d] text-[12px]">✕</button>
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="text-[#64748d] hover:text-[#061b31] p-1.5 transition-colors" title="Search">
                <Icon name="search" size={16} />
              </button>
            ))}
            {/* Notifications */}
            <NotificationBell />
            <DarkModeToggle />
            {/* Dispatch link */}
            <a href="/dashboard/dispatch" className="text-[12px] text-[#64748d] hover:text-[#533afd] transition-colors hidden sm:block ml-2">
              Dispatch →
            </a>
          </div>
        </header>

        {/* Quick Tabs */}
        <div className="border-b border-[#e5edf5] bg-white px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {visibleQuickTabs.map(tab => {
              const active = pathname === tab.href;
              return (
                <Link key={tab.href} href={tab.href}
                  className={`px-3 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? "border-[#533afd] text-[#533afd]"
                      : "border-transparent text-[#64748d] hover:text-[#061b31] hover:border-[#e5edf5]"
                  }`}>
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
    </NotificationProvider>
  );
}
