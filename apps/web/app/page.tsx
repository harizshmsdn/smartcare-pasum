// apps/web/app/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { QrCode, AlertTriangle, TrendingDown, LayoutDashboard, ArrowRight } from "lucide-react";

export default function HomePage() {
  const [hasUpcomingClass, setHasUpcomingClass] = useState(true);

  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Welcome back, Dr. Ahmad</h2>
          <p className="text-slate-500 mt-1">Monday, 6 July 2026</p>
        </div>
        <button 
          onClick={() => setHasUpcomingClass(!hasUpcomingClass)}
          className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-4 rounded-full font-medium transition-colors"
        >
          Toggle Schedule State
        </button>
      </header>

      {hasUpcomingClass ? (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100 mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
            <div>
              <span className="text-xs font-bold tracking-wider text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full">Upcoming Class • 10:00 AM</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-3">Physics 101 - Mechanics</h3>
              <p className="text-slate-500">Group A • Lecture Hall 3</p>
            </div>
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-semibold shadow-md shadow-blue-200 transition-all active:scale-95">
              <QrCode size={24} /> Generate Attendance QR
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-6">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
              <div className="flex items-center gap-2 text-red-700 mb-2 font-semibold"><AlertTriangle size={18} /> Critical Students</div>
              <div className="text-3xl font-bold text-red-700 mb-1">2</div>
              <p className="text-sm text-red-600/80">Requires immediate intervention</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <div className="flex items-center gap-2 text-orange-700 mb-2 font-semibold"><TrendingDown size={18} /> At-Risk Students</div>
              <div className="text-3xl font-bold text-orange-700 mb-1">5</div>
              <p className="text-sm text-orange-600/80">Declining performance/attendance</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 text-green-700 mb-2 font-semibold">Overall Attendance</div>
              <div className="text-3xl font-bold text-green-700 mb-1">88%</div>
              <p className="text-sm text-green-600/80">Semester average to date</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 mb-10 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <LayoutDashboard size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Upcoming Classes Today</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">You have completed all scheduled lectures for today. Check your overall metrics to review student progression.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-medium transition-all active:scale-95">
            View Overall Dashboard <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </main>
  );
}