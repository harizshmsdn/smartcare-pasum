// apps/web/components/sidebar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "../utils/supabase/client";
import { useAuth } from "./AuthProvider";
import { PixelIcon, StreamlinePixelKey } from "./PixelIcon";

interface NavItemConfig {
  name: string;
  href: string;
  key: string;
  keyBg: string;
  keyColor: string;
  icon: StreamlinePixelKey;
  disabled?: boolean;
}

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

    // Subscribe to realtime alerts for instant badge counter updates
    const channel = supabase
      .channel('sidebar-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isStudent, isAdmin, user]);

  // dottxt.ai styled navigation items with keys and Streamline Pixel icons
  const navItems: NavItemConfig[] = isAdmin
    ? [
      { name: "Dashboard", href: "/admin", key: "D", keyBg: "#BD932F", keyColor: "#000", icon: "dashboard" },
      { name: "Users", href: "/admin/users", key: "U", keyBg: "#7F9ACF", keyColor: "#000", icon: "users" },
      { name: "Classes", href: "/admin/classes", key: "C", keyBg: "#A6B4A3", keyColor: "#000", icon: "classes" },
      { name: "Schedules", href: "/admin/schedules", key: "S", keyBg: "#DDB8CA", keyColor: "#000", icon: "schedules" },
      { name: "Cases", href: "/admin/cases", key: "X", keyBg: "#79311B", keyColor: "#fff", icon: "cases", disabled: true },
    ]
    : isStudent
      ? [
        { name: "Home", href: "/student", key: "H", keyBg: "#BD932F", keyColor: "#000", icon: "home" },
        { name: "Dashboard", href: "/student/dashboard", key: "D", keyBg: "#7F9ACF", keyColor: "#000", icon: "dashboard" },
        { name: "Classes", href: "/student/classes", key: "C", keyBg: "#A6B4A3", keyColor: "#000", icon: "classes" },
        { name: "Alerts", href: "/student/alerts", key: "A", keyBg: "#DDB8CA", keyColor: "#000", icon: "alerts" },
        { name: "Profile", href: "/student/profile", key: "P", keyBg: "#79311B", keyColor: "#fff", icon: "profile" },
      ]
      : [
        { name: "Home", href: "/", key: "H", keyBg: "#BD932F", keyColor: "#000", icon: "home" },
        { name: "Dashboard", href: "/dashboard", key: "D", keyBg: "#7F9ACF", keyColor: "#000", icon: "dashboard" },
        { name: "Classes", href: "/classes", key: "C", keyBg: "#A6B4A3", keyColor: "#000", icon: "classes" },
        { name: "Alerts", href: "/alerts", key: "A", keyBg: "#DDB8CA", keyColor: "#000", icon: "alerts" },
        { name: "Profile", href: "/profile", key: "P", keyBg: "#79311B", keyColor: "#fff", icon: "profile" },
      ];

  return (
    <aside className="w-64 bg-[#09111e]/90 backdrop-blur-md border-r border-white/10 flex flex-col p-5 shrink-0 h-screen overflow-hidden select-none z-20">
      
      {/* dottxt.ai Brand Title */}
      <div className="mb-8 pt-2 px-2 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white font-sans">
            tigha<span className="text-blue-400">.</span>
          </h1>
          <p className="text-[10px] font-mono text-white/40 tracking-wider uppercase mt-0.5">
            PASUM // MONITORING
          </p>
        </div>
        <span className="text-[10px] font-mono bg-white/10 text-white/70 px-1.5 py-0.5 rounded-none border border-white/15">
          v1.0
        </span>
      </div>

      {/* dottxt.ai Section Nav Buttons */}
      <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isDisabled = item.disabled;

          const buttonContent = (
            <div
              className={`group relative flex items-center gap-3 px-3.5 py-3 rounded-none border transition-all text-sm ${
                isDisabled
                  ? "border-white/5 bg-black/20 opacity-40 cursor-not-allowed text-slate-500"
                  : isActive
                  ? "border-white/40 bg-white/10 text-white shadow-xs"
                  : "border-white/10 bg-black/30 text-slate-300 hover:border-white/30 hover:bg-white/5 hover:text-white"
              }`}
              title={isDisabled ? "Disabled Feature" : undefined}
            >
              {/* Colored Key Badge */}
              <span
                className="w-5 h-5 flex items-center justify-center text-[11px] font-mono font-bold shrink-0 rounded-none shadow-xs"
                style={{ backgroundColor: item.keyBg, color: item.keyColor }}
              >
                {item.key}
              </span>

              {/* Streamline Pixel Icon */}
              <PixelIcon
                name={item.icon}
                size={16}
                className={isActive ? "text-blue-400" : "text-slate-400 group-hover:text-white"}
              />

              {/* Label */}
              <span className="font-medium tracking-wide flex-1 text-left truncate">
                {item.name}
              </span>

              {/* Unread Alerts Badge */}
              {item.name === "Alerts" && unreadCount > 0 && (
                <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 bg-red-500 text-white rounded-none border border-red-400 animate-pulse">
                  {unreadCount}
                </span>
              )}

              {/* Wireframe Indicator */}
              <span className={`text-[11px] font-mono transition-transform duration-200 ${isActive ? 'text-blue-400 translate-x-0.5' : 'text-white/20 group-hover:text-white/70 group-hover:translate-x-0.5'}`}>
                →
              </span>

              {isDisabled && (
                <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold text-white bg-slate-900 border border-white/20 rounded-none whitespace-nowrap z-50">
                  DISABLED FEATURE
                </div>
              )}
            </div>
          );

          if (isDisabled) {
            return (
              <div key={item.name} className="cursor-not-allowed">
                {buttonContent}
              </div>
            );
          }

          return (
            <Link key={item.name} href={item.href} className="block">
              {buttonContent}
            </Link>
          );
        })}
      </nav>

      {/* Settings & Logout in dottxt.ai Wireframe Box */}
      <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-white/10">
        <Link
          href={isAdmin ? "/admin/settings" : isStudent ? "/student/settings" : "/settings"}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-none border text-xs font-mono transition-all ${
            pathname === (isAdmin ? "/admin/settings" : isStudent ? "/student/settings" : "/settings")
              ? "border-white/40 bg-white/10 text-white"
              : "border-white/10 bg-black/20 text-slate-400 hover:border-white/25 hover:text-white hover:bg-white/5"
          }`}
        >
          <PixelIcon name="settings" size={15} />
          <span>SETTINGS</span>
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-none border border-red-500/20 bg-red-950/20 text-red-400 hover:border-red-500/40 hover:bg-red-950/40 hover:text-red-300 text-xs font-mono transition-all cursor-pointer w-full text-left"
        >
          <PixelIcon name="logout" size={15} />
          <span>LOG OUT</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;