"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const ADMIN_NAV = [
  { href: "/admin", icon: "📊", label: "Overview" },
  { href: "/admin/companies", icon: "🏢", label: "Companies" },
  { href: "/admin/waitlist", icon: "📋", label: "Waitlist" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ firstName: string; lastName: string; role: string } | null>(null);

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (!data.user || data.user.role !== "super_admin") {
      router.push("/login");
      return;
    }
    setUser(data.user);
  }, [router]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin text-4xl">⏳</div></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white min-h-screen p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-xl font-black">T</div>
          <div>
            <div className="font-bold">TowHub</div>
            <div className="text-red-400 text-xs">Super Admin</div>
          </div>
        </div>

        <nav className="space-y-1">
          {ADMIN_NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                pathname === item.href ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}>
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="text-sm text-gray-400 mb-2">{user.firstName} {user.lastName}</div>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1">
        <header className="bg-white border-b px-6 py-4">
          <div className="text-lg font-bold text-gray-400">
            {ADMIN_NAV.find(n => n.href === pathname)?.label || "Admin"}
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
