// apps/web/app/profile/page.tsx
"use client";

import { 
  Mail, 
  MessageSquare, 
  CalendarDays, 
  AlertTriangle, 
  TrendingDown,
  Clock,
  CheckCircle2,
  BookOpen,
  ArrowLeft
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  AreaChart,
  Area
} from "recharts";
import Link from "next/link";

// Mock Data for the student's historical timeline
const studentHistory = [
  { week: "Week 1", score: 85, attendance: 100 },
  { week: "Week 2", score: 82, attendance: 100 },
  { week: "Week 3", score: 78, attendance: 80 },
  { week: "Week 4", score: 65, attendance: 60 },
  { week: "Week 5", score: 45, attendance: 40 }, // AI triggers here
];

export default function ProfilePage() {
  return (
    <main className="flex-1 p-8 overflow-y-auto bg-slate-50">
      
      {/* Navigation Breadcrumb */}
      <div className="mb-6">
        <Link href="/classes" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={16} /> Back to Class Roster
        </Link>
      </div>

      {/* Header Profile Card */}
      <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-50 rounded-full -mr-10 -mt-10 opacity-50 pointer-events-none"></div>

        <div className="flex items-center gap-5 z-10">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-3xl font-bold shadow-inner">
            A
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-slate-900">Ahmad Hakimi bin Faisal</h2>
              <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                <AlertTriangle size={14} /> Critical Risk
              </span>
            </div>
            <p className="text-slate-500 font-medium">Matric: 1720441 • Physics 101 (Group A)</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 z-10 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors">
            <Mail size={18} /> Email
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-colors">
            <CalendarDays size={18} /> Setup Intervention
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Metrics & AI Insights (Takes up 2 columns on large screens) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Core Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-1">Current Attendance</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-red-600">60%</p>
                <p className="text-sm text-red-500 font-medium flex items-center mb-1"><TrendingDown size={14} /> -20%</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-1">Latest Assessment</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-orange-600">45%</p>
                <p className="text-sm text-slate-400 font-medium mb-1">Quiz 2</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-1">Missed Classes</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-slate-900">4</p>
                <p className="text-sm text-slate-400 font-medium mb-1">Total</p>
              </div>
            </div>
          </div>

          {/* Historical Performance Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Performance Trajectory</h3>
              <p className="text-sm text-slate-500">Correlation between attendance and assessment scores</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studentHistory} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} name="Score %" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="attendance" stroke="#ef4444" strokeWidth={3} name="Attendance %" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: AI Insights & Activity Feed */}
        <div className="space-y-8">
          
          {/* n8n / AI Output Card */}
          <div className="bg-red-50 border border-red-100 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-red-100 p-2 rounded-lg text-red-600">
                <AlertTriangle size={20} />
              </div>
              <h3 className="font-bold text-red-900">System Alert Log</h3>
            </div>
            <p className="text-sm text-red-800 leading-relaxed mb-4">
              <strong>Automated Trigger:</strong> Student's attendance dropped by 40% over the last 14 days, perfectly correlating with a 33-point drop in continuous assessments. 
            </p>
            <div className="bg-white/60 p-3 rounded-xl border border-red-200">
              <p className="text-xs font-semibold text-red-900 uppercase tracking-wider mb-2">Recommended Action</p>
              <p className="text-sm text-red-800 flex items-start gap-2">
                <ArrowLeft size={16} className="mt-0.5 shrink-0" /> Route to UM Counselling Unit and schedule immediate academic intervention.
              </p>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Recent Activity</h3>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              
              {/* Timeline Item 1 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-red-100 text-red-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow flex-col absolute left-0 md:left-1/2 -translate-x-1/2">
                  <AlertTriangle size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-12 md:ml-0 p-4 rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-900 text-sm">System Alert</div>
                    <time className="font-medium text-xs text-slate-500">Yesterday</time>
                  </div>
                  <div className="text-slate-500 text-xs">Flagged for critical intervention.</div>
                </div>
              </div>

              {/* Timeline Item 2 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow flex-col absolute left-0 md:left-1/2 -translate-x-1/2">
                  <Clock size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-12 md:ml-0 p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-900 text-sm">Missed Class</div>
                    <time className="font-medium text-xs text-slate-500">Mon, 10:00 AM</time>
                  </div>
                  <div className="text-slate-500 text-xs">Physics 101 Lab</div>
                </div>
              </div>

              {/* Timeline Item 3 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-emerald-100 text-emerald-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow flex-col absolute left-0 md:left-1/2 -translate-x-1/2">
                  <CheckCircle2 size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-12 md:ml-0 p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-900 text-sm">Attendance Logged</div>
                    <time className="font-medium text-xs text-slate-500">Last Week</time>
                  </div>
                  <div className="text-slate-500 text-xs">Verified via Location/QR</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </main>
  );
}