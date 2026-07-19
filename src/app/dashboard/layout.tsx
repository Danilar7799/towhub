"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "📊", label: "Overview" },
  { href: "/dashboard/dispatch", icon: "🗺️", label: "Dispatch" },
  { href: "/dashboard/jobs", icon: "📋", label: "Jobs" },
  { href: "/dashboard/fleet", icon: "🚛", label: "Fleet" },
  { href: "/dashboard/drivers", icon: "👥", label: "Team" },
  { href: "/dashboard/leads", icon: "🔗", label: "Leads" },
  { href: "/dashboard/expenses", icon: "💸", label: "Expenses" },
  { href: "/dashboard/earnings", icon: "💰", label: "Earnings" },
  { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null);
  const [org, setOrg] = useState<{ name: string; status: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      setOrg(data.org);
    });
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin text-4xl">⏳</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-blue-900 text-white transform transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-xl font-black">T</div>
            <div>
              <div className="font-bold text-lg">TowHub</div>
              {org && <div className="text-blue-300 text-xs truncate max-w-[180px]">{org.name}</div>}
            </div>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname === item.href ? "bg-blue-700 text-white" : "text-blue-200 hover:bg-blue-800 hover:text-white"
                }`}>
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="bg-blue-800 rounded-xl p-4">
            <div className="text-sm font-medium">{user.firstName} {user.lastName}</div>
            <div className="text-blue-300 text-xs capitalize">{user.role}</div>
            {org && org.status === "pending" && (
              <div className="mt-2 bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded">⏳ Pending Approval</div>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 md:ml-64">
        {/* Top bar */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-gray-600 text-2xl">☰</button>
          <div className="text-lg font-bold text-gray-400">
            {NAV_ITEMS.find(n => n.href === pathname)?.label || "Dashboard"}
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 font-medium">
            Sign Out
          </button>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
