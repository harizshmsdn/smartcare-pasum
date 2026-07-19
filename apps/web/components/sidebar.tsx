// apps/web/components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, ChevronRight, LogOut } from "lucide-react";
import { createClient } from "../utils/supabase/client";

export function Sidebar() {
  const pathname = usePathname();
  const isStudent = pathname?.startsWith("/student");

  // Route map with explicit border classes added for Tailwind's JIT compiler
  const navItems = isStudent
    ? [
        { name: "Home", href: "/student", bgColor: "bg-[#061930]", borderColor: "border-[#061930]" },
        { name: "Dashboard", href: "/student/dashboard", bgColor: "bg-[#0b2240]", borderColor: "border-[#0b2240]" },
        { name: "Classes", href: "/student/classes", bgColor: "bg-[#12253f]", borderColor: "border-[#12253f]" },
        { name: "Alerts", href: "/student/alerts", bgColor: "bg-[#152c4c]", borderColor: "border-[#152c4c]" },
        { name: "Profile", href: "/student/profile", bgColor: "bg-[#1d3456]", borderColor: "border-[#1d3456]" },
      ]
    : [
        { name: "Home", href: "/", bgColor: "bg-[#061930]", borderColor: "border-[#061930]" },
        { name: "Dashboard", href: "/dashboard", bgColor: "bg-[#0b2240]", borderColor: "border-[#0b2240]" },
        { name: "Classes", href: "/classes", bgColor: "bg-[#12253f]", borderColor: "border-[#12253f]" },
        { name: "Alerts", href: "/alerts", bgColor: "bg-[#152c4c]", borderColor: "border-[#152c4c]" },
        { name: "Profile", href: "/profile", bgColor: "bg-[#1d3456]", borderColor: "border-[#1d3456]" },
      ];

  return (
    <aside className="w-50 bg-[#FAF9F6] flex flex-col p-6 shrink-0 h-screen overflow-hidden">

      {/* Centered Title */}
      <h1 className="text-2xl font-bold mb-6 tracking-tight text-center text-slate-900">
        SMART-CARE
      </h1>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-4 flex-1 mb-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          // Card Background & Border Logic
          const stateClasses = isActive
            ? `bg-slate-50 ${item.borderColor}` // Constant hollow state when active
            : `${item.bgColor} ${item.borderColor} hover:bg-slate-50`; // Solid state, turns hollow on hover

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative flex-1 w-full rounded-3xl border-2 transition-all duration-300 shadow-sm hover:shadow-md block overflow-hidden ${stateClasses}`}
            >
              {/* Chevron Icon - Top Right */}
              <ChevronRight
                size={28}
                strokeWidth={2.5}
                className={`absolute top-5 right-5 transition-all duration-300 ${isActive
                    ? "text-black rotate-0"
                    : "text-white -rotate-45 group-hover:rotate-0 group-hover:text-black"
                  }`}
              />

              {/* Page Name - Bottom Left */}
              <div
                className={`absolute bottom-5 left-5 transition-colors duration-300 font-bold text-xl tracking-wide ${isActive
                    ? "text-black"
                    : "text-white group-hover:text-black"
                  }`}
              >
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Settings & Logout Container */}
      <div className="flex flex-col gap-2 mt-auto">
        <Link
          href={isStudent ? "/student/settings" : "/settings"}
          className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-medium transition-colors w-full text-left ${pathname === (isStudent ? "/student/settings" : "/settings")
              ? "bg-slate-200 text-slate-900"
              : "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
            }`}
        >
          <Settings size={20} /> Settings
        </Link>
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 px-5 py-4 rounded-2xl font-medium transition-colors w-full text-left text-red-600 hover:bg-red-50 hover:text-red-700 border-none bg-transparent cursor-pointer"
        >
          <LogOut size={20} /> Log Out
        </button>
      </div>
    </aside>
  );
}