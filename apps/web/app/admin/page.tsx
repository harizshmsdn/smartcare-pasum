// apps/web/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  Clock,
  Activity,
  ShieldAlert,
  CheckCircle,
  Database,
  Award,
  Globe,
  UserCheck
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { createClient } from "../../utils/supabase/client";

interface SystemStats {
  total_students: number;
  total_lecturers: number;
  total_classes: number;
  avg_attendance: number;
}

interface SystemMetrics {
  daily_checkins: { day: string; count: number }[];
  checkin_success_rate: number;
  total_profiles: number;
  pending_claims_count: number;
  active_interventions_count: number;
  unread_alerts_count: number;
  active_today: number;
  active_weekly: number;
}

interface RecentClaim {
  id: string;
  title: string;
  status: string;
  student_name: string;
}

interface RecentIntervention {
  id: string;
  issue_description: string;
  status: string;
  student_name: string;
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<SystemStats>({
    total_students: 0,
    total_lecturers: 0,
    total_classes: 0,
    avg_attendance: 0
  });
  const [metrics, setMetrics] = useState<SystemMetrics>({
    daily_checkins: [],
    checkin_success_rate: 0,
    total_profiles: 0,
    pending_claims_count: 0,
    active_interventions_count: 0,
    unread_alerts_count: 0,
    active_today: 0,
    active_weekly: 0
  });
  const [recentClaims, setRecentClaims] = useState<RecentClaim[]>([]);
  const [recentInterventions, setRecentInterventions] = useState<RecentIntervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchAdminDashboard = async (token: string) => {
      try {
        const res = await fetch("http://localhost:8000/api/admin/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok && active) {
          const data = await res.json();
          setStats(data.stats);
          setMetrics(data.metrics);
          setRecentClaims(data.recent_claims);
          setRecentInterventions(data.recent_interventions);
        }
      } catch (err) {
        console.error("Error fetching admin dashboard:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && active) {
        fetchAdminDashboard(session.access_token);
      } else {
        if (active) setIsLoading(false);
      }
    });

