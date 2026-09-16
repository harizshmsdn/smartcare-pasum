"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, ChevronRight, LogOut } from "lucide-react";
import { createClient } from "../utils/supabase/client";
import { useAuth } from "./AuthProvider";

export function Sidebar() {
  const pathname = usePathname();
  const isStudent = pathname?.startsWith("/student");
  const isAdmin = pathname?.startsWith("/admin");

  const { user, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const fetchUnreadCount = async () => {
      if (!user || !isMounted) return;

      let query = supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

      if (isStudent) {
        query = query.eq('student_id', user.id);
      } else if (!isAdmin) {
        query = query.eq('lecturer_id', user.id);
      } else {
        // Admin layout doesn't track alerts
        return;
      }

      const { count, error } = await query;
      if (!error && count !== null && isMounted) {
        setUnreadCount(count);
      }
    };

    if (user) {
      fetchUnreadCount();
    }

    // Subscribe to public.alerts Postgres changes
    const channel = supabase
      .channel('sidebar-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isStudent, isAdmin, user]);

  // Route map with explicit border classes added for Tailwind's JIT compiler
  const navItems = isAdmin
    ? [
      { name: "Dashboard", href: "/admin", bgColor: "bg-[#061930]", borderColor: "border-[#061930]" },
      { name: "Users", href: "/admin/users", bgColor: "bg-[#0b2240]", borderColor: "border-[#0b2240]" },
      { name: "Classes", href: "/admin/classes", bgColor: "bg-[#12253f]", borderColor: "border-[#12253f]" },
      { name: "Schedules", href: "/admin/schedules", bgColor: "bg-[#152c4c]", borderColor: "border-[#152c4c]" },
      { name: "Cases", href: "/admin/cases", bgColor: "bg-[#1d3456]", borderColor: "border-[#1d3456]", disabled: true },
    ]
    : isStudent
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
    <aside className="w-50 bg-transparent flex flex-col p-6 shrink-0 h-screen overflow-hidden">

      {/* Centered Title */}
      <h1 className="text-2xl font-bold mb-6 tracking-tight text-center text-slate-900">
        SMART-CARE
      </h1>

      {/* Main Navigation */}
      <nav className="flex flex-col gap-4 flex-1 mb-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isDisabled = (item as any).disabled;

          // Card Background & Border Logic
          const stateClasses = isDisabled
            ? `bg-slate-900/60 border-slate-800 opacity-50 grayscale cursor-not-allowed`
            : isActive
            ? `bg-slate-50 ${item.borderColor}`
            : `${item.bgColor} ${item.borderColor} hover:bg-slate-50`;

          const content = (
            <div
              className={`group/item relative flex-1 w-full rounded-3xl border-2 transition-all duration-300 shadow-sm hover:shadow-md block overflow-hidden ${stateClasses}`}
              title={isDisabled ? "Disabled Feature" : undefined}
            >
              {/* Chevron Icon - Top Right */}
              <ChevronRight
                size={28}
                strokeWidth={2.5}
                className={`absolute top-5 right-5 transition-all duration-300 ${isActive
                  ? "text-black rotate-0"
                  : isDisabled
                  ? "text-slate-500 -rotate-45"
                  : "text-white -rotate-45 group-hover/item:rotate-0 group-hover/item:text-black"
                  }`}
              />

              {/* Page Name - Bottom Left */}
              <div
                className={`absolute bottom-5 left-5 transition-colors duration-300 font-bold text-xl tracking-wide flex items-center gap-2 ${isActive
                  ? "text-black"
                  : isDisabled
                  ? "text-slate-400"
                  : "text-white group-hover/item:text-black"
                  }`}
              >
                <span>{item.name}</span>
                {item.name === "Alerts" && unreadCount > 0 && (
                  <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center animate-pulse shrink-0">
                    {unreadCount}
                  </span>
                )}
              </div>

              {isDisabled && (
                <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 hidden group-hover/item:flex items-center px-2 py-0.5 text-[10px] font-semibold text-white bg-slate-800 rounded shadow-md whitespace-nowrap z-50">
                  Disabled Feature
                </div>
              )}
            </div>
          );

          if (isDisabled) {
            return (
              <div key={item.name} className="flex-1 w-full flex cursor-not-allowed">
                {content}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex-1 w-full flex"
            >
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Settings & Logout Container */}
      <div className="flex flex-col gap-2 mt-auto">
        <Link
          href={isAdmin ? "/admin/settings" : isStudent ? "/student/settings" : "/settings"}
          className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-medium transition-colors w-full text-left ${pathname === (isAdmin ? "/admin/settings" : isStudent ? "/student/settings" : "/settings")
            ? "bg-slate-200 text-slate-900"
            : "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
            }`}
        >
          <Settings size={20} /> Settings
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-5 py-4 rounded-2xl font-medium transition-colors w-full text-left text-red-600 hover:bg-red-50 hover:text-red-700 border-none bg-transparent cursor-pointer"
        >
          <LogOut size={20} /> Log Out
        </button>
      </div>
    </aside>
  );
}