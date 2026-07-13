// apps/web/components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, ChevronRight } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  // Route map
  const navItems = [
    { name: "Home", href: "/", bgColor: "bg-[#061930]" }, // Dark blue
    { name: "Dashboard", href: "/dashboard", bgColor: "bg-[#0b2240]" }, // Blue
    { name: "Classes", href: "/classes", bgColor: "bg-[#12253f]" }, // Lighter blue 
    { name: "Alerts", href: "/alerts", bgColor: "bg-[#152c4c]" }, // Lightest blue
    { name: "Profile", href: "/profile", bgColor: "bg-[#1d3456]" }, // Off-white blue?
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
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative flex-1 w-full rounded-3xl transition-all duration-300 ${item.bgColor} shadow-sm hover:shadow-md block overflow-hidden`}
            >
              {/* Chevron Icon - Top Right */}
              <ChevronRight 
                size={28} 
                strokeWidth={2.5}
                className="absolute top-5 right-5 text-white group-hover:text-white transition-all duration-300 -rotate-45 group-hover:rotate-0" 
              />
              
              {/* Page Name - Bottom Left */}
              <div className="absolute bottom-5 left-5 text-white group-hover:text-white transition-colors duration-300 font-bold text-xl tracking-wide">
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>
      
      {/* Settings */}
      <Link
        href="/settings"
        className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-medium transition-colors w-full text-left mt-auto ${
          pathname === "/settings"
            ? "bg-slate-200 text-slate-900"
            : "text-slate-500 hover:bg-slate-200 hover:text-slate-900"
        }`}
      >
        <Settings size={20} /> Settings
      </Link>
    </aside>
  );
}