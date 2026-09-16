// apps/web/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { adminService } from "../../lib/services/admin";
import { PixelIcon } from "../../components/PixelIcon";
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

    const fetchAdminDashboard = async () => {
      try {
        const data = await adminService.getDashboard();
        if (data && active) {
          setStats(data.stats);
          setMetrics(data.metrics);
          setRecentClaims(data.recent_claims);
          setRecentInterventions(data.recent_interventions);
        }
      } catch (err) {
        console.error("Error fetching admin dashboard metrics:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchAdminDashboard();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent text-white/70 font-mono text-sm">
        <span className="animate-pulse">Loading Admin Bento Console...</span>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-6 lg:p-8 bg-transparent h-screen overflow-hidden min-h-0 text-white">
      {/* Page Header */}
      <div className="shrink-0 mb-4 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase tracking-widest text-blue-400">PASUM // ADMIN CONSOLE</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-mono">System Performance & Insights</h2>
          <p className="text-xs lg:text-sm text-white/60 font-mono mt-0.5">Live platform telemetry powered by Supabase database metrics.</p>
        </div>
        <div className="flex items-center gap-2 border border-white/15 bg-white/5 text-blue-300 px-3.5 py-1.5 font-mono text-xs tracking-wider uppercase rounded-none">
          <PixelIcon name="shield" size={16} />
          PASUM ROOT
        </div>
      </div>

      {/* Flexible, Equal-Height Bento Grid (3-column layout) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-[auto_1fr_1fr] gap-4 lg:gap-5 min-h-0 h-full overflow-hidden pb-1 pr-1">

        {/* Bento Cell 1: Platform Overview (Col span 2) */}
        <div className="lg:col-span-2 border border-white/15 bg-[#09111e]/80 backdrop-blur-md rounded-none shadow-xl p-5 flex flex-col justify-between">
          <div className="shrink-0 border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400">01.</span>
              <span className="font-mono text-xs uppercase tracking-wider text-white/90">LIVE SYSTEM DIRECTORY STATUS</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 border border-emerald-500/30 px-2 py-0.5 uppercase tracking-wider bg-emerald-500/10">
              OPERATIONAL
            </span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-stretch gap-6 py-4">
            <div className="flex-1 flex flex-col justify-center">
              <span className="font-mono text-xs text-white/50 uppercase tracking-widest">Institution Root</span>
              <h3 className="font-mono text-2xl font-bold text-white mt-1">Pusat Asasi Sains (PASUM)</h3>
              <p className="font-mono text-xs text-white/40 mt-1">University of Malaya Academic Data Hub</p>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="border border-white/10 bg-white/5 p-3 text-right">
                <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider block">Total Students</span>
                <span className="font-mono text-2xl font-black text-white">{stats.total_students}</span>
              </div>
              <div className="border border-white/10 bg-white/5 p-3 text-right">
                <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider block">Total Faculty</span>
                <span className="font-mono text-2xl font-black text-white">{stats.total_lecturers}</span>
              </div>
              <div className="border border-white/10 bg-white/5 p-3 text-right">
                <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider block">Active Classes</span>
                <span className="font-mono text-2xl font-black text-white">{stats.total_classes}</span>
              </div>
              <div className="border border-white/10 bg-white/5 p-3 text-right">
                <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider block">Avg Attendance</span>
                <span className="font-mono text-2xl font-black text-emerald-400">{stats.avg_attendance}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Cell 2: Site Analytics (Col span 1) */}
        <div className="lg:col-span-1 border border-white/15 bg-[#09111e]/80 backdrop-blur-md rounded-none shadow-xl p-5 flex flex-col justify-between">
          <div className="shrink-0 border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-400">02.</span>
              <span className="font-mono text-xs uppercase tracking-wider text-white/90">SITE ANALYTICS</span>
            </div>
            <PixelIcon name="users" size={16} className="text-indigo-400" />
          </div>

          <div className="grid grid-cols-2 gap-3 py-3">
            <div className="border border-white/10 bg-white/5 p-4">
              <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider block">Daily Active</span>
              <span className="font-mono text-4xl font-black text-white mt-1 block">{metrics.active_today}</span>
            </div>
            <div className="border border-white/10 bg-white/5 p-4">
              <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider block">Weekly Active</span>
              <span className="font-mono text-4xl font-black text-white mt-1 block">{metrics.active_weekly}</span>
            </div>
          </div>
        </div>

        {/* Bento Cell 3: Check-In Accuracy (Col span 1) */}
        <div className="lg:col-span-1 border border-white/15 bg-[#09111e]/80 backdrop-blur-md rounded-none shadow-xl p-5 flex flex-col justify-between">
          <div className="shrink-0 border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-400">03.</span>
              <span className="font-mono text-xs uppercase tracking-wider text-white/90">CHECK-IN ACCURACY</span>
            </div>
            <PixelIcon name="check" size={16} className="text-emerald-400" />
          </div>

          <div className="py-2">
            <span className="font-mono text-5xl font-black text-white tracking-tight">{metrics.checkin_success_rate}%</span>
            <p className="font-mono text-xs text-white/60 mt-2">Verified successfully by Face ID, GPS radius limit, or override.</p>
          </div>
        </div>

        {/* Bento Cell 4: Real Database Check-ins Trajectory Chart (Col span 2) */}
        <div className="lg:col-span-2 border border-white/15 bg-[#09111e]/80 backdrop-blur-md rounded-none shadow-xl p-5 flex flex-col min-h-0">
          <div className="shrink-0 border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-400">04.</span>
              <span className="font-mono text-xs uppercase tracking-wider text-white/90">PLATFORM CHECK-IN ACTIVITY</span>
            </div>
            <PixelIcon name="chart" size={16} className="text-blue-400" />
          </div>

          <div className="flex-1 w-full min-h-0 pt-4">
            {metrics.daily_checkins.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.daily_checkins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAdminCheckins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09111e',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: 0,
                      color: '#fff',
                      fontFamily: 'monospace',
                      fontSize: '11px'
                    }}
                  />
                  <Area type="monotone" dataKey="count" name="Attendance Logs" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAdminCheckins)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-white/40 font-mono text-xs uppercase">
                No check-in logs recorded.
              </div>
            )}
          </div>
        </div>

        {/* Bento Cell 5: Database Schema Metrics (Col span 1) */}
        <div className="lg:col-span-1 border border-white/15 bg-[#09111e]/80 backdrop-blur-md rounded-none shadow-xl p-5 flex flex-col justify-between">
          <div className="shrink-0 border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-400">05.</span>
              <span className="font-mono text-xs uppercase tracking-wider text-white/90">SCHEMA METRICS</span>
            </div>
            <PixelIcon name="dashboard" size={16} className="text-slate-400" />
          </div>

          <div className="space-y-2 py-2">
            <div className="flex justify-between items-center pb-1 border-b border-white/10 font-mono text-xs">
              <span className="text-white/60">User Profiles</span>
              <span className="font-bold text-white">{metrics.total_profiles}</span>
            </div>
            <div className="flex justify-between items-center pb-1 border-b border-white/10 font-mono text-xs">
              <span className="text-white/60">Active Support Cases</span>
              <span className="font-bold text-white">{metrics.active_interventions_count}</span>
            </div>
            <div className="flex justify-between items-center pb-1 border-b border-white/10 font-mono text-xs">
              <span className="text-white/60">Pending Merit Claims</span>
              <span className="font-bold text-white">{metrics.pending_claims_count}</span>
            </div>
            <div className="flex justify-between items-center font-mono text-xs">
              <span className="text-white/60">Unread System Alerts</span>
              <span className="font-bold text-white">{metrics.unread_alerts_count}</span>
            </div>
          </div>

          <div className="border border-emerald-500/30 bg-emerald-500/10 p-2 flex items-center gap-2 font-mono text-[11px] text-emerald-400 uppercase">
            <PixelIcon name="check" size={14} className="text-emerald-400" /> Database Healthy
          </div>
        </div>

        {/* Bento Cell 6: Pending Merit Claims (Col span 1) */}
        <div className="lg:col-span-1 border border-white/15 bg-[#09111e]/80 backdrop-blur-md rounded-none shadow-xl p-5 flex flex-col">
          <div className="shrink-0 border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-400">06.</span>
              <span className="font-mono text-xs uppercase tracking-wider text-white/90">PENDING MERIT CLAIMS</span>
            </div>
            <PixelIcon name="award" size={16} className="text-amber-400" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pt-3 pr-1">
            {recentClaims.length > 0 ? (
              recentClaims.map((claim) => (
                <div key={claim.id} className="p-3 border border-white/10 bg-white/5 flex items-center justify-between gap-2">
                  <div className="truncate pr-2 font-mono">
                    <p className="text-xs font-bold text-white truncate">{claim.title}</p>
                    <p className="text-[10px] text-white/50 mt-0.5">{claim.student_name}</p>
                  </div>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${
                    claim.status === 'pending'
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                      : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                  }`}>
                    {claim.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 font-mono text-white/40 text-xs uppercase">All claims evaluated.</div>
            )}
          </div>
        </div>

        {/* Bento Cell 7: Active Interventions Cases (Col span 1) (Disabled) */}
        <div className="relative group/disabled lg:col-span-1 h-full cursor-not-allowed" title="Disabled Feature">
          <div className="pointer-events-none absolute top-3 right-3 hidden group-hover/disabled:flex items-center px-2 py-1 font-mono text-[11px] text-white bg-black border border-white/20 whitespace-nowrap z-50">
            Disabled Feature
          </div>
          <div className="h-full opacity-40 grayscale pointer-events-none select-none">
            <div className="border border-white/15 bg-[#09111e]/80 backdrop-blur-md rounded-none shadow-xl p-5 flex flex-col h-full">
              <div className="shrink-0 border-b border-white/10 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-rose-400">07.</span>
                  <span className="font-mono text-xs uppercase tracking-wider text-white/90">SUPPORT & INTERVENTIONS</span>
                </div>
                <span className="font-mono text-[10px] border border-white/20 px-2 py-0.5 text-white/60">
                  DISABLED
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
                {recentInterventions.length > 0 ? (
                  recentInterventions.map((item) => (
                    <div key={item.id} className="p-3 border border-white/10 bg-white/5 flex items-center justify-between gap-2">
                      <div className="truncate pr-2 font-mono">
                        <p className="text-xs font-bold text-white truncate">{item.issue_description}</p>
                        <p className="text-[10px] text-white/50 mt-0.5">{item.student_name}</p>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-white/20 text-white/70">
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 font-mono text-white/40 text-xs uppercase">No student cases flagged.</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
