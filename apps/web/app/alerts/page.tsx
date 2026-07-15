// apps/web/app/alerts/page.tsx
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
import { createClient } from "../../utils/supabase/client";

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
  const [lecturerId, setLecturerId] = useState("");

  const fetchAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setLecturerId(user.id);

      const { data } = await supabase
        .from('alerts')
        .select(`
          id,
          type,
          priority,
          message,
          is_read,
          created_at,
          student:profiles!student_id (
            id,
            institutional_id,
            full_name
          ),
          classes (
            subjects (
              name
            )
          )
        `)
        .eq('lecturer_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formatted: AlertItem[] = data.map((item: any) => {
          const studentNode = item.student;
          const classNode = item.classes;
          const subjectName = classNode?.subjects?.name || "General";
          
          // Calculate human readable timestamp
          const diffMs = Date.now() - new Date(item.created_at).getTime();
          const diffMin = Math.floor(diffMs / 60000);
          const diffHr = Math.floor(diffMin / 60);
          const diffDay = Math.floor(diffHr / 24);

          let timestamp = "Just now";
          if (diffDay > 0) {
            timestamp = `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
          } else if (diffHr > 0) {
            timestamp = `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
          } else if (diffMin > 0) {
            timestamp = `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
          }

          return {
            id: item.id,
            studentName: studentNode?.full_name || "Unknown Student",
            matricId: studentNode?.institutional_id || "Unknown",
            studentUuid: studentNode?.id || "",
            course: subjectName,
            type: item.type || "system",
            priority: item.priority || "medium",
            message: item.message || "",
            timestamp,
            isRead: !!item.is_read
          };
        });
        setAlerts(formatted);
      }
    } catch (err) {
      console.error("Error loading alerts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        console.error("Failed to mark alert as read:", error);
        return;
      }

      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!lecturerId) return;
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('lecturer_id', lecturerId);

      if (error) {
        console.error("Failed to mark all alerts as read:", error);
        return;
      }

      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === "unread") return !a.isRead;
    if (filter === "critical") return a.priority === "critical";
    return true;
  });

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading alerts...</div>;
  }

  return (
    <main className="flex-1 p-8 h-screen flex flex-col bg-[#FAF9F6] overflow-hidden">
      
      {/* Header */}
      <header className="shrink-0 mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900 flex items-center gap-3">
            Global Alerts Inbox
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse">
                {unreadCount} New
              </span>
            )}
          </h2>
          <p className="text-slate-500 mt-1">Real-time notifications from the n8n automation engine</p>
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
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <CheckCircle2 size={48} className="mb-4 text-emerald-400 opacity-50" />
              <p className="text-lg font-medium">You&apos;re all caught up!</p>
              <p className="text-sm">No new alerts matching this filter.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`relative p-5 rounded-2xl border transition-all ${
                  alert.isRead 
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
                    <div className={`mt-1 shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      alert.priority === 'critical' ? 'bg-red-100 text-red-600' :
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
                          {alert.studentName}
                        </h4>
                        <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                          {alert.course}
                        </span>
                      </div>
                      
                      <p className={`text-sm mb-3 max-w-2xl ${alert.isRead ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={14} /> {alert.timestamp}</span>
                        <span>ID: {alert.matricId}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2">
                    {alert.studentUuid && (
                      <Link href={`/classes/${alert.studentUuid}`} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                        Review Case <ArrowRight size={14} />
                      </Link>
                    )}
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