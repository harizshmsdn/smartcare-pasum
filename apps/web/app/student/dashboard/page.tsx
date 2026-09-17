// apps/web/app/student/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PixelIcon } from "../../../components/PixelIcon";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { createClient } from "../../../utils/supabase/client";
import { api } from "../../../lib/api";

interface AttendanceItem {
  subject: string;
  attendance: number;
}

interface ExamItem {
  subject: string;
  midterm: number;
  finals: number;
}

interface RankedSubject {
  subject: string;
  score: number;
  grade: string;
}

export default function StudentDashboardPage() {
  const supabase = createClient();
  const [totalMerits, setTotalMerits] = useState(0);
  const [activeSubject, setActiveSubject] = useState<string>("");
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [subjectTimelines, setSubjectTimelines] = useState<Record<string, any[]>>({});

  // New CA State
  const [caActiveSubject, setCaActiveSubject] = useState<string>("");
  const [caPerformanceData, setCaPerformanceData] = useState<Record<string, any[]>>({});

  const [classAttendance, setClassAttendance] = useState<AttendanceItem[]>([]);
  const [examPerformance, setExamPerformance] = useState<ExamItem[]>([]);
  const [rankedSubjects, setRankedSubjects] = useState<RankedSubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStudentAnalytics = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        try {
          const apiData = await api.get("/api/student/dashboard");
          setTotalMerits(apiData.total_merits || 0);
          setSubjectsList(apiData.subjects_list || []);
          if (apiData.subjects_list && apiData.subjects_list.length > 0) {
            setActiveSubject(apiData.subjects_list[0]);
            setCaActiveSubject(apiData.subjects_list[0]);
          }
          setClassAttendance(apiData.class_attendance || []);
          setSubjectTimelines(apiData.subject_timelines || {});
          setCaPerformanceData(apiData.ca_performance_data || {});
          setExamPerformance(apiData.exam_performance || []);
          setRankedSubjects(apiData.ranked_subjects || []);
          setIsLoading(false);
          return;
        } catch (apiErr) {
          console.warn("FastAPI endpoint error, falling back to direct Supabase query:", apiErr);
        }

        // Direct Supabase query fallback
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Profile for Total Merits
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_merit_score')
          .eq('id', user.id)
          .single();
        if (profile) {
          setTotalMerits(Number(profile.total_merit_score || 0));
        }

        // 2. Fetch Enrollments & Attendance
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select(`
            current_attendance_rate,
            classes (
              id,
              group_code,
              subjects (
                code,
                name
              )
            )
          `)
          .eq('student_id', user.id);

        if (enrollments && enrollments.length > 0) {
          const subjects = enrollments.map((e: any) => e.classes?.subjects?.code || "Class");
          setSubjectsList(subjects);
          setActiveSubject(subjects[0] || "");
          setCaActiveSubject(subjects[0] || "");

          const attendanceList = enrollments.map((e: any) => ({
            subject: e.classes?.subjects?.code || "Class",
            attendance: Math.round(Number(e.current_attendance_rate || 0))
          }));
          setClassAttendance(attendanceList);

          const timelines: Record<string, any[]> = {};
          const caData: Record<string, any[]> = {};

          enrollments.forEach((e: any) => {
            const code = e.classes?.subjects?.code || "Class";
            timelines[code] = [];
            caData[code] = [];
          });

          setSubjectTimelines(timelines);
          setCaPerformanceData(caData);
          setExamPerformance([]);
          setRankedSubjects([]);
        }
      } catch (err) {
        console.error("Error loading student dashboard analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudentAnalytics();
  }, [supabase]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent text-white/70 text-sm">
        <span className="animate-pulse">Loading student dashboard...</span>
      </div>
    );
  }

  return (
    <main className="flex-1 h-screen flex flex-col p-6 lg:p-8 bg-transparent overflow-hidden text-white">
      {/* Header */}
      <header className="shrink-0 mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">Academic Overview</h2>
          <p className="text-xs lg:text-sm text-white/60 mt-0.5">Track your progress, accumulated merits, and exam performance</p>
        </div>
        <div className="flex items-center gap-2 border border-white/15 bg-white/5 text-emerald-300 px-3.5 py-1.5 text-xs tracking-wider uppercase rounded-none">
          <PixelIcon name="graduation" size={16} />
          Semester 1 • 2025/2026
        </div>
      </header>

      {/* Bento Grid (04 Products Style) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 lg:gap-5 min-h-0 pb-2">
        {/* Trajectory line chart */}
        <div className="md:col-span-2 border border-white/15 bg-[#08090c]/80 backdrop-blur-md rounded-none shadow-xl flex flex-col min-h-0 relative">
          <div className="shrink-0 border-b border-white/10 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/90">ATTENDANCE VS. ASSESSMENT TRAJECTORY</span>
            </div>

            {/* Subject Tabs */}
            {subjectsList.length > 0 && (
              <div className="flex items-center gap-1 border border-white/10 p-0.5 bg-black/40">
                {subjectsList.map((code) => (
                  <button
                    key={code}
                    onClick={() => setActiveSubject(code)}
                    className={`px-2.5 py-1 text-[11px] uppercase transition-colors rounded-none ${
                      activeSubject === code
                        ? "bg-white text-black font-bold"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden p-4">
            {activeSubject && subjectTimelines[activeSubject] && subjectTimelines[activeSubject].length > 0 ? (
              <div
                style={{
                  width: subjectTimelines[activeSubject].length > 7 ? `${subjectTimelines[activeSubject].length * 85}px` : "100%",
                  minWidth: "100%",
                  height: "100%"
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={subjectTimelines[activeSubject]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                    <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#08090c',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: 0,
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    />
                    <Legend verticalAlign="top" height={32} iconType="rect" wrapperStyle={{ fontSize: '11px' }} />
                    <Line connectNulls type="monotone" dataKey="attendance" name="My Attendance %" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: '#34d399' }} activeDot={{ r: 5 }} />
                    <Line connectNulls type="monotone" dataKey="assessment" name="My Assessment %" stroke="#f87171" strokeWidth={2} dot={{ r: 3, fill: '#f87171' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/40">
                <PixelIcon name="trendingUp" size={36} className="text-white/20 mb-2" />
                <p className="text-xs uppercase tracking-wider text-white/70">No Trajectory Data Available</p>
                <p className="text-[11px] text-white/40 mt-1 text-center">Trends will populate once attendance and assessment records are logged.</p>
              </div>
            )}
          </div>
        </div>

        {/* Total Merits Card */}
        <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md rounded-none shadow-xl p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="shrink-0 border-b border-white/10 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/90">ACCUMULATED MERITS</span>
            </div>
            <PixelIcon name="award" size={18} className="text-amber-400" />
          </div>

          <div className="flex-1 flex flex-col justify-center items-center py-4">
            <div className="border border-white/15 bg-black/40 p-6 w-full text-center flex flex-col justify-center items-center">
              <span className="text-xs uppercase tracking-widest text-white/60">Total Merit Score</span>
              <span className="font-black text-white mt-3 leading-none text-6xl">{totalMerits}</span>
              <div className="flex items-center gap-2 text-[11px] text-emerald-400 mt-4 uppercase">
                <PixelIcon name="check" size={14} className="text-emerald-400" />
                Points Verified & Active
              </div>
            </div>
          </div>

          <div className="relative group/disabled w-full cursor-not-allowed" title="Disabled Feature">
            <div className="w-full border border-white/10 bg-white/5 text-white/40 py-2.5 text-xs uppercase tracking-wider flex items-center justify-center gap-2 pointer-events-none select-none rounded-none">
              Claim Merit Points [ DISABLED ]
            </div>
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/disabled:flex items-center px-2.5 py-1 text-[11px] text-white bg-black border border-white/20 whitespace-nowrap z-50">
              Disabled Feature
            </div>
          </div>
        </div>

        {/* CA Performance Chart */}
        <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md rounded-none shadow-xl flex flex-col min-h-0">
          <div className="shrink-0 border-b border-white/10 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/90">CONTINUOUS ASSESSMENT</span>
            </div>

            {/* Subject Tabs */}
            {subjectsList.length > 0 && (
              <div className="flex items-center gap-1 border border-white/10 p-0.5 bg-black/40">
                {subjectsList.map((code) => (
                  <button
                    key={code}
                    onClick={() => setCaActiveSubject(code)}
                    className={`px-2 py-0.5 text-[10px] uppercase transition-colors rounded-none ${
                      caActiveSubject === code
                        ? "bg-white text-black font-bold"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden p-4">
            {caActiveSubject && caPerformanceData[caActiveSubject] && caPerformanceData[caActiveSubject].length > 0 ? (
              <div
                style={{
                  width: caPerformanceData[caActiveSubject].length > 4 ? `${caPerformanceData[caActiveSubject].length * 80}px` : "100%",
                  minWidth: "100%",
                  height: "100%"
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={caPerformanceData[caActiveSubject]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#08090c',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: 0,
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    />
                    <Bar dataKey="score" name="Score %" fill="#10b981" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/40">
                <PixelIcon name="book" size={32} className="text-white/20 mb-2" />
                <p className="text-xs uppercase tracking-wider text-white/70">No Assessment Records</p>
                <p className="text-[11px] text-white/40 mt-1 text-center">Marks will appear once recorded.</p>
              </div>
            )}
          </div>
        </div>

        {/* Best Performing Subjects Progress bars */}
        <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md rounded-none shadow-xl flex flex-col min-h-0">
          <div className="shrink-0 border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/90">BEST PERFORMING SUBJECTS</span>
            </div>
            <PixelIcon name="graduation" size={16} className="text-emerald-400" />
          </div>

          <div className="flex-1 min-h-0 w-full overflow-y-auto space-y-3.5 p-4">
            {rankedSubjects && rankedSubjects.length > 0 ? (
              rankedSubjects.map((item, idx) => (
                <div key={idx} className="space-y-1.5 border border-white/10 bg-white/5 p-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white font-bold tracking-wider">{item.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-[10px] border border-white/20 px-1.5 py-0.5">
                        {item.grade}
                      </span>
                      <span className="text-emerald-400 font-bold">{item.score}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-black/40 rounded-none overflow-hidden">
                    <div
                      className={`h-full rounded-none transition-all duration-500 ${
                        item.score >= 90 ? 'bg-emerald-400' : item.score >= 80 ? 'bg-emerald-300' : 'bg-amber-400'
                      }`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/40">
                <PixelIcon name="graduation" size={32} className="text-white/20 mb-2" />
                <p className="text-xs uppercase tracking-wider text-white/70">No Ranked Subjects</p>
                <p className="text-[11px] text-white/40 mt-1 text-center">Rankings calculate after score release.</p>
              </div>
            )}
          </div>
        </div>

        {/* Mid-term vs Finals Matrix Chart */}
        <div className="border border-white/15 bg-[#08090c]/80 backdrop-blur-md rounded-none shadow-xl flex flex-col min-h-0">
          <div className="shrink-0 border-b border-white/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-white/90">MAJOR EXAMS MATRIX</span>
            </div>
            <PixelIcon name="book" size={16} className="text-sky-400" />
          </div>

          <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden p-4">
            {examPerformance && examPerformance.length > 0 ? (
              <div
                style={{
                  width: examPerformance.length > 3 ? `${examPerformance.length * 90}px` : "100%",
                  minWidth: "100%",
                  height: "100%"
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={examPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                    <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#08090c',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: 0,
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    />
                    <Bar dataKey="midterm" name="Mid-Term" fill="#64748b" radius={0} />
                    <Bar dataKey="finals" name="Finals" fill="#38bdf8" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/40">
                <PixelIcon name="chart" size={32} className="text-white/20 mb-2" />
                <p className="text-xs uppercase tracking-wider text-white/70">No Major Exam Data</p>
                <p className="text-[11px] text-white/40 mt-1 text-center">Mid-term and Finals marks not yet logged.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
