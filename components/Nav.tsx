"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

// PARKED — Support and Approvals are fully implemented (lib/adapters/support, lib/agents/support,
// lib/actions, ProposedAction table) but removed from nav/dashboard until write-actions return.
// To re-enable: restore `available: true` on the two entries below.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", available: true },
  { href: "/chat", label: "Chat", available: true },
  { href: "/ads", label: "Ads", available: true },
  { href: "/research", label: "Research", available: true },
  { href: "/traffic", label: "Traffic", available: true },
  { href: "/approvals", label: "Approvals", available: false, badge: "parked" },
  { href: "/support", label: "Support", available: false, badge: "parked" },
  { href: "/content", label: "Content", available: false, badge: "soon" },
  { href: "/dev", label: "Dev", available: false, badge: "soon" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="w-56 min-h-screen bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">Jarvis</h1>
        <p className="text-xs text-slate-400 mt-0.5">CertifyMe Ops</p>
      </div>

      <div className="flex-1 py-4 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => (
          <div key={item.href}>
            {item.available ? (
              <Link
                href={item.href}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed">
                {item.label}
                <span className="ml-auto text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                  {(item as { badge?: string }).badge ?? "soon"}
                </span>
              </span>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
