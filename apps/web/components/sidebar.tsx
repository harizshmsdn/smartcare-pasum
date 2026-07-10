// apps/web/components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, ChevronRight } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  // Route map
  const navItems = [
    { name: "Home", href: "/", bgColor: "bg-[#1e3a8a]" }, // Navy blue
    { name: "Dashboard", href: "/dashboard", bgColor: "bg-[#ef4444]" }, // Red
    { name: "Classes", href: "/classes", bgColor: "bg-[#eab308]" }, // Mustard yellow
    { name: "Profile", href: "/profile", bgColor: "bg-[#38bdf8]" }, // Sky blue
  ];

  return (
    
    <aside className="w-55 bg-[#FAF9F6] flex flex-col p-6 shrink-0 h-screen overflow-hidden">
      
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
                className="absolute top-5 right-5 text-black group-hover:text-white transition-all duration-300 -rotate-45 group-hover:rotate-0" 
              />
              
              {/* Page Name - Bottom Left */}
              <div className="absolute bottom-5 left-5 text-black group-hover:text-white transition-colors duration-300 font-bold text-xl tracking-wide">
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