// apps/web/app/alerts/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  BellRing, 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  CheckCircle2,
  Filter,
  ArrowRight
} from "lucide-react";

// Mock Data: n8n Automation Engine Triggers
const initialAlerts = [
  {
    id: "ALRT-001",
    studentName: "Ahmad Hakimi bin Faisal",
    matricId: "1720441",
    course: "Physics 101",
    type: "attendance",
    priority: "critical",
    message: "Attendance dropped below the 80% threshold (Current: 75%). Immediate intervention recommended.",
    timestamp: "10 mins ago",
    isRead: false,
  },
  {
    id: "ALRT-002",
    studentName: "Muhammad Danial bin Zulkifli",
    matricId: "1720451",
    course: "Computer Science 101",
    type: "assessment",
    priority: "high",
    message: "Sudden continuous assessment drop detected. Quiz 2 score is 25% lower than Quiz 1.",
    timestamp: "2 hours ago",
    isRead: false,
  },
  {
    id: "ALRT-003",
    studentName: "Jason Lee Wei Min",
    matricId: "1720445",
    course: "Physics 101",
    type: "system",
    priority: "medium",
    message: "GPS Verification failed during the last 2 check-ins. Device diagnostic suggested.",
    timestamp: "1 day ago",
    isRead: true,
  },
  {
    id: "ALRT-004",
    studentName: "Chong Wei Jie",
    matricId: "1720462",
    course: "Mathematics 201",
    type: "attendance",
    priority: "high",
    message: "Consecutive absences flagged. Missed 3 classes in a row.",
    timestamp: "2 days ago",
    isRead: true,
  }
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState("all");

  const unreadCount = alerts.filter(a => !a.isRead).length;

  const markAsRead = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map(a => ({ ...a, isRead: true })));
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === "unread") return !a.isRead;
    if (filter === "critical") return a.priority === "critical";
    return true;
  });

  return (
    <main className="flex-1 p-8 h-screen flex flex-col bg-transparent overflow-hidden">
      
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
          <button 
            onClick={markAllAsRead}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-4 py-2"
          >
            Mark all as read
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors">
            <Filter size={18} /> Filter
          </button>
        </div>
      </header>

      {/* Main Inbox Container */}
      <div className="flex-1 min-h-0 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* Inbox Tabs */}
        <div className="flex border-b border-slate-100 p-4 gap-2 shrink-0">
          <button 
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === "all" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            All Alerts
          </button>
          <button 
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === "unread" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
          >
            Unread
          </button>
          <button 
            onClick={() => setFilter("critical")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${filter === "critical" ? "bg-red-50 text-red-700 border border-red-100" : "text-slate-500 hover:bg-slate-100 border border-transparent"}`}
          >
            Critical Only
          </button>
        </div>

        {/* Feed List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <CheckCircle2 size={48} className="mb-4 text-emerald-400 opacity-50" />
              <p className="text-lg font-medium">You're all caught up!</p>
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
                    <Link href={`/classes/${alert.matricId}`} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                      Review Case <ArrowRight size={14} />
                    </Link>
                    {!alert.isRead && (
                      <button 
                        onClick={() => markAsRead(alert.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors px-2 py-1"
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