    // 2. Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && active) {
        setIsLoading(true);
        fetchAdminDashboard(session.access_token);
      } else if (!session && active) {
        if (active) setIsLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#FAF9F6]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          <span className="font-semibold text-slate-700 text-xl">Loading Admin Bento Console...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-8 lg:p-10 bg-transparent h-screen overflow-hidden min-h-0">

      {/* Page Header */}
      <div className="shrink-0 mb-6">
        <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">System Performance & Insights</h2>
        <p className="text-base text-slate-500 mt-1">Platform management console powered entirely by Supabase database metrics.</p>
      </div>

      {/* Flexible, Stretching Bento Grid (3-column layout) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-y-auto pb-4 pr-1">

        {/* Bento Cell 1: Platform Overview (Col span 2) */}
        <div
          className="lg:col-span-2 rounded-3xl border-l-8 border-l-blue-500 border border-slate-800 p-8 shadow-sm text-white flex flex-col justify-between relative overflow-hidden min-h-[220px]"
          style={{ backgroundColor: "#0b2240" }}
        >
          <div className="absolute -right-20 -top-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row justify-between items-stretch gap-6 h-full w-full z-10">
            {/* Left side: Directory Label */}
            <div className="flex-1 flex flex-col justify-between">
              <span className="text-blue-300 text-sm font-bold uppercase tracking-widest">Live System Directory Status</span>
              <h3 className="text-3xl font-black tracking-tight mt-4 leading-tight">Pusat Asasi Sains (PASUM)</h3>
            </div>

            {/* Right side: Key metric figures */}
            <div className="grid grid-cols-2 gap-x-40 gap-y-6 justify-items-end shrink-0 min-w-max pl-10 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0">
              <div className="text-right">
                <span className="text-slate-300 text-xs font-bold uppercase tracking-wider block">Total Students</span>
                <span className="text-3xl font-black text-white">{stats.total_students}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-300 text-xs font-bold uppercase tracking-wider block">Total Faculty</span>
                <span className="text-3xl font-black text-white">{stats.total_lecturers}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-300 text-xs font-bold uppercase tracking-wider block">Active Classes</span>
                <span className="text-3xl font-black text-white">{stats.total_classes}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-300 text-xs font-bold uppercase tracking-wider block">Avg Attendance</span>
                <span className="text-3xl font-black text-emerald-400">{stats.avg_attendance}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Cell 2: Site Visits / DAU & WAU (Col span 1) */}
        <div
          className="lg:col-span-1 text-white rounded-3xl border border-slate-800 border-l-8 border-l-indigo-500 p-8 shadow-sm flex flex-col justify-between min-h-[220px]"
          style={{ backgroundColor: "#1e1b4b" }}
        >
          <div>
            <span className="text-indigo-300 text-xs font-bold uppercase tracking-widest block">Site Analytics</span>
            <h3 className="font-extrabold text-white text-xl mt-1 flex items-center gap-2">
              <Globe size={20} className="text-indigo-400" /> Active Visitors
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Daily Active</span>
              <span className="text-5xl font-black text-white">{metrics.active_today}</span>
            </div>
            <div>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Weekly Active</span>
              <span className="text-5xl font-black text-white">{metrics.active_weekly}</span>
            </div>
          </div>
        </div>

        {/* Bento Cell 3: Check-In success (Col span 1) */}
        <div
          className="lg:col-span-1 text-white rounded-3xl border border-slate-800 border-l-8 border-l-emerald-400 p-8 shadow-sm flex flex-col justify-between min-h-[220px]"
          style={{ backgroundColor: "#064e3b" }}
        >
          <div>
            <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest block">Check-In Accuracy</span>
            <h3 className="font-extrabold text-white text-xl mt-1 flex items-center gap-2">
              <UserCheck size={20} className="text-emerald-400" /> Verify Success
            </h3>
          </div>

          <div className="py-2">
            <span className="text-5xl font-black text-white tracking-tight">{metrics.checkin_success_rate}%</span>
            <p className="text-sm text-slate-200 mt-2 font-medium">Of check-ins successfully verified by Face ID, GPS radius limits or manual overrides.</p>
          </div>
        </div>

        {/* Bento Cell 4: Real Database Check-ins Trajectory Chart (Col span 2) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border-t-8 border-t-blue-600 border border-slate-200 p-8 shadow-sm flex flex-col space-y-6 min-h-[350px]">
          <div>
            <h3 className="font-extrabold text-slate-900 text-xl flex items-center gap-2">
              <Activity className="text-blue-600" size={24} />
              Platform Check-In Activity
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">Real-time attendance record logging frequency over the last 7 days.</p>
          </div>

          <div className="flex-1 w-full min-h-0">
            {metrics.daily_checkins.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.daily_checkins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCheckins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="count" name="Attendance Logs" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCheckins)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">No check-in logs recorded.</div>
            )}
          </div>
        </div>

        {/* Bento Cell 5: Database Volume & Resource Indicators (Col span 1) */}
        <div
          className="lg:col-span-1 text-white rounded-3xl border border-slate-800 border-l-8 border-l-slate-400 p-8 shadow-sm flex flex-col justify-between min-h-[350px]"
          style={{ backgroundColor: "#0f172a" }}
        >
          <div>
            <h3 className="font-extrabold text-white text-xl flex items-center gap-2">
              <Database size={20} className="text-slate-400" /> Schema Metrics
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Database storage allocation details.</p>
          </div>

          <div className="space-y-4 py-4 z-10">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
              <span className="text-base text-slate-300 font-semibold">User Profiles</span>
              <span className="font-bold text-white text-xl">{metrics.total_profiles}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
              <span className="text-base text-slate-300 font-semibold">Active Support Cases</span>
              <span className="font-bold text-white text-xl">{metrics.active_interventions_count}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-800">
              <span className="text-base text-slate-300 font-semibold">Pending Merit Claims</span>
              <span className="font-bold text-white text-xl">{metrics.pending_claims_count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-base text-slate-300 font-semibold">Unread System Alerts</span>
              <span className="font-bold text-white text-xl">{metrics.unread_alerts_count}</span>
            </div>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-2xl flex items-center gap-2 text-xs text-slate-300 font-bold z-10 border border-slate-700/35">
            <CheckCircle size={16} className="text-emerald-400" /> Database Healthy
          </div>
        </div>

        {/* Bento Cell 6: Pending Merit Claims (Col span 1) */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 border-l-8 border-l-amber-500 p-6 shadow-sm flex flex-col space-y-4 min-h-[300px]">
          <div>
            <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
              <Award className="text-amber-500" size={20} /> Pending Merit Claims
            </h4>
            <p className="text-xs text-slate-500">Student submissions waiting for review.</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {recentClaims.length > 0 ? (
              recentClaims.map((claim) => (
                <div key={claim.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-2 shadow-xs">
                  <div className="truncate pr-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{claim.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{claim.student_name}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize shrink-0 ${claim.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                    {claim.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs italic">All claims evaluated.</div>
            )}
          </div>
        </div>

        {/* Bento Cell 7: Active Interventions Cases (Col span 1) - Side by Side with Card 6! */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200 border-l-8 border-l-rose-500 p-6 shadow-sm flex flex-col space-y-4 min-h-[300px]">
          <div>
            <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
              <ShieldAlert className="text-rose-500" size={20} /> Support & Interventions
            </h4>
            <p className="text-xs text-slate-500">Urgent intervention cases currently active.</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {recentInterventions.length > 0 ? (
              recentInterventions.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-2 shadow-xs">
                  <div className="truncate pr-2">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.issue_description}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{item.student_name}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize shrink-0 ${item.status === 'needs_review' ? 'bg-rose-100 text-rose-800' :
                    item.status === 'in_progress' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs italic">No urgent student cases flagged.</div>
            )}
          </div>
        </div>

      </div>

    </main>
  );
}
