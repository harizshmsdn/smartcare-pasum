// apps/web/app/classes/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Mail,
  CalendarDays,
  AlertTriangle,
  TrendingDown,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Award,
  History,
  X
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export default function ProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const fromClassId = searchParams.get("classId");
  const studentId = (params?.id as string) || "22222222-2222-2222-2222-222222222221";

  const backUrl = fromClassId ? `/classes?classId=${fromClassId}` : "/classes";

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [attendanceRate, setAttendanceRate] = useState(100);
  const [className, setClassName] = useState("Physics 101 (Group A)");
  const [enrolledClasses, setEnrolledClasses] = useState<{ class_id: string; class_name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(fromClassId || "");
  const [meritCount, setMeritCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [meritHistory, setMeritHistory] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [activitiesList, setActivitiesList] = useState<ActivityItem[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Time formatter helper
  const formatActivityTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHrs === 0) {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          return diffMins <= 1 ? "Just now" : `${diffMins}m ago`;
        }
        return `${diffHrs}h ago`;
      }
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) {
        return date.toLocaleDateString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
      }
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return "Recent";
    }
  };

  // Icon renderer helpers
  const renderActivityIcon = (iconName: string) => {
    switch (iconName) {
      case "check_circle":
        return <CheckCircle2 size={16} />;
      case "clock":
        return <Clock size={16} />;
      case "award":
        return <Award size={16} />;
      case "alert_triangle":
        return <AlertTriangle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const renderActivityIconBg = (iconName: string): string => {
    switch (iconName) {
      case "check_circle":
        return "bg-emerald-100 text-emerald-600";
      case "clock":
        return "bg-slate-100 text-slate-500";
      case "award":
        return "bg-blue-100 text-blue-600";
      case "alert_triangle":
        return "bg-red-100 text-red-600";
      default:
        return "bg-slate-100 text-slate-500";
    }
  };

  useEffect(() => {
    if (!studentId) return;

    const fetchStudentData = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch(`http://localhost:8000/api/students/${studentId}/analytics${selectedClassId ? `?class_id=${selectedClassId}` : ''}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setStudentProfile(data.profile);
          setAttendanceRate(data.enrollment?.attendance_rate || 85);
          setClassName(data.enrollment?.class_name || "PASUM Class");
          setMeritCount(data.merit_summary?.pending_count || 0);
          setMeritHistory(data.merit_summary?.approved_history || []);
          setEnrolledClasses(data.enrolled_classes || []);
          setChartData(data.student_history || []);
          setActivitiesList(data.activities || []);
          if (data.enrollment?.class_id && !selectedClassId) {
            setSelectedClassId(data.enrollment.class_id);
          }
        } else {
          await fetchFallbackStudentData();
        }
      } catch (err) {
        console.warn("FastAPI offline, using Supabase direct student data:", err);
        await fetchFallbackStudentData();
      } finally {
        setIsLoading(false);
      }
    };

    const fetchFallbackStudentData = async () => {
      // 1. Fetch Student Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single();
      setStudentProfile(profile);

      // 2. Fetch all enrolled classes
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          current_attendance_rate,
          class_id,
          classes (
            id,
            group_code,
            subjects (
              code,
              name
            )
          )
        `)
        .eq('student_id', studentId);

      const parsedClasses = (enrollments || []).map((e: any) => {
        const classNode = e.classes as any;
        return {
          class_id: e.class_id,
          class_name: classNode && classNode.subjects ? `${classNode.subjects.code} (${classNode.group_code})` : "General Class"
        };
      });
      setEnrolledClasses(parsedClasses);

      // Resolve which class_id we are filtering on
      const activeClassId = selectedClassId || (parsedClasses[0]?.class_id || "");
      if (activeClassId && !selectedClassId) {
        setSelectedClassId(activeClassId);
      }

      // Fetch details for target active class
      const targetEnrollment = (enrollments || []).find((e: any) => e.class_id === activeClassId) || enrollments?.[0];
      const attRate = targetEnrollment ? Number(targetEnrollment.current_attendance_rate || 85) : 85;
      setAttendanceRate(attRate);
      
      if (targetEnrollment) {
        const classNode = targetEnrollment.classes as any;
        if (classNode && classNode.subjects) {
          setClassName(`${classNode.subjects.code} (${classNode.group_code})`);
        }
      }

      // 3. Fetch count of pending merit claims
      const { count } = await supabase
        .from('merit_claims')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'pending');
      setMeritCount(count || 0);

      // 4. Fetch approved merits for History
      const { data: merits } = await supabase
        .from('merit_claims')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'approved');
      setMeritHistory(merits || []);

      // 5. Generate Fallback historical trajectory
      const testHistory = [
        { week: "Week 1", score: 85, attendance: 100 },
        { week: "Week 2", score: 82, attendance: 100 },
        { week: "Week 3", score: 78, attendance: Math.min(100, attRate + 15) },
        { week: "Week 4", score: 65, attendance: Math.min(100, attRate + 8) },
        { week: "Week 5", score: attRate < 80 ? 45 : 78, attendance: attRate },
      ];
      setChartData(testHistory);

      // 6. Fetch activities fallback direct query
      const { data: fallbackAtt } = await supabase
        .from('attendance_records')
        .select(`
          timestamp,
          status,
          session_id,
          attendance_sessions (
            classes (
              group_code,
              subjects (
                code
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .order('timestamp', { ascending: false })
        .limit(3);

      const { data: fallbackMerits } = await supabase
        .from('merit_claims')
        .select('title, status, submitted_at, awarded_points')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false })
        .limit(3);

      const { data: fallbackInt } = await supabase
        .from('interventions')
        .select('issue_description, status, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(3);

      const parsedActivities: ActivityItem[] = [];
      
      (fallbackAtt || []).forEach((r: any) => {
        const session = r.attendance_sessions as any;
        const cls = session?.classes as any;
        const subj = cls?.subjects?.code ? `${cls.subjects.code} (${cls.group_code})` : "Class";
        const isPresent = r.status === "present" || r.status === "late";
        parsedActivities.push({
          id: `att-${r.timestamp}`,
          title: isPresent ? "Attendance Logged" : "Missed Class",
          description: isPresent ? `Checked in for ${subj} session` : `Absent from ${subj} session`,
          timestamp: r.timestamp,
          icon: isPresent ? "check_circle" : "clock"
        });
      });

      (fallbackMerits || []).forEach((m: any) => {
        parsedActivities.push({
          id: `merit-${m.submitted_at}`,
          title: m.status === "approved" ? "Merit Approved" : m.status === "rejected" ? "Merit Claim Rejected" : "Merit Submitted",
          description: m.status === "approved" ? `Awarded ${m.awarded_points} pts for: ${m.title}` : m.status === "rejected" ? `Rejected: ${m.title}` : `Pending verification: ${m.title}`,
          timestamp: m.submitted_at,
          icon: "award"
        });
      });

      (fallbackInt || []).forEach((i: any) => {
        parsedActivities.push({
          id: `int-${i.created_at}`,
          title: "Intervention Case",
          description: `Status: ${String(i.status).replace("_", " ").toUpperCase()} - ${i.issue_description}`,
          timestamp: i.created_at,
          icon: "alert_triangle"
        });
      });

      parsedActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivitiesList(parsedActivities.slice(0, 5));
    };

    fetchStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, selectedClassId]);

  if (isLoading || !studentProfile) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading student details...</div>;
  }

  // Derive risk values
  let riskStatus = "good";
  if (attendanceRate < 80) riskStatus = "critical";
  else if (attendanceRate < 90) riskStatus = "at-risk";

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-transparent relative">

      {/* Navigation Breadcrumb (Preserves Selected Class Page) */}
      <div className="mb-4">
        <Link href={backUrl} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={16} /> Back to Class Roster
        </Link>
      </div>

      {/* Header Profile Card */}
      <header className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        
        <div className="flex items-center gap-5 z-10">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-700 text-3xl font-bold shadow-inner">
            {studentProfile.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-slate-900">{studentProfile.full_name}</h2>
              {riskStatus === "critical" && (
                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle size={14} /> Critical Risk
                </span>
              )}
              {riskStatus === "at-risk" && (
                <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                  <TrendingDown size={14} /> At Risk
                </span>
              )}
              {riskStatus === "good" && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 size={14} /> On Track
                </span>
              )}
            </div>
            
            {/* Dynamic Class Switcher */}
            <div className="flex flex-wrap items-center mt-1 text-slate-500 font-medium text-sm" style={{ gap: '1px 10px' }}>
              <span>Matric: {studentProfile.institutional_id}</span>
              <span>•</span>
              <span className="text-slate-400">Class Focus:</span>
              {enrolledClasses.length > 0 ? (
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
                >
                  {enrolledClasses.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{className}</span>
              )}
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 z-10 w-full md:w-auto">
          <a 
            href={studentProfile.email ? `mailto:${studentProfile.email}` : "#"}
            onClick={(e) => {
              if (!studentProfile.email) {
                e.preventDefault();
                alert("No email address registered for this student.");
              }
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium shadow-sm hover:bg-slate-50 transition-colors no-underline"
          >
            <Mail size={18} /> Email Student
          </a>
          <Link 
            href={`/interventions?studentId=${studentId}&classId=${selectedClassId}`}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-colors no-underline"
          >
            <CalendarDays size={18} /> Setup Intervention
          </Link>
        </div>
      </header>

      {/* --- MERIT SECTION --- */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
            <Award size={36} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-slate-500 uppercase">
              Accumulated Merits
            </h2>
            <div className="text-4xl font-extrabold text-slate-900 mt-1">
              {studentProfile.total_merit_score || 0}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/classes/${studentId}/merit-requests`}
            className="flex items-center gap-2 px-5 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow active:scale-95 font-sans"
          >
            <Award size={20} />
            <span>Merit Requests</span>
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-sm">
              {meritCount}
            </span>
          </Link>
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow active:scale-95 cursor-pointer font-sans"
          >
            <History size={20} />
            View Merit History
          </button>
        </div>
      </section>
      {/* --- END MERIT SECTION --- */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Metrics & Performance */}
        <div className="lg:col-span-2 space-y-8">

          {/* Core Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-1">Current Attendance</p>
              <div className="flex items-end gap-2">
                <p className={`text-3xl font-bold ${attendanceRate < 80 ? 'text-red-600' : attendanceRate < 90 ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {attendanceRate}%
                </p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-1">Latest Assessment</p>
              <div className="flex items-end gap-2">
                <p className={`text-3xl font-bold ${attendanceRate < 80 ? 'text-red-600' : 'text-slate-900'}`}>
                  {attendanceRate < 80 ? '45%' : '88%'}
                </p>
                <p className="text-sm text-slate-400 font-medium mb-1">Overall</p>
              </div>
            </div>
            
            {/* Color-Coded Risk Assessment Card */}
            <div className={`p-5 rounded-2xl border shadow-sm transition-all ${riskStatus === "critical"
              ? "bg-red-50/90 border-red-200 text-red-900"
              : riskStatus === "at-risk"
                ? "bg-amber-50/90 border-amber-200 text-amber-900"
                : "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              }`}>
              <p className="text-sm font-semibold mb-1 opacity-80">Risk Assessment</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-2xl font-extrabold uppercase tracking-wide">
                  {riskStatus === "critical" ? "Critical Risk" : riskStatus === "at-risk" ? "Moderate Risk" : "Low Risk"}
                </p>
                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md border ${riskStatus === "critical"
                  ? "bg-red-100 text-red-800 border-red-300 animate-pulse"
                  : riskStatus === "at-risk"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border-emerald-300"
                  }`}>
                  {riskStatus === "critical" ? "Action Required" : riskStatus === "at-risk" ? "Watch" : "On Track"}
                </span>
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
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
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
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No chart data available for this class.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Recent Activity</h3>
            
            {activitiesList.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {activitiesList.map((activity) => (
                  <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow flex-col absolute left-0 md:left-1/2 -translate-x-1/2 ${renderActivityIconBg(activity.icon)}`}>
                      {renderActivityIcon(activity.icon)}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-12 md:ml-0 p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-slate-900 text-sm">{activity.title}</div>
                        <time className="font-medium text-xs text-slate-500">{formatActivityTime(activity.timestamp)}</time>
                      </div>
                      <div className="text-slate-500 text-xs">{activity.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-sm">
                No recent activity logged for this student.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Merit History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Award className="text-blue-600" size={24} />
                Merit History
              </h3>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {meritHistory.length > 0 ? (
                <ul className="space-y-4">
                  {meritHistory.map((item, index) => (
                    <li key={index} className="flex justify-between items-center pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                      <div>
                        <p className="font-semibold text-slate-800">{item.title}</p>
                        <p className="text-sm text-slate-500">Submitted at {new Date(item.submitted_at).toLocaleDateString()}</p>
                      </div>
                      <span className="font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">+{item.awarded_points || item.points || 10}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-center py-4">No verified merits in history.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}