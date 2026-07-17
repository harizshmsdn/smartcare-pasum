// apps/web/app/student/alerts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  BellRing, 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  CheckCircle2
} from "lucide-react";
import { createClient } from "../../../utils/supabase/client";

interface AlertItem {
  id: string;
  type: string;
  priority: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  course: string;
}

export default function StudentAlertsPage() {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState("");

  const fetchAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setStudentId(user.id);

      const { data } = await supabase
        .from('alerts')
        .select(`
          id,
          type,
          priority,
          message,
          is_read,
          created_at,
          classes (
            subjects (
              name
            )
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        const formatted: AlertItem[] = data.map((item: any) => {
          const classNode = item.classes;
          const subjectName = classNode?.subjects?.name || "General";
          
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
      console.error("Error loading student alerts:", err);
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
    if (!studentId) return;
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('student_id', studentId);

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
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading notifications...</div>;
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
          <p className="text-slate-500 mt-1">Real-time alerts, risk updates, and merit request statuses</p>
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
            All Notifications
          </button>
          <button 
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border-none cursor-pointer ${filter === "unread" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 bg-transparent"}`}
          >
            Unread
          </button>
          <button 
            onClick={() => setFilter("critical")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border-none cursor-pointer ${filter === "critical" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 bg-transparent"}`}
          >
            Critical
          </button>
        </div>

        {/* Scrollable Alerts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((item) => (
              <div 
                key={item.id} 
                className={`p-6 flex items-start justify-between hover:bg-slate-50/50 transition-colors gap-6 ${!item.isRead ? 'bg-blue-50/10' : ''}`}
              >
                <div className="flex gap-4">
                  {/* Priority Icon Badge */}
                  <div className={`p-3 rounded-2xl shrink-0 mt-1 ${
                    item.priority === 'critical' ? 'bg-red-50 text-red-650' : 
                    item.priority === 'high' ? 'bg-orange-50 text-orange-650' : 
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {item.type === 'attendance' ? <TrendingDown size={20} /> :
                     item.type === 'merit' ? <CheckCircle2 size={20} /> :
                     <AlertTriangle size={20} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-base">{item.course}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        item.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-650'
                      }`}>
                        {item.priority}
                      </span>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      )}
                    </div>
                    <p className="text-slate-655 text-sm leading-relaxed max-w-2xl">{item.message}</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3 font-medium">
                      <Clock size={12} />
                      {item.timestamp}
                    </div>
                  </div>
                </div>

                {/* Mark as Read Button */}
                {!item.isRead && (
                  <button 
                    onClick={() => markAsRead(item.id)}
                    className="flex items-center justify-center bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-500 border border-slate-200 p-2.5 rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                    title="Mark as Read"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-slate-50 p-4 rounded-full text-slate-300 mb-4">
                <BellRing size={36} />
              </div>
              <h4 className="font-bold text-slate-900 text-lg">Your inbox is clear</h4>
              <p className="text-slate-400 text-sm mt-1">No alerts or notifications at this time.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
