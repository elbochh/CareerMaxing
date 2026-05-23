"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LayoutDashboard, Briefcase, CalendarRange, GraduationCap, Inbox, ListChecks, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/events", label: "Events", icon: CalendarRange },
  { href: "/learning", label: "Learning", icon: GraduationCap },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/checklist", label: "Checklist", icon: ListChecks },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/70 border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-fuchsia-500 grid place-items-center shadow-glow">
            <Sparkles className="w-4 h-4 text-white" />
          </span>
          <span className="text-white font-semibold tracking-tight">CareerMaxing</span>
          <span className="badge-accent hidden sm:inline-flex">beta</span>
        </Link>
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap",
                  active
                    ? "bg-accent/15 text-accent-glow border border-accent/30"
                    : "text-muted hover:text-muted-strong hover:bg-bg-elevated",
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/onboarding"
          className="btn-ghost text-xs"
          aria-label="Edit profile"
        >
          <User className="w-4 h-4" /> Profile
        </Link>
      </div>
    </header>
  );
}
