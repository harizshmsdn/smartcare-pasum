// apps/web/app/dashboard/page.tsx
"use client";

import { AlertTriangle, TrendingDown, TrendingUp, Award, GraduationCap, Clock } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

const performanceData = [
  { name: "Quiz 1", AvgScore: 78, Attendance: 94 },
  { name: "Lab 1", AvgScore: 85, Attendance: 92 },
  { name: "Test 1", AvgScore: 64, Attendance: 89 },
  { name: "Quiz 2", AvgScore: 72, Attendance: 86 },
  { name: "Lab 2", AvgScore: 81, Attendance: 88 },
];

const gradeDistribution = [
  { grade: "A", count: 24 },
  { grade: "B", count: 48 },
  { grade: "C", count: 32 },
  { grade: "D", count: 14 },
  { grade: "F", count: 6 },
];

export default function DashboardPage() {
  return (
    <main className="flex-1 p-8 overflow-y-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900">Overall Metrics Dashboard</h2>
        <p className="text-slate-500 mt-1">Aggregated analytics across all assigned cohorts</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[140px]">
        
        {/* Core Summary */}
        <div className="md:col-span-2 row-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Student Ecosystem</p>
              <h3 className="text-4xl font-bold tracking-tight mt-1">124</h3>
            </div>
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
              <GraduationCap size={24} />
            </div>
          </div>
          <p className="text-xs text-blue-200 flex items-center gap-1">
            <TrendingUp size={14} /> +4% enrollment increase from previous cohort block
          </p>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm group hover:border-red-300 transition-colors">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500 font-medium">Critical Risk Tier</span>
            <div className="bg-red-50 text-red-600 p-2 rounded-xl group-hover:animate-pulse">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-600">3</div>
            <p className="text-xs text-slate-400 mt-1">Breached &lt;80% attendance/marks</p>
          </div>
        </div>

        {/* At-Risk Students */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500 font-medium">Moderate At-Risk</span>
            <div className="bg-orange-50 text-orange-600 p-2 rounded-xl">
              <TrendingDown size={20} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-orange-600">8</div>
            <p className="text-xs text-slate-400 mt-1">Demonstrating continuous decline</p>
          </div>
        </div>

        {/* Line Chart */}
        <div className="md:col-span-2 row-span-2 bg-white p-6 rounded-2xl border border-slate-200 flex flex-col shadow-sm">
          <div className="mb-4">
            <h4 className="font-bold text-slate-900 text-base">Assessment vs Attendance Timeline</h4>
            <p className="text-xs text-slate-500">Consolidated analytics stream metrics across intervals</p>
          </div>
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="AvgScore" stroke="#3b82f6" strokeWidth={2} name="Avg Score %" />
                <Line type="monotone" dataKey="Attendance" stroke="#10b981" strokeWidth={2} name="Attendance %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="row-span-2 bg-white p-6 rounded-2xl border border-slate-200 flex flex-col shadow-sm">
          <div className="mb-4">
            <h4 className="font-bold text-slate-900 text-base">Cohort Grade Curve</h4>
            <p className="text-xs text-slate-500">Distribution calculation array</p>
          </div>
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistribution} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
                <XAxis dataKey="grade" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Logs */}
        <div className="row-span-1 bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <Clock size={14} className="text-slate-400" /> System Run Logs
          </div>
          <p className="text-sm font-medium text-slate-700 my-2 line-clamp-2">
            n8n automation tier cleanly executed batch evaluation rules.
          </p>
          <span className="text-[11px] bg-slate-100 text-slate-600 py-0.5 px-2 rounded-md self-start font-mono">
            5m execution window OK
          </span>
        </div>

        {/* Top Stream */}
        <div className="row-span-1 bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start text-emerald-800">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Stream</span>
            <Award size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-800">94%</p>
            <p className="text-xs text-emerald-700/80 mt-0.5">Computer Science 101 Avg</p>
          </div>
        </div>

      </div>
    </main>
  );
}