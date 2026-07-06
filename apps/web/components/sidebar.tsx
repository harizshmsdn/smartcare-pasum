// apps/web/components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Users, UserCircle, Settings } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Classes", href: "#", icon: Users },
    { name: "Profile", href: "#", icon: UserCircle },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 shrink-0 h-screen overflow-y-auto">
      <h1 className="text-2xl font-bold mb-10 tracking-tight">SMART-CARE</h1>
      <nav className="flex flex-col gap-2 h-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors w-full text-left ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={20} /> {item.name}
            </Link>
          );
        })}
        
        {/* Settings at the bottom */}
        <Link
          href="#"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full text-left mt-auto"
        >
          <Settings size={20} /> Settings
        </Link>
      </nav>
    </aside>
  );
}