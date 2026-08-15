// apps/web/app/student/alerts/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BellRing,
  AlertTriangle,
  TrendingDown,
  Clock,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";
import { studentService } from "../../../lib/services/student";
import EmptyState from "../../../components/EmptyState";

interface AlertItem {
  id: string;
  course: string;
  type: string;
  priority: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export default function StudentAlertsPage() {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState("");

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await studentService.getAlerts();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error("Error loading student alerts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Subscribe to Realtime changes on 'alerts' table for live updates
    const channel = supabase
      .channel('student_alerts_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      await studentService.markAlertRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await studentService.markAllAlertsRead();
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all alerts as read:", err);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === "unread") return !a.isRead;
    if (filter === "critical") return a.priority === "critical";
    return true;
  });

  if (isLoading) {
    return (
      <main className="flex-1 p-8 h-screen flex flex-col bg-[#FAF9F6] overflow-hidden">
        <header className="shrink-0 mb-8 flex justify-between items-end">
          <div>
            <div className="w-48 h-8 bg-slate-200 rounded animate-pulse mb-2"></div>
            <div className="w-32 h-4 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </header>
        <div className="flex-1 min-h-0 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-100 p-4 gap-2 shrink-0">
            <div className="w-24 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="w-24 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="w-24 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="flex-1 p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 shadow-sm animate-pulse flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
                <div className="flex-1">
                  <div className="w-1/3 h-5 bg-slate-200 rounded mb-2"></div>
                  <div className="w-3/4 h-4 bg-slate-200 rounded mb-3"></div>
                  <div className="w-1/4 h-3 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8 h-screen flex flex-col bg-[#FAF9F6] overflow-hidden">

      {/* Header */}
      <header className="shrink-0 mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900 flex items-center gap-3">
            My Alerts Inbox
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
                {unreadCount} New
              </span>
            )}
          </h2>
          <p className="text-slate-500 mt-1">Real-time notifications</p>
        </div>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors px-4 py-2 border-none bg-transparent cursor-pointer"
            >
              Mark all as read
            </button>
          )}
        </div>
      </header>

      {/* Main Inbox Container */}
      <div className="flex-1 min-h-0 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

        {/* Inbox Tabs */}
        <div className="flex border-b border-slate-100 p-4 gap-2 shrink-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border-none cursor-pointer ${filter === "all" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 bg-transparent"}`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border-none cursor-pointer ${filter === "unread" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 bg-transparent"}`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter("critical")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${filter === "critical" ? "bg-red-50 text-red-700 border border-red-100" : "text-slate-500 hover:bg-slate-100 border border-transparent bg-transparent"}`}
          >
            Critical Only
          </button>
        </div>

        {/* Feed List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex items-center justify-center py-20">
              <EmptyState 
                icon={CheckCircle2}
                title="You're all caught up!"
                description="No pending alerts matching your current filter. You are all good to go!"
              />
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`relative p-5 rounded-2xl border transition-all ${alert.isRead
                    ? "bg-white border-slate-100 opacity-70"
                    : "bg-slate-50 border-slate-200 shadow-sm"
                  }`}
              >
                {/* Unread Indicator */}
                {!alert.isRead && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-blue-500 rounded-r-full"></div>
                )}

                <div className="flex justify-between items-start pl-2">
                  <div className="flex gap-4">
                    {/* Dynamic Icon based on alert type */}
                    <div className={`mt-1 shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${alert.priority === 'critical' ? 'bg-red-100 text-red-600' :
                        alert.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                          'bg-slate-200 text-slate-600'
                      }`}>
                      {alert.type === 'attendance' ? <BellRing size={18} /> :
                        alert.type === 'assessment' ? <TrendingDown size={18} /> :
                          <AlertTriangle size={18} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-lg font-bold ${alert.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                          {alert.course}
                        </h4>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md uppercase border ${
                          alert.type === 'academic' ? 'bg-blue-50 text-blue-800 border-blue-100' :
                          alert.type === 'attendance' ? 'bg-orange-50 text-orange-850 border-orange-100' :
                          'bg-slate-100 text-slate-650 border-slate-200'
                        }`}>
                          {alert.type}
                        </span>
                      </div>

                      <p className={`text-sm mb-3 max-w-2xl ${alert.isRead ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                        {alert.message}
                      </p>

                      <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={14} /> {alert.timestamp}</span>
                        <span className="uppercase text-[10px] tracking-wide font-semibold text-slate-400/80">Priority: {alert.priority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href="/student/interventions"
                      onClick={() => {
                        if (!alert.isRead) markAsRead(alert.id);
                      }}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors no-underline cursor-pointer shadow-sm"
                    >
                      View Case <ArrowRight size={14} />
                    </Link>
                    {!alert.isRead && (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 border-none bg-transparent cursor-pointer"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}
