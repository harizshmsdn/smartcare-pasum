// apps/web/app/alerts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../utils/supabase/client";
import { alertService } from "../../lib/services/alerts";
import EmptyState from "../../components/EmptyState";
import { PixelIcon } from "../../components/PixelIcon";

interface AlertItem {
  id: string;
  studentName: string;
  matricId: string;
  studentUuid: string;
  course: string;
  type: string;
  priority: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export default function AlertsPage() {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await alertService.getAlerts();
      if (data?.alerts) {
        setAlerts(data.alerts.map((a: any) => ({
          id: String(a.id),
          studentName: a.studentName || a.student?.full_name || "Student",
          matricId: a.matricId || a.student?.institutional_id || "",
          studentUuid: a.studentUuid || a.student_id || "",
          course: a.course || a.subject_name || "General",
          type: a.type || "system",
          priority: a.priority || "medium",
          message: a.message || "",
          timestamp: a.timestamp || "Recently",
          isRead: Boolean(a.isRead !== undefined ? a.isRead : a.is_read)
        })));
        return;
      }
    } catch (err) {
      console.warn("API alert fetch error, falling back to direct Supabase:", err);
    }

    // Direct Supabase query fallback
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: alertRows } = await supabase
          .from('alerts')
          .select('id, type, priority, message, is_read, created_at, student_id, profiles:student_id (id, institutional_id, full_name), classes:class_id (subjects:subject_id (name))')
          .or(`lecturer_id.eq.${user.id},student_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(100);

        if (alertRows) {
          const nowMs = Date.now();
          setAlerts(alertRows.map((a: any) => {
            const createdMs = a.created_at ? new Date(a.created_at).getTime() : nowMs;
            const diffMin = Math.max(0, Math.floor((nowMs - createdMs) / 60000));
            const diffHr = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHr / 24);
            const timestamp = diffMin < 1 ? "Just now" : diffMin < 60 ? `${diffMin}m ago` : diffHr < 24 ? `${diffHr}h ago` : `${diffDay}d ago`;

            return {
              id: String(a.id),
              studentName: a.profiles?.full_name || "Student",
              matricId: a.profiles?.institutional_id || "",
              studentUuid: a.profiles?.id || a.student_id || "",
              course: a.classes?.subjects?.name || "General",
              type: a.type || "system",
              priority: a.priority || "medium",
              message: a.message || "",
              timestamp,
              isRead: Boolean(a.is_read)
            };
          }));
        }
      }
    } catch (fallbackErr) {
      console.error("Direct Supabase alert fetch error:", fallbackErr);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      await alertService.markRead(id);
    } catch {
      await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    }
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const markAllAsRead = async () => {
    try {
      await alertService.markAllRead();
    } catch {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('alerts').update({ is_read: true }).or(`lecturer_id.eq.${user.id},student_id.eq.${user.id}`);
      }
    }
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === "unread") return !a.isRead;
    if (filter === "critical") return a.priority === "critical";
    return true;
  });

  if (isLoading) {
    return (
      <main className="flex-1 p-6 lg:p-8 h-screen flex flex-col bg-transparent overflow-hidden text-white">
        <header className="shrink-0 mb-8 flex justify-between items-end pb-4 border-b border-white/10">
          <div>
            <div className="w-48 h-8 bg-white/10 rounded-none animate-pulse mb-2"></div>
            <div className="w-32 h-4 bg-white/10 rounded-none animate-pulse"></div>
          </div>
        </header>
        <div className="flex-1 min-h-0 bg-[#08090c]/80 border border-white/15 rounded-none shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 border border-white/10 bg-white/5 animate-pulse flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-none shrink-0"></div>
                <div className="flex-1">
                  <div className="w-1/3 h-5 bg-white/10 rounded-none mb-2"></div>
                  <div className="w-3/4 h-4 bg-white/10 rounded-none mb-3"></div>
                  <div className="w-1/4 h-3 bg-white/10 rounded-none"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-8 h-screen flex flex-col bg-transparent overflow-hidden text-white">
      {/* Header */}
      <header className="shrink-0 mb-6 flex justify-between items-end pb-4 border-b border-white/10">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight uppercase text-white flex items-center gap-3">
            Alerts Inbox
            {unreadCount > 0 && (
              <span className="bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-none">
                {unreadCount} UNREAD
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-1">Real-time attendance warnings and academic notifications</p>
        </div>
        <div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 border border-emerald-400/30 bg-emerald-500/10 rounded-none cursor-pointer uppercase tracking-wider"
            >
              Mark All As Read
            </button>
          )}
        </div>
      </header>

      {/* Main Inbox Container */}
      <div className="flex-1 min-h-0 bg-[#08090c]/80 border border-white/15 rounded-none shadow-xl flex flex-col overflow-hidden backdrop-blur-md">
        {/* Inbox Filter Tabs */}
        <div className="flex border-b border-white/10 p-3 gap-2 shrink-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3.5 py-1.5 rounded-none text-xs font-bold uppercase transition-colors cursor-pointer border ${filter === "all" ? "bg-white/15 text-white border-white/30" : "text-slate-400 hover:text-white border-transparent bg-transparent"}`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-3.5 py-1.5 rounded-none text-xs font-bold uppercase transition-colors cursor-pointer border ${filter === "unread" ? "bg-white/15 text-white border-white/30" : "text-slate-400 hover:text-white border-transparent bg-transparent"}`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter("critical")}
            className={`px-3.5 py-1.5 rounded-none text-xs font-bold uppercase transition-colors cursor-pointer border ${filter === "critical" ? "bg-red-500/20 text-red-300 border-red-500/40" : "text-slate-400 hover:text-white border-transparent bg-transparent"}`}
          >
            Critical Only
          </button>
        </div>

        {/* Feed List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex items-center justify-center py-20">
              <EmptyState 
                icon="check"
                title="All caught up"
                description="No active alerts matching your current filter."
              />
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`relative p-5 rounded-none border transition-all ${
                  alert.isRead
                    ? "bg-[#0c0e14]/60 border-white/10 opacity-75"
                    : "bg-[#0f121a]/90 border-emerald-500/30 shadow-lg"
                }`}
              >
                {/* Unread Accent Border */}
                {!alert.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400"></div>
                )}

                <div className="flex justify-between items-start pl-2 gap-4">
                  <div className="flex gap-4 items-start">
                    <div className={`mt-0.5 shrink-0 p-2 border rounded-none flex items-center justify-center ${
                      alert.priority === 'critical' ? 'bg-red-500/15 border-red-500/40 text-red-300' :
                      alert.priority === 'high' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' :
                      'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                    }`}>
                      <PixelIcon name="bell" size={18} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-sm font-bold text-white uppercase tracking-tight">
                          {alert.studentName}
                        </h4>
                        <span className="text-[10px] font-bold bg-white/10 text-emerald-300 border border-white/15 px-2 py-0.5 rounded-none uppercase">
                          {alert.course}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none uppercase border ${
                          alert.priority === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                          alert.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                          'bg-white/5 text-slate-300 border-white/15'
                        }`}>
                          {alert.priority}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mb-2 max-w-2xl font-normal leading-relaxed">
                        {alert.message}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
                        <span>{alert.timestamp}</span>
                        {alert.matricId && <span>ID: {alert.matricId}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {!alert.isRead && (
                      <button
                        onClick={() => markAsRead(alert.id)}
                        className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors px-2.5 py-1 border border-emerald-400/30 bg-emerald-500/10 rounded-none cursor-pointer uppercase"
                      >
                        Mark Read
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