"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
 * Breadcrumbs — Stripe-style
 * Dashboard > Dispatch > Job #123
 */

const LABEL_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  dispatch: "Dispatch",
  jobs: "Jobs",
  "live-calls": "Live Calls",
  fleet: "Fleet",
  customers: "Customers",
  drivers: "Team",
  invoices: "Invoices",
  reports: "Reports",
  settings: "Settings",
  compliance: "Compliance",
  impound: "Impound",
  calls: "Call History",
  billing: "Billing",
  calendar: "Calendar",
  leads: "Leads",
  expenses: "Expenses",
  earnings: "Earnings",
  contracts: "Contracts",
  "bland-config": "Bland.ai",
  "retell-config": "Retell AI",
  "admin-visibility": "Admin Visibility",
  driver: "Driver View",
  maintenance: "Maintenance",
  subcontractors: "Subcontractors",
  auctions: "Auctions",
  rates: "Rates",
  locations: "Locations",
  automation: "Automation",
  kpi: "Driver KPI",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => ({
    label: LABEL_MAP[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-4">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[#d1d5db]">/</span>}
          {crumb.isLast ? (
            <span className="text-[#061b31] font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-[#533afd] transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}