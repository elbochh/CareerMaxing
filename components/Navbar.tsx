"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Briefcase,
  CalendarRange,
  GraduationCap,
  ListChecks,
  User,
  LogOut,
  LogIn,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/events", label: "Events", icon: CalendarRange },
  { href: "/learning", label: "Learning", icon: GraduationCap },
  { href: "/checklist", label: "Checklist", icon: ListChecks },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isLoggedIn = status === "authenticated" && !!session?.user?.id;

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-6">
          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center gap-3 group transition-transform active:scale-95 shrink-0"
          >
            <div>
              <Image
                src="/careerMaxingLogo.png"
                alt="CareerMaxing Logo"
                width={48}
                height={48}
                priority
                className="object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#0F3A43] font-extrabold tracking-tight text-sm sm:text-base group-hover:text-[#008A6C] transition-colors">
                CareerMaxing
              </span>
            </div>
          </Link>

          {isLoggedIn ? (
            <>
              <nav className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar justify-start md:justify-center">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap active:scale-[0.97]",
                        active
                          ? "bg-teal-50 text-[#008A6C] border border-teal-100 shadow-sm"
                          : "text-slate-500 hover:text-[#0F3A43] hover:bg-slate-50 hover:border-slate-200 border border-transparent",
                      )}
                    >
                      <Icon className={cn("w-4 h-4 transition-transform", active && "scale-105")} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/onboarding"
                  className="border border-slate-200 text-slate-600 text-xs font-bold px-3.5 py-2.5 flex items-center gap-2 rounded-xl shadow-xs hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="hidden xs:inline">Profile</span>
                </Link>

                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100/70 text-xs font-bold px-3.5 py-2.5 flex items-center gap-2 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xs:inline">Logout</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <Link
                href="/signup"
                className="border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 flex items-center gap-2 rounded-xl shadow-xs hover:bg-slate-50 active:scale-95 transition-all"
              >
                Sign up
              </Link>
              <Link
                href="/login"
                className="bg-[#0F3A43] hover:bg-[#008A6C] text-white text-xs font-bold px-4 py-2.5 flex items-center gap-2 rounded-xl shadow-sm active:scale-95 transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Log in</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4 animate-scale-up">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  Are you sure you want to log out?
                </h3>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-rose-700 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
