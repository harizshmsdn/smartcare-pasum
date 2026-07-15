// apps/web/app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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



export default function ProfilePage() {
  const params = useParams();
  const studentId = (params?.id as string) || "22222222-2222-2222-2222-222222222221";

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [attendanceRate, setAttendanceRate] = useState(100);
  const [className, setClassName] = useState("Physics 101 (Group A)");
  const [meritCount, setMeritCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [meritHistory, setMeritHistory] = useState<any[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;

    const fetchStudentData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Student Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .single();
        setStudentProfile(profile);

        // 2. Fetch Enrollment rate
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select(`
            current_attendance_rate,
            classes (
              group_code,
              subjects (
                code,
                name
              )
            )
          `)
          .eq('student_id', studentId)
          .limit(1)
          .maybeSingle();

        if (enrollment) {
          setAttendanceRate(Number(enrollment.current_attendance_rate));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const classNode = enrollment.classes as any;
          if (classNode) {
            setClassName(`${classNode.subjects?.code} (${classNode.group_code})`);
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

      } catch (err) {
        console.error("Error fetching student profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  if (isLoading || !studentProfile) {
    return <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">Loading student details...</div>;
  }

  // Derive risk values
  let riskStatus = "good";
  if (attendanceRate < 80) riskStatus = "critical";
  else if (attendanceRate < 90) riskStatus = "at-risk";

  const studentHistory = [
    { week: "Week 1", score: 85, attendance: 100 },
    { week: "Week 2", score: 82, attendance: 100 },
    { week: "Week 3", score: 78, attendance: Math.min(100, attendanceRate + 15) },
    { week: "Week 4", score: 65, attendance: Math.min(100, attendanceRate + 8) },
    { week: "Week 5", score: attendanceRate < 80 ? 45 : 78, attendance: attendanceRate },
  ];

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-slate-50 relative">

      {/* Navigation Breadcrumb */}
      <div className="mb-6">
        <Link href="/classes" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
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
            <p className="text-slate-500 font-medium">Matric: {studentProfile.institutional_id} • {className}</p>
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
            Merit Requests ({meritCount})
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

        {/* Left Column: Metrics & AI Insights (Takes up 2 columns on large screens) */}
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500 mb-1">Risk Assessment</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold uppercase text-slate-900">{riskStatus}</p>
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

      {/* Merit History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

            {/* Modal Header */}
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

            {/* Modal Body / History List */}
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