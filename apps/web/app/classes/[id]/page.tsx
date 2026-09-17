// Student Profile and Analytics page within Classes in dottxt.ai sharp dark style
"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
import { api } from "../../../lib/api";
import EmptyState from "../../../components/EmptyState";
import PixelIcon from "../../../components/PixelIcon";

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

export default function ProfilePage() {
  const supabase = createClient();
  const params = useParams();
  const searchParams = useSearchParams();
  const fromClassId = searchParams.get("classId");
  const studentId = (params?.id as string) || "22222222-2222-2222-2222-222222222221";

  const backUrl = fromClassId ? `/classes?classId=${fromClassId}` : "/classes";

  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [className, setClassName] = useState("Physics 101 (Group A)");
  const [enrolledClasses, setEnrolledClasses] = useState<{ class_id: string; class_name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(fromClassId || "");
  const [chartData, setChartData] = useState<any[]>([]);
  const [activitiesList, setActivitiesList] = useState<ActivityItem[]>([]);
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

  useEffect(() => {
    if (!studentId) return;

    const fetchStudentData = async () => {
      setIsLoading(true);
      try {
        try {
          const data = await api.get(`/api/students/${studentId}/analytics${selectedClassId ? `?class_id=${selectedClassId}` : ''}`);
          setStudentProfile(data.profile);
          setAttendanceRate(
            data.enrollment?.attendance_rate !== undefined && data.enrollment?.attendance_rate !== null
              ? Number(data.enrollment.attendance_rate)
              : null
          );
          setLatestScore(
            data.enrollment?.latest_score !== undefined && data.enrollment?.latest_score !== null
              ? Number(data.enrollment.latest_score)
              : null
          );
          setClassName(data.enrollment?.class_name || "PASUM Class");
          setEnrolledClasses(data.enrolled_classes || []);
          setChartData(data.student_history || []);
          setActivitiesList(data.activities || []);
          if (data.enrollment?.class_id && !selectedClassId) {
            setSelectedClassId(data.enrollment.class_id);
          }
          setIsLoading(false);
          return;
        } catch (apiErr) {
          console.warn("FastAPI student analytics error, falling back to direct Supabase query:", apiErr);
        }

        // Direct Supabase query fallback
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .single();

        if (prof) {
          setStudentProfile(prof);
        }

        const { data: enrollments } = await supabase
          .from('enrollments')
          .select(`
            class_id,
            current_attendance_rate,
            classes (
              id,
              group_code,
              subjects (code, name)
            )
          `)
          .eq('student_id', studentId);

        const mappedEnrolled = (enrollments || []).map((e: any) => ({
          class_id: e.class_id,
          class_name: `${e.classes?.subjects?.code || 'SUB'} - ${e.classes?.subjects?.name || 'Class'} (${e.classes?.group_code || 'A'})`
        }));
        setEnrolledClasses(mappedEnrolled);

        const targetClassId = selectedClassId || (enrollments && enrollments.length > 0 && enrollments[0] ? enrollments[0].class_id : "");
        const targetEnrollment: any = (enrollments || []).find((e: any) => e.class_id === targetClassId) || (enrollments || [])[0];

        if (targetEnrollment) {
          setClassName(`${targetEnrollment.classes?.subjects?.code || 'SUB'} - ${targetEnrollment.classes?.subjects?.name || 'Class'} (${targetEnrollment.classes?.group_code || 'A'})`);
          if (!selectedClassId && targetEnrollment.class_id) {
            setSelectedClassId(targetEnrollment.class_id);
          }
        }

        if (targetClassId) {
          // Fetch attendance sessions for class
          const { data: sessions } = await supabase
            .from('attendance_sessions')
            .select('id, created_at')
            .eq('class_id', targetClassId)
            .order('created_at', { ascending: true });

          const sessionIds = (sessions || []).map((s: any) => s.id);
          let realAttendanceRate: number | null = null;
          let attRecords: any[] = [];

          if (sessionIds.length > 0) {
            const { data: records } = await supabase
              .from('attendance_records')
              .select('id, status, session_id, timestamp, created_at')
              .in('session_id', sessionIds)
              .eq('student_id', studentId)
              .order('created_at', { ascending: false });

            attRecords = records || [];
            const attendedCount = attRecords.filter((r: any) => 
              r.status === 'Present' || r.status === 'Late' || r.status === 'Excused'
            ).length;
            realAttendanceRate = Math.round((attendedCount / sessionIds.length) * 100);
          }
          setAttendanceRate(realAttendanceRate);

          // Fetch assessments and scores for class
          const { data: assessList } = await supabase
            .from('assessments')
            .select('id, title, type, weightage, total_marks, created_at')
            .eq('class_id', targetClassId)
            .order('created_at', { ascending: true });

          const assessIds = (assessList || []).map((a: any) => a.id);
          let realLatestScore: number | null = null;
          let studentScoreRecords: any[] = [];

          if (assessIds.length > 0) {
            const { data: scores } = await supabase
              .from('student_scores')
              .select('id, assessment_id, score_achieved, created_at')
              .in('assessment_id', assessIds)
              .eq('student_id', studentId)
              .order('created_at', { ascending: false });

            studentScoreRecords = scores || [];
            if (studentScoreRecords.length > 0) {
              const latest = studentScoreRecords[0];
              const matchingAssess = (assessList || []).find((a: any) => a.id === latest.assessment_id);
              const maxMarks = matchingAssess?.total_marks || 100;
              if (maxMarks > 0 && latest.score_achieved !== null && latest.score_achieved !== undefined) {
                realLatestScore = Math.round((Number(latest.score_achieved) / maxMarks) * 100);
              }
            }
          }
          setLatestScore(realLatestScore);

          // Build performance trajectory if records exist
          if (sessionIds.length === 0 && assessIds.length === 0) {
            setChartData([]);
          } else {
            const trajectoryPoints: any[] = [];
            (assessList || []).forEach((assess: any, idx: number) => {
              const sc = studentScoreRecords.find((s: any) => s.assessment_id === assess.id);
              if (sc && assess.total_marks > 0) {
                const scorePct = Math.round((Number(sc.score_achieved) / assess.total_marks) * 100);
                trajectoryPoints.push({
                  week: assess.title.length > 10 ? `A${idx + 1}` : assess.title,
                  score: scorePct,
                  attendance: realAttendanceRate ?? 0
                });
              }
            });
            setChartData(trajectoryPoints);
          }

          // Build activities list from real logs
          const activities: any[] = [];
          attRecords.slice(0, 5).forEach((rec: any) => {
            activities.push({
              id: `att-${rec.id}`,
              title: `Lecture Attendance: ${rec.status}`,
              description: `Status verified as ${rec.status}`,
              timestamp: rec.timestamp || rec.created_at || "Recent",
              icon: rec.status === "Present" ? "check" : "clock"
            });
          });
          studentScoreRecords.slice(0, 5).forEach((sc: any) => {
            const matchingAssess = (assessList || []).find((a: any) => a.id === sc.assessment_id);
            activities.push({
              id: `score-${sc.id}`,
              title: `Assessment Score Recorded`,
              description: `${matchingAssess?.title || "Assessment"}: ${sc.score_achieved} marks`,
              timestamp: sc.created_at || "Recent",
              icon: "book"
            });
          });
          activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setActivitiesList(activities);
        } else {
          setAttendanceRate(null);
          setLatestScore(null);
          setChartData([]);
          setActivitiesList([]);
        }
      } catch (err) {
        console.error("Failed to load student data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId, selectedClassId]);

  if (isLoading || !studentProfile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent min-h-screen text-xs text-slate-400">
        Loading student details...
      </div>
    );
  }

  let riskStatus: "critical" | "at-risk" | "good" | "no-data" = "no-data";
  if (attendanceRate !== null) {
    if (attendanceRate < 80) riskStatus = "critical";
    else if (attendanceRate < 90) riskStatus = "at-risk";
    else riskStatus = "good";
  }

  return (
    <main className="flex-1 p-8 overflow-y-auto bg-transparent text-white relative">
      {/* Navigation Breadcrumb */}
      <div className="mb-4">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          ← BACK TO CLASS ROSTER
        </Link>
      </div>

      {/* Header Profile Card */}
      <header className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-none flex items-center justify-center text-white text-2xl font-bold">
            {studentProfile.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white uppercase">{studentProfile.full_name}</h2>
              {riskStatus === "critical" && (
                <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-300 border border-rose-400/30 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase">
                  <PixelIcon name="warning" size={12} /> CRITICAL
                </span>
              )}
              {riskStatus === "at-risk" && (
                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase">
                  <PixelIcon name="warning" size={12} /> AT RISK
                </span>
              )}
              {riskStatus === "good" && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase">
                  <PixelIcon name="check" size={12} /> ON TRACK
                </span>
              )}
              {riskStatus === "no-data" && (
                <span className="inline-flex items-center gap-1 bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase">
                  NO DATA
                </span>
              )}
            </div>
            
            {/* Class Switcher & Metadata */}
            <div className="flex flex-wrap items-center mt-1 text-slate-400 text-xs gap-3">
              <span>MATRIC: {studentProfile.institutional_id}</span>
              {studentProfile.phone_number && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <PixelIcon name="phone" size={12} className="text-slate-500" />
                    {studentProfile.phone_number}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="text-slate-500">CLASS:</span>
              {enrolledClasses.length > 0 ? (
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-black/30 border border-white/20 text-white text-xs px-2 py-0.5 rounded-none focus:outline-none focus:border-white/40 cursor-pointer"
                >
                  {enrolledClasses.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id} className="bg-[#08090c]">
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-white">{className}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full md:w-auto text-xs">
          <a 
            href={studentProfile.email ? `mailto:${studentProfile.email}` : "#"}
            onClick={(e) => {
              if (!studentProfile.email) {
                e.preventDefault();
                alert("No email address registered for this student.");
              }
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-transparent border border-white/20 text-slate-300 px-4 py-2 rounded-none hover:bg-white/10 transition-colors"
          >
            <PixelIcon name="mail" size={14} /> EMAIL STUDENT
          </a>
          <div className="relative group/disabled flex-1 md:flex-none cursor-not-allowed" title="Disabled Feature">
            <div className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-500 px-4 py-2 rounded-none opacity-50 grayscale pointer-events-none">
              <PixelIcon name="calendar" size={14} /> INTERVENTION
            </div>
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/disabled:flex items-center px-2.5 py-1 text-[10px] font-semibold text-white bg-black/90 border border-white/20 rounded-none shadow-lg whitespace-nowrap z-50">
              Disabled Feature
            </div>
          </div>
        </div>
      </header>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metrics & Performance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core Metrics (3 Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
              <div className="mb-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Attendance</p>
              </div>
              <p className={`text-3xl font-bold mt-1 ${
                attendanceRate === null ? 'text-slate-500' :
                attendanceRate < 80 ? 'text-rose-400' :
                attendanceRate < 90 ? 'text-amber-400' :
                'text-emerald-400'
              }`}>
                {attendanceRate !== null ? `${Math.round(attendanceRate)}%` : '—'}
              </p>
            </div>
            
            <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
              <div className="mb-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Latest Score</p>
              </div>
              <p className={`text-3xl font-bold mt-1 ${latestScore !== null ? 'text-white' : 'text-slate-500'}`}>
                {latestScore !== null ? `${Math.round(latestScore)}%` : '—'}
              </p>
            </div>
            
            <div className="bg-[#08090c]/80 p-5 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
              <div className="mb-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Risk Level</p>
              </div>
              <p className={`text-xl font-bold uppercase mt-2 ${riskStatus === 'no-data' ? 'text-slate-500' : 'text-white'}`}>
                {riskStatus === "critical" ? "Critical Risk" : riskStatus === "at-risk" ? "Moderate" : riskStatus === "good" ? "On Track" : "No Data"}
              </p>
            </div>
          </div>

          {/* Historical Performance Chart */}
          <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PixelIcon name="chart" size={18} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Performance Trajectory
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">TREND</span>
            </div>
            <div className="h-72 w-full text-xs">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                    <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} fontFamily="var(--font-space-grotesk), sans-serif" />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} fontFamily="var(--font-space-grotesk), sans-serif" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#08090c',
                        borderColor: '#ffffff30',
                        borderRadius: 0,
                        fontFamily: 'var(--font-space-grotesk), sans-serif',
                        fontSize: '11px',
                        color: '#fff'
                      }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#60a5fa" strokeWidth={2} name="Score %" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="attendance" stroke="#f43f5e" strokeWidth={2} name="Attendance %" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <PixelIcon name="chart" size={32} className="text-slate-600" />
                  <p className="font-bold">No performance trajectory data available</p>
                  <p className="text-[10px] text-slate-500">Attendance sessions and assessment scores will appear here once recorded.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="space-y-6">
          <div className="bg-[#08090c]/80 p-6 rounded-none border border-white/15 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <PixelIcon name="clock" size={18} className="text-blue-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Recent Activity
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">LOGS</span>
            </div>
            
            {activitiesList.length > 0 ? (
              <div className="space-y-4 text-xs">
                {activitiesList.map((activity) => (
                  <div key={activity.id} className="p-3 bg-black/20 border border-white/10 rounded-none">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white text-xs">{activity.title}</div>
                      <time className="text-[10px] text-slate-400">{formatActivityTime(activity.timestamp)}</time>
                    </div>
                    <div className="text-slate-400 text-[11px]">{activity.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8">
                <EmptyState 
                  icon="clock"
                  title="No Recent Activity"
                  description="No recent activity logged for this student."
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}